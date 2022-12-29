import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  if (!event.queryStringParameters) {
    return {
      statusCode: 400,
      body: JSON.stringify({ err: "no body :( " }),
    };
  }
  const body = event.queryStringParameters;

  if (!body.base64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ err: "expected a bse64 bro :( " }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
    },
    body: body.base64,
    isBase64Encoded: true,
  };
};
