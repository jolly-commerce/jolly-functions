// to run : npm i, npm install netlify-cli -g, npx netlify dev
// webhook on shopify store "Inventory item update" send to https://lucky-teeth-fry.loca.lt/.netlify/functions/hokaran_stock_tag_update

import { Handler } from "@netlify/functions";
import * as https from "https";

const SHOPIFY_ACCESS_TOKEN = process.env.HOKARAN_SHOPIFY_ACCESS_TOKEN;
const shopifyGraphEndpoint = "https://hokaran.myshopify.com/admin/api/2023-04/graphql.json";

export const handler: Handler = async (event, context) => {
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "*",
  };

  if (event.httpMethod === "OPTIONS") {
    console.log("OPTIONS ", { CORS_HEADERS });
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Successful preflight call." }),
    };
  }

  const LOCATION_ID = "gid://shopify/Location/5907972207";
  //
  const shopifyGraphEndpoint =
    "https://hokaran.myshopify.com/admin/api/2023-04/graphql.json";

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

  console.log(body);
  // retreive variand id from InventoryItem id
  const variantId = await getVariantId(body.admin_graphql_api_id);
  console.log(variantId);

  // retreive all inventory levels of this variant
  // update status of metafield
  return getResponse(200, variantId);
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

interface ParsedData {
  [variantId: string]: {
    [locationId: string]: number;
  };
}

function parseData(data: any): ParsedData | null {
  try {
    if (!data?.data?.inventoryItem?.variant?.inventoryItem?.inventoryLevels?.edges) {
      throw new Error('Invalid data structure');
    }

    const result: ParsedData = {};
    const currentVariantInventoryLevels = data.data.inventoryItem.variant.inventoryItem.inventoryLevels.edges;
    const currentVariantId = data.data.inventoryItem.variant.id;
    const variantProductVariants = data.data.inventoryItem.variant.product.variants.edges;
    
    function parseInventoryLevels(inventoryLevels: any, variantId: string,) {

      inventoryLevels.forEach((level: InventoryLevel, index: number) => {
        const locationId = level.node.location.id;
        const quantity = level.node.quantities.reduce((acc, curr) => acc + curr.quantity, 0);
  
        if (!result[variantId]) {
          result[variantId] = {};
        }
  
        result[variantId][locationId] = quantity;
      }); 
    }

    parseInventoryLevels(currentVariantInventoryLevels, currentVariantId);

    variantProductVariants.forEach((variant : VariantId, index : number) => {
      const variantId = variant.node.id;
      const inventoryLevels = variant.node.inventoryItem.inventoryLevels.edges;
      
      parseInventoryLevels(inventoryLevels, variantId);
    });

    return result;
  } catch (error) {
    console.error('Error parsing data:', error);
    return null;
  }
}

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

  const response = await makeGraphQLRequest(queryBody);

  const parsedData = parseData(response);

  return parsedData;
  // return response;
  // return response.data.inventoryItem.variant.id;
}

// async function dataParse(response:object) {
//   console.log(response);
// }

async function makeGraphQLRequest<T>(
  body: string,
  variables?: Object
): Promise<T> {
  return (await makeRequest(
    shopifyGraphEndpoint,
    "POST",
    {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    },
    JSON.stringify({ query: body, variables })
  )) as T;
}
function makeRequest(url, method, headers = {}, body?: any) {
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
