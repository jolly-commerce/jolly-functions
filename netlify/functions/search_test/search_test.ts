import * as https from "https";

export const handler = async (event) => {
  const url = event.rawUrl.includes("myshopify")
  console.log(event.rawUrl);
  
  return {
    statusCode: 200,
    body: JSON.stringify(event)
  };
}