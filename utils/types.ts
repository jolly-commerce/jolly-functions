
  // Define the type for a single transaction object
  type Transaction = {
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