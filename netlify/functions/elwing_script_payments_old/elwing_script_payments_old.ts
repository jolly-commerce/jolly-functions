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
import { ElwingConfig, GCL_Payment, GCL_get_event } from "../../../utils/goCardLessRequests";
import { ALLPAYMENTS } from "../../../utils/payments";
import fs from "fs";

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

  // if (!event.body) {
  //   return {
  //     headers: {
  //       "Access-Control-Allow-Origin": "*",
  //     },
  //     statusCode: 204,
  //     body: JSON.stringify({ err: "No event body" }),
  //   };
  // }
  // const body = JSON.parse(event.body);
  const body = {
    events: [
      {
        id: "EVTESTMKKV5PSB",
        created_at: "2023-12-20T05:37:55.458Z",
        resource_type: "payments",
        action: "paid_out",
        links: { payment: "PM00YP41N0Q3GS" },
        details: {
          origin: "gocardless",
          cause: "payment_confirmed",
          description: "The payment has been paid out by GoCardless.",
        },
        metadata: {},
        resource_metadata: {},
      },
    ],
    meta: { webhook_id: "WB007S17YTEM9J" },
  };

  console.log("Data received : ", event.body);

  const webhookEvent = body?.events?.pop();
  const eventCause = webhookEvent?.details?.cause;
  const isInterestingRequest =
    eventCause && eventCause === GCL_PAYMENT_CONFIRMED_STATUS;
  if (!isInterestingRequest) return getResponse(204); // GCL expect 200 or 204 status code only
  try {
    const payments: string[] = [
      "EV04CBWC86PN3S",
      "EV04CH1004536E",
      "EV04CPZCKWCGPY",
      "EV04D6F6CVRH7G",
      "EV04DBE63FR48J",
      "EV04DBE63NBC5J",
      "EV04FV4KZSCE9Z",
      "EV04FV4M067P9S",
      "EV04GB9FSDE2GX",
      "EV04M4PV27S0QX",
      "EV04M4PV28YJFZ",
      "EV04J59P3009DK",
      "EV04JHRYNXM2G6",
      "EV04KCVJE4KAJP",
      "EV04JXCNC8XP0A",
      "EV04CH1005RREH",
      "EV04FCHDCZCC74",
      "EV04FCHDD0GV9E",
      "EV04HXX2K8C6A3",
      "EV04K2Z2SDJP37",
      "EV04FV4KZZTK3N",
      "EV04M09134Q7ES",
      "EV04FHMSVK85YG",
      "EV04GMBCQP30NC",
      "EV04GMBCQQJS22",
      "EV04GMBCQN4X3H",
      "EV04GTKDFE9XE3",
      "EV04GTKDFDVPGJ",
      "EV04GTKDFFANBH",
      "EV04KCVJE2HMHP",
      "EV04FPGX30QWHV",
      "EV04FV4KZT7JM3",
      "EV04GMBCQD6JCG",
      "EV04K8CHAD9YBB",
      "EV04M4PV23JZXC",
      "EV04M4PV24SAZ5",
      "EV04GB9FSC3DN6",
      "EV04GMBCQE3XW2",
      "EV04CBWC87ACQ9",
      "EV04DVE8CE4914",
      "EV04FV4KZVEY50",
      "EV04JCE149FN0B",
      "EV04KCVJDZ99BY",
      "EV04M4PV2191JM",
      "EV04M4PV206P6C",
      "EV04GTKDFH0X89",
      "EV04GTKDFG6M8C",
      "EV04M4PV25937T",
      "EV04M4PV26J22T",
      "EV04FPGX33H69H",
      "EV04DBE63KERY1",
      "EV04GMBCQKWMJ3",
      "EV04GMBCQMYZVN",
      "EV04GTKDFBQ22P",
      "EV04J59P2YXKXE",
      "EV04FV4M04TCVX",
      "EV04KCVJE36EN8",
      "EV04M09133BC9K",
      "EV04M09132RS03",
      "EV04HBWWV7NVRW",
      "EV04FV4M03608K",
      "EV04FV4M02SRF8",
      "EV04GTKDFCQHG5",
      "EV04E380PGQZR4",
      "EV04FV4KZWZZQR",
      "EV04CPZCN0GBSP",
      "EV04F0JBHBGAD3",
      "EV04FCHDCYNF0W",
      "EV04FCHDCXFJ71",
      "EV04GMBCQHDKGA",
      "EV04HKYEB0D9WH",
      "EV04JXCNCB7DAE",
      "EV04K8CHAE9GCC",
      "EV04KCVJE1ZMWY",
      "EV04KPCGV7N12K",
      "EV04CPZCKRTWHR",
      "EV04CPZCKPBKGK",
      "EV04E92HY4WYED",
      "EV04HKYEAPA8HB",
      "EV04BY5VH27RHR",
      "EV04ESZ8A7DQ1Q",
      "EV04ESZ8A6HAW1",
      "EV04ESZ8A5MP82",
      "EV04ESZ8A8T3XV",
      "EV04F0JBH7B4FJ",
      "EV04GTKDFAMJXA",
      "EV04JXCNCAP2Z9",
      "EV04DBE63H2DB0",
      "EV04E380PHFACH",
      "EV04GB9FSFG68D",
      "EV04GMBCQJTQME",
      "EV04JXCNCC7DAV",
      "EV04FV4M010EQM",
      "EV04FV4M00YSYC",
      "EV04C73E11VAMJ",
      "EV04CBWC88G3BV",
      "EV04FV4M05KCCS",
      "EV04JHRYNWFFSM",
      "EV04DVE8CF954G",
      "EV04C32BNBXH5V",
      "EV04GB9FSEHYZ1",
      "EV04M4PV221MGQ",
      "EV04FV4KZYY20E",
      "EV04HXX2K760XX",
      "EV04JHRYNVYZQK",
      "EV04GMBCQRJNBF",
      "EV04CPZCKYXX47",
      "EV04KVH40H2HNW",
      "EV04JXCNCDGX05",
      "EV04M4PV1Z3D2W",
      "EV04KJ2K5PNQYA",
      "EV04FPGX31QHD5",
      "EV04H484RM1SJQ",
      "EV04CBWC8558YG",
      "EV04CPZCKT69BQ",
      "EV04HKYEAXVQH0",
      "EV04KVH40FSD7C",
      "EV04JCE147WFAD",
      "EV04JCE148NVR4",
      "EV04JCE1466MTM",
      "EV04GMBCQGHE22",
      "EV04GMBCQF9G76",
      "EV04KCVJE09MAE",
      "EV04KCVJDY93HY",
      "EV04FPGX32GR83",
      "EV04FPGX344ZAX",
      "EV04DK9HK5KJCN",
      "EV04FPGX2Z68T0",
      "EV04GTKDF900Q8",
      "EV04JCE145BBXW",
      "EV04JXCNC9KAK2",
      "EV04KCVJDWZWAG",
      "EV04KCVJDXNVN9",
      "EV04KVH40DDVSS",
      "EV04KVH40EMVHB",
      "EV04CPZCMXCASM",
      "EV04CPZCM0C7DN",
      "EV04FV4KZXN1GD",
      "EV04FPGX35TJ0B",
      "EV04DVE8CD0A2P",
      "EV04F0JBHA7R97",
      "EV04F0JBH9J1Z8",
      "EV04FV4KZRE0WP",
      "EV04GMBCQC1PCC",
      "EV04HBWWV6S2SG",
      "EV04HKYEASSHHB",
      "EV04JHRYNTNCWY",
      "EV04KCVJDVC494",
      "EV04KVH40CT6HF",
      "EV04M4PV1YRWX3",
      "EV04C73E0ZH6R6",
      "EV04CH1003WJ4W",
      "EV04DBE63DQT3N",
      "EV04HXX2K6SA10",
      "EV04KPCGV84XRC",
      "EV04KVH40GHV8A",
    ];
    const res = await Promise.all(payments.map(getRes));
    console.log(res)
    fs.writeFileSync('./TOTLO', JSON.stringify(res))
    return getResponse(200);
  } catch (error) {
    // catch error
    console.log(error);
    return getResponse(204, { error: `${error}` });
  }
};

async function getRes(evId: string): Promise<string> {
  const j = await GCL_get_event(config, evId)
  return JSON.stringify(j.events)
}
