/*
* to run : npm i, npm install netlify-cli -g, npx netlify dev
* webhook on shopify store "Inventory item update" send to https://lucky-teeth-fry.loca.lt/.netlify/functions/hokaran_stock_tag_update
* to see result http://localhost:8888/.netlify/functions/hokaran_stock_tag_update
*/

import { Handler } from "@netlify/functions";
import * as https from "https";

// Shopify store access token and GraphQL endpoint
const SHOPIFY_ACCESS_TOKEN = process.env.ELWING_SHOPIFY_ACCESS_TOKEN;
// const shopifyGraphEndPoint = "https://elwing-boards.myshopify.com/admin/api/2023-04/graphql.json";

// Interfaces defining data structures
interface Location {
  id: string;
  name: string;
}

interface Quantity {
  quantity: number;
}

interface ParsedData {
  [variantId: string]: {
    [locationId: string]: number;
  };
}

interface InventoryLevelNode {
  node: {
    location: Location;
    quantities: Quantity[];
  };
}

interface InventoryLevels {
  edges: InventoryLevelNode[];
}

interface InventoryItem {
  inventoryLevels: InventoryLevels;
}

interface Variant {
  id: string;
  inventoryItem: InventoryItem;
}

interface Data {
  inventoryItem: {
    variant: Variant;
  };
}

interface VariantIdNode {
  node: {
    id: string;
    inventoryItem: InventoryItem;
  };
}

interface VariantMetafieldResponse {
  data: {
    productVariant: {
      metafield: {
        value: string;
        id: string;
      };
    };
  };
}

interface VariantMetafieldUpdateResponse {
  data: {
    productVariantUpdate: {
      productVariant: {
        id: string;
      };
      userErrors: {
        field: string[];
        message: string;
      }[];
    };
  };
}

interface InventoryItemResponse {
  data: Data;
}

export const handler: Handler = async (event, context) => {
  // Cross-Origin Resource Sharing (CORS) headers
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "*",
  };

  // Handling preflight OPTIONS request
  // if (event.httpMethod === "OPTIONS") {
  //   console.log("OPTIONS ", { CORS_HEADERS });
  //   return {
  //     statusCode: 200,
  //     headers: CORS_HEADERS,
  //     body: JSON.stringify({ message: "Successful preflight call." }),
  //   };
  // }

  console.log(event.body);
  const body = {
    "id":820982911946154508,
    "admin_graphql_api_id":"gid:\/\/shopify\/Order\/820982911946154508",
    "app_id":null,
    "browser_ip":null,
    "buyer_accepts_marketing":true,
    "cancel_reason":"customer",
    "cancelled_at":"2023-12-20T15:23:33+01:00",
    "cart_token":null,
    "checkout_id":null,
    "checkout_token":null,
    "client_details":null,
    "closed_at":null,
    "confirmation_number":null,
    "confirmed":false,
    "contact_email":"jon@example.com",
    "created_at":"2023-12-20T15:23:33+01:00",
    "currency":"EUR",
    "current_subtotal_price":"46.80",
    "current_subtotal_price_set":{
       "shop_money":{
          "amount":"46.80",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"46.80",
          "currency_code":"EUR"
       }
    },
    "current_total_additional_fees_set":null,
    "current_total_discounts":"0.00",
    "current_total_discounts_set":{
       "shop_money":{
          "amount":"0.00",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"0.00",
          "currency_code":"EUR"
       }
    },
    "current_total_duties_set":null,
    "current_total_price":"46.80",
    "current_total_price_set":{
       "shop_money":{
          "amount":"46.80",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"46.80",
          "currency_code":"EUR"
       }
    },
    "current_total_tax":"0.00",
    "current_total_tax_set":{
       "shop_money":{
          "amount":"0.00",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"0.00",
          "currency_code":"EUR"
       }
    },
    "customer_locale":"fr",
    "device_id":null,
    "discount_codes":[
       
    ],
    "email":"jon@example.com",
    "estimated_taxes":false,
    "financial_status":"voided",
    "fulfillment_status":"pending",
    "landing_site":null,
    "landing_site_ref":null,
    "location_id":null,
    "merchant_of_record_app_id":null,
    "name":"#9999",
    "note":null,
    "note_attributes":[
       
    ],
    "number":234,
    "order_number":1234,
    "order_status_url":"https:\/\/hokaran.com\/1728249967\/orders\/123456abcd\/authenticate?key=abcdefg",
    "original_total_additional_fees_set":null,
    "original_total_duties_set":null,
    "payment_gateway_names":[
       "visa",
       "bogus"
    ],
    "phone":null,
    "po_number":null,
    "presentment_currency":"EUR",
    "processed_at":null,
    "reference":null,
    "referring_site":null,
    "source_identifier":null,
    "source_name":"web",
    "source_url":null,
    "subtotal_price":"36.80",
    "subtotal_price_set":{
       "shop_money":{
          "amount":"36.80",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"36.80",
          "currency_code":"EUR"
       }
    },
    "tags":"",
    "tax_exempt":false,
    "tax_lines":[
       
    ],
    "taxes_included":false,
    "test":true,
    "token":"123456abcd",
    "total_discounts":"20.00",
    "total_discounts_set":{
       "shop_money":{
          "amount":"20.00",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"20.00",
          "currency_code":"EUR"
       }
    },
    "total_line_items_price":"46.80",
    "total_line_items_price_set":{
       "shop_money":{
          "amount":"46.80",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"46.80",
          "currency_code":"EUR"
       }
    },
    "total_outstanding":"46.80",
    "total_price":"36.80",
    "total_price_set":{
       "shop_money":{
          "amount":"36.80",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"36.80",
          "currency_code":"EUR"
       }
    },
    "total_shipping_price_set":{
       "shop_money":{
          "amount":"10.00",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"10.00",
          "currency_code":"EUR"
       }
    },
    "total_tax":"0.00",
    "total_tax_set":{
       "shop_money":{
          "amount":"0.00",
          "currency_code":"EUR"
       },
       "presentment_money":{
          "amount":"0.00",
          "currency_code":"EUR"
       }
    },
    "total_tip_received":"0.00",
    "total_weight":0,
    "updated_at":"2023-12-20T15:23:33+01:00",
    "user_id":null,
    "billing_address":{
       "first_name":"Steve",
       "address1":"123 Shipping Street",
       "phone":"555-555-SHIP",
       "city":"Shippington",
       "zip":"40003",
       "province":"Kentucky",
       "country":"United States",
       "last_name":"Shipper",
       "address2":null,
       "company":"Shipping Company",
       "latitude":null,
       "longitude":null,
       "name":"Steve Shipper",
       "country_code":"US",
       "province_code":"KY"
    },
    "customer":{
       "id":115310627314723954,
       "email":"john@example.com",
       "created_at":null,
       "updated_at":null,
       "first_name":"John",
       "last_name":"Smith",
       "state":"disabled",
       "note":null,
       "verified_email":true,
       "multipass_identifier":null,
       "tax_exempt":false,
       "phone":null,
       "email_marketing_consent":{
          "state":"not_subscribed",
          "opt_in_level":null,
          "consent_updated_at":null
       },
       "sms_marketing_consent":null,
       "tags":"",
       "currency":"EUR",
       "tax_exemptions":[
          
       ],
       "admin_graphql_api_id":"gid:\/\/shopify\/Customer\/115310627314723954",
       "default_address":{
          "id":715243470612851245,
          "customer_id":115310627314723954,
          "first_name":null,
          "last_name":null,
          "company":null,
          "address1":"123 Elm St.",
          "address2":null,
          "city":"Ottawa",
          "province":"Ontario",
          "country":"Canada",
          "zip":"K2H7A8",
          "phone":"123-123-1234",
          "name":"",
          "province_code":"ON",
          "country_code":"CA",
          "country_name":"Canada",
          "default":true
       }
    },
    "discount_applications":[
       
    ],
    "fulfillments":[
       
    ],
    "line_items":[
       {
          "id":866550311766439020,
          "admin_graphql_api_id":"gid:\/\/shopify\/LineItem\/866550311766439020",
          "attributed_staffs":[
             {
                "id":"gid:\/\/shopify\/StaffMember\/902541635",
                "quantity":1
             }
          ],
          "current_quantity":1,
          "fulfillable_quantity":1,
          "fulfillment_service":"manual",
          "fulfillment_status":null,
          "gift_card":false,
          "grams":90,
          "name":"Cannabooster Détox - Sérum naturel anti-imperfections",
          "price":"23.40",
          "price_set":{
             "shop_money":{
                "amount":"23.40",
                "currency_code":"EUR"
             },
             "presentment_money":{
                "amount":"23.40",
                "currency_code":"EUR"
             }
          },
          "product_exists":true,
          "product_id":4119899701359,
          "properties":[
             
          ],
          "quantity":1,
          "requires_shipping":true,
          "sku":"HOKPFI008",
          "taxable":true,
          "title":"Cannabooster Détox - Sérum naturel anti-imperfections",
          "total_discount":"0.00",
          "total_discount_set":{
             "shop_money":{
                "amount":"0.00",
                "currency_code":"EUR"
             },
             "presentment_money":{
                "amount":"0.00",
                "currency_code":"EUR"
             }
          },
          "variant_id":30973616291951,
          "variant_inventory_management":"shopify",
          "variant_title":null,
          "vendor":null,
          "tax_lines":[
             
          ],
          "duties":[
             
          ],
          "discount_allocations":[
             
          ]
       },
       {
          "id":141249953214522974,
          "admin_graphql_api_id":"gid:\/\/shopify\/LineItem\/141249953214522974",
          "attributed_staffs":[
             
          ],
          "current_quantity":1,
          "fulfillable_quantity":1,
          "fulfillment_service":"manual",
          "fulfillment_status":null,
          "gift_card":false,
          "grams":90,
          "name":"Cannabooster Reboot - Sérum visage lissant",
          "price":"23.40",
          "price_set":{
             "shop_money":{
                "amount":"23.40",
                "currency_code":"EUR"
             },
             "presentment_money":{
                "amount":"23.40",
                "currency_code":"EUR"
             }
          },
          "product_exists":true,
          "product_id":4167807008879,
          "properties":[
             
          ],
          "quantity":1,
          "requires_shipping":true,
          "sku":"HOKPFI009",
          "taxable":true,
          "title":"Cannabooster Reboot - Sérum visage lissant",
          "total_discount":"0.00",
          "total_discount_set":{
             "shop_money":{
                "amount":"0.00",
                "currency_code":"EUR"
             },
             "presentment_money":{
                "amount":"0.00",
                "currency_code":"EUR"
             }
          },
          "variant_id":30973620256879,
          "variant_inventory_management":"shopify",
          "variant_title":null,
          "vendor":null,
          "tax_lines":[
             
          ],
          "duties":[
             
          ],
          "discount_allocations":[
             
          ]
       }
    ],
    "payment_terms":null,
    "refunds":[
       
    ],
    "shipping_address":{
       "first_name":"Steve",
       "address1":"123 Shipping Street",
       "phone":"555-555-SHIP",
       "city":"Shippington",
       "zip":"40003",
       "province":"Kentucky",
       "country":"United States",
       "last_name":"Shipper",
       "address2":null,
       "company":"Shipping Company",
       "latitude":null,
       "longitude":null,
       "name":"Steve Shipper",
       "country_code":"US",
       "province_code":"KY"
    },
    "shipping_lines":[
       {
          "id":271878346596884015,
          "carrier_identifier":null,
          "code":null,
          "discounted_price":"10.00",
          "discounted_price_set":{
             "shop_money":{
                "amount":"10.00",
                "currency_code":"EUR"
             },
             "presentment_money":{
                "amount":"10.00",
                "currency_code":"EUR"
             }
          },
          "phone":null,
          "price":"10.00",
          "price_set":{
             "shop_money":{
                "amount":"10.00",
                "currency_code":"EUR"
             },
             "presentment_money":{
                "amount":"10.00",
                "currency_code":"EUR"
             }
          },
          "requested_fulfillment_service_id":null,
          "source":"shopify",
          "title":"Generic Shipping",
          "tax_lines":[
             
          ],
          "discount_allocations":[
             
          ]
       }
    ]
 }

  // if (!event.body) {
  //   return {
  //     headers: {
  //       "Access-Control-Allow-Origin": "*"
  //     },
  //     statusCode: 400,
  //     body: JSON.stringify({ err: "No event body" }),
  //   };
  // }
  // const body = JSON.parse(event.body);
  // console.log("Data received : ", event.body)


  // Event body for testing (you need to put admin_graphql_api_id, it's inventoryItem id)


  // const body = {
  //   inventory_item_id: 49266231345492,
  //   location_id: 5907972207,
  //   available: 155,
  //   updated_at: "2023-12-19T14:34:25+01:00",
  //   admin_graphql_api_id:
  //     "gid://shopify/InventoryLevel/5490049135?inventory_item_id=49266231345492",
  // };

  // const body = {
  //   id: 271878346596884000,
  //   created_at: "2023-12-13T11:49:24+01:00",
  //   updated_at: "2023-12-13T11:49:24+01:00",
  //   requires_shipping: true,
  //   cost: null,
  //   country_code_of_origin: null,
  //   province_code_of_origin: null,
  //   harmonized_system_code: null,
  //   tracked: true,
  //   country_harmonized_system_codes: [],
  //   //false
  //   // admin_graphql_api_id: "gid://shopify/InventoryItem/31709294723183",

  //   // false
  //   // admin_graphql_api_id: "gid://shopify/InventoryItem/31709294755951",

  //   //true
  //   admin_graphql_api_id: "gid://shopify/InventoryItem/48727808737620",
  // };

  try {
    // * Retrieve variant ID from InventoryItem ID
    // const variantIdJSON: InventoryItemResponse = await getVariantId(body.admin_graphql_api_id);
    // const variantIdJSON: InventoryItemResponse = await getVariantId("gid://shopify/InventoryItem/" + body.inventory_item_id);

    // // * Retrieve all inventory levels of this variant
    // const parsedVariantIdJSON: ParsedData = getParsedData(variantIdJSON);

    // // update status of metafield
    // const updatedMetafield = await updateVariantMetafield(parsedVariantIdJSON);

    // Return the response to the client
    return getResponse(200);
  } catch (error) {
    // catch error
    console.log(error)
    const errorResponse = getResponse(500, { error: `${error}` });
    return errorResponse;
  }
};

function getResponse(
  code: number,
  body?: any
): {
  headers: { [key: string]: string };
  statusCode: number;
  body?: string;
} {
  let result = {
    statusCode: code,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
  if (body) {
    return {
      ...result,
      body: JSON.stringify(body),
    };
  }
  return result;
}