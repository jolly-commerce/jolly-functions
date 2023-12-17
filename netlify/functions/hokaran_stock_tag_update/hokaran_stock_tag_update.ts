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
const BOUTIQUE_PARIS_LOCATION_ID = "gid://shopify/Location/61019750511";

// Interfaces defining data structures
interface InventoryLevel {
  node: {
    location: {
      id: string;
      name: string;
    };
    quantities: {
      quantity: number;
    }[];
  };
}

interface VariantId {
  node: {
    id: string;
    inventoryItem: {
      inventoryLevels: {
        edges: {
          node: {
            location: {
              id: string;
              name: string;
            };
            quantities: {
              quantity: number;
            }[];
          }
        }[]
      }
    }
  };
}

interface VariantMetafieldResponse {
  data: {
    productVariant: {
      metafield: {
        value: string,
        id: string
      }
    }
  };
}

interface ParsedData {
  [variantId: string]: {
    [locationId: string]: number;
  };
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

  // Default location ID for inventory levels
  const LOCATION_ID = "gid://shopify/Location/5907972207";
  // Sample body data (might be used for further functionality)
  const body = {
    id: 271878346596884000,
    created_at: "2023-12-13T11:49:24+01:00",
    updated_at: "2023-12-13T11:49:24+01:00",
    requires_shipping: true,
    cost: null,
    country_code_of_origin: null,
    province_code_of_origin: null,
    harmonized_system_code: null,
    tracked: true,
    country_harmonized_system_codes: [],
    admin_graphql_api_id: "gid://shopify/InventoryItem/31709294723183",
  };

  try {
    // * Retrieve variant ID from InventoryItem ID
    const variantIdJSON = await getVariantId(body.admin_graphql_api_id);
    // console.log('Not parsed data: ', variantIdJSON);

    // * Retrieve all inventory levels of this variant
    const parsedVariantIdJSON = getParsedData(variantIdJSON);
    // console.log('Parsed: ', parsedVariantIdJSON);
    if (!parsedVariantIdJSON) {
      throw new Error(`Could not parse data`)
    }

    // todo update status of metafield
    await updateVariantMetafield(parsedVariantIdJSON);

    // Return the response to the client
    return getResponse(200, parsedVariantIdJSON);
  } catch (error) {
    return getResponse(500, { error })
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

async function updateVariantMetafield(parsedData: ParsedData): Promise<void> {
  let variables: any;

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

  for (const [variantId] of Object.entries(parsedData)) {
    let isOnlyInParisLabel: boolean = false;
    let metafieldExists: boolean = false;

    // if zero in french log but more than zero in paris, set isOnlyInParisLabel to true
    const getVariantQuery = `
    {
      productVariant(id: "${variantId}") {
        metafield(namespace: "test2", key: "test2") {
          value
          id
        }
      }
    }`;

    const getVariantMetafieldResponse: VariantMetafieldResponse = await makeGraphQLRequest(getVariantQuery)
    const metafieldObj = getVariantMetafieldResponse.data.productVariant.metafield;

    metafieldExists = !!metafieldObj;

    if (metafieldExists) {
      console.log(metafieldObj.id);
      // if exist, we update it (and only include id)
      variables = {
        "input": {
          "id": variantId,
          "metafields": [
            {
              "id": metafieldObj.id,
              "value": isOnlyInParisLabel ? "true" : "false"
            }
          ]
        }
      }
    } else {
      // if it does not exist, we create it 
      variables = {
        "input": {
          "id": variantId,
          "metafields": [
            {
              "key": "is_only_in_paris",
              "namespace": "Available only in Paris",
              "type": "boolean",
              "value": isOnlyInParisLabel ? "true" : "false"
            }
          ]
        }
      }
    }
    

    // update it or create it
    const res = await makeGraphQLRequest(body, variables);

  }

  // ! remove after code is written
  const structure =
  {
    "gid://shopify/ProductVariant/30304729170031": {
      "gid://shopify/Location/5907972207": 2384,
      "gid://shopify/Location/61019750511": 45
    },
    "gid://shopify/ProductVariant/30304729202799": {
      "gid://shopify/Location/5907972207": 743,
      "gid://shopify/Location/61019750511": 17
    },
    "gid://shopify/ProductVariant/40603123843183": {
      "gid://shopify/Location/5907972207": 717,
      "gid://shopify/Location/61019750511": 64
    }
  }
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


// Function to parse GraphQL response data
function getParsedData(data: any): ParsedData | null {
  if (!data?.data?.inventoryItem?.variant?.inventoryItem?.inventoryLevels?.edges) {
    throw new Error('Invalid data structure');
  }

  const result: ParsedData = {};
  const currentVariantInventoryLevels = data.data.inventoryItem.variant.inventoryItem.inventoryLevels.edges;
  const currentVariantId = data.data.inventoryItem.variant.id;
  const variantProductVariants = data.data.inventoryItem.variant.product.variants.edges;

  // Function to parse inventory levels and update the result object
  function parseInventoryLevels(inventoryLevels: any, variantId: string) {
    inventoryLevels.forEach((level: InventoryLevel) => {
      const locationId = level.node.location.id;
      const quantity = level.node.quantities.reduce((acc, curr) => acc + curr.quantity, 0);

      if (!result[variantId]) {
        result[variantId] = {};
      }

      result[variantId][locationId] = quantity;
    });
  }

  // Parse inventory levels for the current variant
  parseInventoryLevels(currentVariantInventoryLevels, currentVariantId);

  // Parse inventory levels for other variants
  variantProductVariants.forEach((variant: VariantId) => {
    const variantId = variant.node.id;
    const inventoryLevels = variant.node.inventoryItem.inventoryLevels.edges;

    parseInventoryLevels(inventoryLevels, variantId);
  });

  return result;

}

// Function to get variant ID from inventory item ID using GraphQL query
async function getVariantId(inventoryItemId: string) {
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
          product {
            handle
            id
            variants(first: 10) {
              edges {
                node {
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
                  id
                }
              }
            }
          }
        }
      }
    }`;

  // * return parsed data with updated structure
  // const parsedData = getParsedData(response);
  // return parseData;

  // * return all data
  const response = await makeGraphQLRequest(queryBody);
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
