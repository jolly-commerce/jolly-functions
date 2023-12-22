import { Config, makeRequest } from "./utils";

export async function makeRESTShopifyRequest<T>(
    config: Config,
    domain: "orders",
    id: string,
    method: "POST" | "GET",
    subdomain?: "transactions.json",
    body?: Object,
  ): Promise<T> {
    const { SHOPIFY_ACCESS_TOKEN, shopifyDomain } = config;
    return (await makeRequest(
      `${shopifyDomain}/admin/api/2023-10/${domain}/${id}/${subdomain}`,
      method,
      {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      JSON.stringify(body)
    )) as T;
  }

export async function Shopify_createOrderTransaction(
    config: Config,
    orderId: string,
    transaction: Transaction
  ): Promise<void> {
    return await makeRESTShopifyRequest(
      config,
      "orders",
      orderId,
      "POST",
      "transactions.json",
      { transaction }
    );
  }
  
  
  // Define the type for a single transaction object
  export type Transaction = {
    id: number;
    order_id: number;
    kind: "sale" | "capture";
    gateway: string;
    status: "pending";
    message: string;
    created_at: string;
    test: boolean;
    authorization: null | string;
    location_id: null | number;
    user_id: null | number;
    parent_id: null | number;
    processed_at: string;
    device_id: null | string;
    error_code: null | string;
    source_name: string;
    receipt: Record<string, any>; // You can specify a more specific type if needed.
    amount: string;
    currency: string;
    payment_id: string;
    total_unsettled_set: Record<string, any>; // You can specify a more specific type if needed.
    admin_graphql_api_id: string;
  };
  // Define a type for the request object that contains transactions
  type TransactionResponse = {
    transactions: Transaction[];
  };
  export async function Shopify_getOrderTransaction(
    config: Config,
    orderId: string
  ): Promise<TransactionResponse> {
    return await makeRESTShopifyRequest(
      config,
      "orders",
      orderId,
      "GET",
      "transactions.json"
    );
  }