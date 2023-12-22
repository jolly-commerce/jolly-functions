import * as https from "https";

// Helper function to make an HTTP request
export function makeRequest(url: any, method: any, headers = {}, body?: any) {
  console.log("request on ", url);
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
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          console.log(data);
          resolve({ error: "could not parse response" });
        }
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
export type Config = {
  SHOPIFY_ACCESS_TOKEN: string;
  shopifyDomain: string;
};
// Helper function to make a GraphQL request using the Shopify GraphQL endpoint
export async function makeGraphQLRequest<T>(
  config: Config,
  body: string,
  variables?: Object
): Promise<T> {
  const { SHOPIFY_ACCESS_TOKEN, shopifyDomain } = config;
  return (await makeRequest(
    `${shopifyDomain}/admin/api/2023-04/graphql.json`,
    "POST",
    {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    },
    JSON.stringify({ query: body, variables })
  )) as T;
}


// Helper function to generate a response object
export function getResponse(
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
      body: JSON.stringify(body) as string,
    };
  }
  return result;
}
