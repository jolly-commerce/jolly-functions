import { Handler } from "@netlify/functions";



export const handler: Handler = async (event, context) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({err: "no body :( "}),
    };
  }
  const body = JSON.parse(event.body);

  // if (!body.base64) {
  //   return {
  //     statusCode: 400,
  //     body: JSON.stringify({err: "expected a bse64 bro :( "}),
  //   };
  // }
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/JSON",
    },
    body: body,
  
  };
};
