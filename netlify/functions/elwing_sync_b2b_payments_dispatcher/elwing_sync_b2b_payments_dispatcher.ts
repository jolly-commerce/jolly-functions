/*
 *
 */

import { Handler } from "@netlify/functions";
import { getResponse, makeRequest } from "../../../utils/utils";

import { ElwingConfig } from "../../../utils/goCardLessRequests";

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


  const interestingEvents = body.events.filter(
    (ev) => ev && ev.details && ev.details.cause == GCL_PAYMENT_CONFIRMED_STATUS
  );

  try {
    await Promise.all(
      interestingEvents.map((ev) =>
        makeRequest(
          "https://jolly-commerce-functions.netlify.app/.netlify/functions/elwing_sync_b2b_payments",
          "POST",
          { "Content-Type": "application/json" },
          JSON.stringify({
            events: [ev],
          })
        )
      )
    );

    return getResponse(200);
  } catch (error) {
    // catch error
    console.log(error);
    return getResponse(204, { error: `${error}` });
  }
};
