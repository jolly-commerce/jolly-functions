import { Config, makeRequest } from "./utils";
export type ElwingConfig = Config & { GCL_READONLY_ACCESS_TOKEN: string };

export type GCL_Payment = {
  id: string;
  created_at: string;
  charge_date: string;
  amount: number;
  description: string;
  currency: string;
  status: string;
  amount_refunded: number;
  reference: string;
  metadata: Record<string, any>;
  fx: {
    fx_currency: string | null;
    fx_amount: number | null;
    exchange_rate: number | null;
    estimated_exchange_rate: number | null;
  };
  links: {
    mandate: string;
    creditor: string;
  };
  retry_if_possible: boolean;
};

export async function GCL_get_payment(
  config: ElwingConfig,
  paymentID: string
): Promise<{ payments: GCL_Payment }> {
  const result = await GCL_GET_request(config, `/payments/${paymentID}`);
  return result as { payments: GCL_Payment };
}

function GCL_GET_request(config: ElwingConfig, route: string, body?: any) {
  return makeRequest(
    `https://api.gocardless.com${route}`,
    "GET",
    {
      Authorization: `Bearer ${config.GCL_READONLY_ACCESS_TOKEN}`,
      "GoCardless-Version": "2015-07-06",
    },
    body
  );
}
