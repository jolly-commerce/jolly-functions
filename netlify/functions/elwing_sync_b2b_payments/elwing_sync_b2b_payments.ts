/*
 *
 */

import { Handler } from "@netlify/functions";
import { getResponse, makeGraphQLRequest } from "../../../utils/utils";
import {
  Shopify_createOrderTransaction,
  Shopify_getOrderTransaction,
  Transaction,
} from "../../../utils/shopifyRequestsREST";
import {
  ElwingConfig,
  GCL_Payment,
  GCL_get_payment,
} from "../../../utils/goCardLessRequests";

const config: ElwingConfig = {
  SHOPIFY_ACCESS_TOKEN: process.env.ELWING_SHOPIFY_ACCESS_TOKEN as string, // Shopify store access token and GraphQL endpoint
  GCL_READONLY_ACCESS_TOKEN: process.env
    .ELWING_GCL_READONLY_ACCESS_TOKEN as string, // GoCardLess Access token (can only read, no write events)
  shopifyDomain: "https://elwing-boards.myshopify.com",
};

const GCL_PAYMENT_CONFIRMED_STATUS = "payment_confirmed";

// Netlify serverless function handler
export const handler: Handler = async (event, context) => {
  // Cross-Origin Resource Sharing (CORS) headers
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "*",
  };

  // Handling preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    console.log("OPTIONS ", { CORS_HEADERS });
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Successful preflight call." }),
    };
  }

  if (!event.body) {
    return {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      statusCode: 204,
      body: JSON.stringify({ err: "No event body" }),
    };
  }
  const body = JSON.parse(event.body);
  // const body = {
  //   events: [
  //     {
  //       id: "EVTESTMKKV5PSB",
  //       created_at: "2023-12-20T05:37:55.458Z",
  //       resource_type: "payments",
  //       action: "paid_out",
  //       links: { payment: "PM00YP41N0Q3GS" },
  //       details: {
  //         origin: "gocardless",
  //         cause: "payment_confirmed",
  //         description: "The payment has been paid out by GoCardless.",
  //       },
  //       metadata: {},
  //       resource_metadata: {},
  //     },
  //   ],
  //   meta: { webhook_id: "WB007S17YTEM9J" },
  // };

  console.log("Data received : ", event.body);

  const webhookEvent = body?.events?.pop();
  const eventCause = webhookEvent?.details?.cause;
  const isInterestingRequest =
    eventCause && eventCause === GCL_PAYMENT_CONFIRMED_STATUS;
  if (!isInterestingRequest) return getResponse(204); // GCL expect 200 or 204 status code only
  try {
    // GCL

    // get info about payment
    const paymentInfo = await GCL_get_payment(
      config,
      webhookEvent?.links.payment
    );
    const shopifyOrderName = paymentInfo.payments.description;
    console.log(JSON.stringify(paymentInfo.payments));
    // Error : orderId field was not filled
    if (!shopifyOrderName) {
      // too bad :(
      return getResponse(200);
    }

    //
    // Shopify
    //

    // find order
    const order = await Shopify_getOrder(config, shopifyOrderName);

    console.log(order, "order");

    // error : transaction already processed : stop here
    const thisTransactionWasAlreadyProcessed = JSON.stringify(
      order.customAttributes || []
    ).includes(paymentInfo.payments.id);

    if (thisTransactionWasAlreadyProcessed) {
      return getResponse(200);
    }

    // Get order transactions
    const getTransactionsResponse = await Shopify_getOrderTransaction(
      config,
      order.id
    );
    console.log(getTransactionsResponse);
    // error : didn't find any transaction on the order. Stop here
    if (!getTransactionsResponse.transactions.length) {
      // not supposed to happen
      return getResponse(200);
    }

    // Create new transaction linked to main transaction
    await Shopify_createOrderTransaction(config, order.id, {
      kind: "capture",
      amount: paymentInfo.payments.amount.toString(),
      parent_id: getTransactionsResponse.transactions.find((t) => !t.parent_id)
        ?.id as number,
      order_id: parseInt(order.id),
    } as Transaction);

    // update custom attributes to add infos
    updateOrderCustomAttributes(config, order, paymentInfo);

    return getResponse(200);
  } catch (error) {
    // catch error
    console.log(error);
    return getResponse(204, { error: `${error}` });
  }
};

interface Money {
  amount: string;
}

interface OriginalTotalPriceSet {
  presentmentMoney: Money;
}

interface Order {
  id: string;
  name?: string;
  financialStatus?: "PAID" | "PARTIALLY_PAID";
  originalTotalPriceSet?: OriginalTotalPriceSet;
  customAttributes?: {
    key: string;
    value: string;
  }[]; // You can replace 'any' with a specific type if needed.
}

interface ThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}

interface Cost {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: ThrottleStatus;
}

interface Data {
  orders: {
    edges: [
      {
        node: Order;
      }
    ];
  };
}

interface Extensions {
  cost: Cost;
}

interface getOrderResponse {
  data: Data;
  extensions: Extensions;
}

async function Shopify_getOrder(
  config: ElwingConfig,
  orderName
): Promise<Order> {
  const result = (await makeGraphQLRequest(
    config,
    `{
      orders(query: "name:'${orderName}'", first: 1) {
        edges {
          node {
            id
            name
            originalTotalPriceSet {
              presentmentMoney {
                amount
              }
            }
            customAttributes {
              value
              key
            }
          }
        }
      }
    }`
  )) as getOrderResponse;
  if (result?.data?.orders?.edges?.length > 0) {
    return result.data.orders.edges[0].node;
  }

  throw new Error(`No orders found`);
}

async function Shopify_updateOrder(
  config: ElwingConfig,
  orderInput: { input: Order }
) {
  return await makeGraphQLRequest(
    config,
    `
  mutation orderUpdate($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
  `,
    orderInput
  );
}

async function updateOrderCustomAttributes(
  config: ElwingConfig,
  order: Order,
  paymentInfo: {
    payments: GCL_Payment;
  }
): Promise<void> {
  const existingCustomAttributes = order.customAttributes
    ? order.customAttributes
    : [];
  const existingGCLPayments = existingCustomAttributes.filter((ca) =>
    ca.key.includes("GCL")
  );
  const response = await Shopify_updateOrder(config, {
    input: {
      id: `${order.id}`,
      customAttributes: [
        ...existingCustomAttributes,
        {
          key: `Paiement GCL ${existingGCLPayments.length + 1}`,
          value: `${paymentInfo.payments.id}: ${
            paymentInfo.payments.amount / 100
          }€`,
        },
      ],
    },
  });
}
