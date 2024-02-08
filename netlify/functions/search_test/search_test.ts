import * as https from "https";

export const handler = async (event) => {
  const checkShop = event?.queryStringParameters?.shop

  if (checkShop) {
    return {
      statusCode: 200,
      body: JSON.stringify("ok")
    };
  }else{
    return {
      statusCode: 400,
      body: "not ok"
    };
  }
}