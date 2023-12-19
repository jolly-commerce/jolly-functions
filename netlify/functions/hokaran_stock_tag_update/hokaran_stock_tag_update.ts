/*
* to run : npm i, npm install netlify-cli -g, npx netlify dev
* webhook on shopify store "Inventory item update" send to https://lucky-teeth-fry.loca.lt/.netlify/functions/hokaran_stock_tag_update
* to see result http://localhost:8888/.netlify/functions/hokaran_stock_tag_update
*/

import { Handler } from "@netlify/functions";
import * as https from "https";

// Shopify store access token and GraphQL endpoint
const SHOPIFY_ACCESS_TOKEN = process.env.HOKARAN_SHOPIFY_ACCESS_TOKEN;
const shopifyGraphEndPoint = "https://hokaran.myshopify.com/admin/api/2023-04/graphql.json";

// Shopify store locations
const BOUTIQUE_PARIS_LOCATION_ID = "gid://shopify/Location/61019750511";
const FRENCH_LOG_LOCATION_ID = "gid://shopify/Location/5907972207";

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
        "Access-Control-Allow-Origin": "*"
      },
      statusCode: 400,
      body: JSON.stringify({ err: "No event body" }),
    };
  }
  const body = JSON.parse(event.body);
  console.log("Data received : ", event.body)
 
  // Event body for testing (you need to put admin_graphql_api_id, it's inventoryItem id)
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
    const variantIdJSON: InventoryItemResponse = await getVariantId(body.admin_graphql_api_id);

    // * Retrieve all inventory levels of this variant
    const parsedVariantIdJSON: ParsedData = getParsedData(variantIdJSON);

    // update status of metafield
    const updatedMetafield = await updateVariantMetafield(parsedVariantIdJSON);

    // Return the response to the client
    return getResponse(200, parsedVariantIdJSON);
  } catch (error) {
    // catch error
    console.log(error)
    const errorResponse = getResponse(500, { error: `${error}` });
    return errorResponse;
  }
};

// Helper function to generate a response object
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

function isOnlyAvailableInParis(variantWithQuantities: ParsedData): boolean {
  let quantityInParis: number = 0; // Initialize with a default value
  let quantityInFrenchLog: number = 0; // Initialize with a default value

  Object.entries(variantWithQuantities).forEach(([variantId, locations]) => {
    // Iterate through the inner object (locations)
    Object.entries(locations).forEach(([location, value]) => {
      if (location === BOUTIQUE_PARIS_LOCATION_ID) {
        quantityInParis = value;
      }
      if (location === FRENCH_LOG_LOCATION_ID) {
        quantityInFrenchLog = value;
      }
    });
  });

  // true if available only in Paris
  return quantityInParis > 0 && quantityInFrenchLog <= 0;
}

async function updateVariantMetafield(parsedData: ParsedData): Promise<VariantMetafieldUpdateResponse> {
  const variantId = Object.keys(parsedData)[0];
  const metafieldKey = "is_only_in_paris";
  const metafieldNameSpace = "jolly_meta";
  const metafieldType = "boolean";

  // if zero in french log but more than zero in paris, set isOnlyInParisLabel to true
  let isOnlyInParisLabel: boolean = isOnlyAvailableInParis(parsedData);

  const body = `
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const getVariantQuery = `
    {
      productVariant(id: "${variantId}") {
        metafield(namespace: "${metafieldNameSpace}", key: "${metafieldKey}") {
          value
          id
        }
      }
    }`;
    console.log("getting variant metafields of variant ", variantId)
  const getVariantMetafieldResponse: VariantMetafieldResponse = await makeGraphQLRequest(getVariantQuery);

  const metafieldObj = getVariantMetafieldResponse.data.productVariant?.metafield;

  const variables = {
    "input": {
      "id": variantId,
      "metafields": metafieldObj
        ? [
          {
            "id": metafieldObj.id,
            "value": isOnlyInParisLabel ? "true" : "false",
          }
        ]
        : [
          {
            "key": metafieldKey,
            "namespace": metafieldNameSpace,
            "type": metafieldType,
            "value": isOnlyInParisLabel ? "true" : "false",
          }
        ],
    },
  };
  console.log("update or create metafield with data", JSON.stringify(variables))
  // update it or create metafield
  const updateMetafield: VariantMetafieldUpdateResponse = await makeGraphQLRequest(body, variables);

  const userErrors = updateMetafield.data.productVariantUpdate.userErrors;
  if (userErrors.length !== 0) {
    throw new Error(userErrors[0].message);
  }

  return updateMetafield;
}

// Helper function to make an HTTP request
function makeRequest(url: any, method: any, headers = {}, body?: any) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(data));
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

// Function to parse inventory levels and update the result object
function parseInventoryLevels(inventoryLevels: any, variantId: string): ParsedData {
  const result: ParsedData = {};

  inventoryLevels.forEach((level: InventoryLevelNode) => {
    const locationId = level.node.location.id;
    const quantity = level.node.quantities.reduce((acc, curr) => acc + curr.quantity, 0);

    if (!result[variantId]) {
      result[variantId] = {};
    }

    result[variantId][locationId] = quantity;
  });

  return result;
}

// Function to parse GraphQL response data
function getParsedData(data: InventoryItemResponse): ParsedData {
  if (!data?.data?.inventoryItem?.variant?.inventoryItem?.inventoryLevels?.edges) {
    throw new Error('Invalid data structure in received inventory item');
  }

  const currentVariantInventoryLevels = data.data.inventoryItem.variant.inventoryItem.inventoryLevels.edges;
  const currentVariantId = data.data.inventoryItem.variant.id;

  // Parse inventory levels for the current variant
  const parsedVariantIdJSON = parseInventoryLevels(currentVariantInventoryLevels, currentVariantId);

  if (!parsedVariantIdJSON) {
    throw new Error(`Could not parse data`);
  }

  return parsedVariantIdJSON;
}

// Function to get variant ID from inventory item ID using GraphQL query
async function getVariantId(inventoryItemId: string): Promise<InventoryItemResponse> {
  const queryBody = `{
      inventoryItem(id: "${inventoryItemId}") {
        variant {
          id
          inventoryItem {
            inventoryLevels(first: 10) {
              edges {
                node {
                  location {
                    id
                    name
                  }
                  quantities(names: "available") {
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    }`;

  const response: InventoryItemResponse = await makeGraphQLRequest(queryBody);
  if (!response?.data?.inventoryItem) {
    throw new Error(`Cannot get inventory item`);
  }

  return response;
}

// Helper function to make a GraphQL request using the Shopify GraphQL endpoint
async function makeGraphQLRequest<T>(body: string, variables?: Object): Promise<T> {
  return (await makeRequest(
    shopifyGraphEndPoint,
    "POST",
    {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    },
    JSON.stringify({ query: body, variables })
  )) as T;
};
