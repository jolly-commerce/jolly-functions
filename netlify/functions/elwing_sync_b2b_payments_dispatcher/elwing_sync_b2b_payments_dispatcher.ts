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
//   const body = {
// "events": [
//     {
//           "id": "EV04M4PV1YRWX3",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YP40J61K8Y"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV25937T",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00ZCGQ6QQDTX"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV1Z3D2W",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YQ785EGKTS"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV26J22T",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00ZCGQNA0V6J"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV24SAZ5",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YQHYQPR6XP"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV23JZXC",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YQHFYK4X8N"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV206P6C",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YQGZXKFWBA"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV2191JM",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YQ7JGA3XZF"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV221MGQ",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YP4MK5SXYC"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV28YJFZ",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YQHJJAX01D"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4PV27S0QX",
//           "created_at": "2024-01-23T11:01:20.259Z",
//           "resource_type": "payments",
//           "action": "confirmed",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "payment_confirmed",
//             "description": "Enough time has passed since the payment was submitted for the banks to return an error, so this payment is now confirmed."
//           },
//           "links": {
//             "payment": "PM00YP41N0Q3GS"
//           },
//           "resource_metadata": {
//             "orderId": "5858440642907"
//           }
//         },
//         {
//           "id": "EV04M4Q057PQXM",
//           "created_at": "2024-01-23T11:01:23.843Z",
//           "resource_type": "mandates",
//           "action": "active",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "mandate_activated",
//             "description": "The time window after submission for the banks to refuse a mandate has ended without any errors being received, so this mandate is now active."
//           },
//           "links": {
//             "mandate": "MD002MDKHQD2A5"
//           },
//           "resource_metadata": {}
//         },
//         {
//           "id": "EV04M4Q05AVGEQ",
//           "created_at": "2024-01-23T11:01:23.872Z",
//           "resource_type": "mandates",
//           "action": "active",
//           "metadata": {},
//           "details": {
//             "origin": "gocardless",
//             "cause": "mandate_activated",
//             "description": "The time window after submission for the banks to refuse a mandate has ended without any errors being received, so this mandate is now active."
//           },
//           "links": {
//             "mandate": "MD002MY86SKGY0"
//           },
//           "resource_metadata": {}
//         }
//       ],
//       "meta": {
//         "webhook_id": "WB0083BRA81GQA"
//       }
//     }
  






  try {
    const interestingEvents = body.events.filter(
      (ev) => ev && ev.details && ev.details.cause == GCL_PAYMENT_CONFIRMED_STATUS
    );
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
