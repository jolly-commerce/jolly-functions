import { Handler } from "@netlify/functions";
import { data_type } from "../get-xml-orders/types";
import dayjs from "dayjs";



export const handler: Handler = async (event, context) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({err: "no body :( "}),
    };
  }
  let body: data_type = JSON.parse(event.body);

  const response = ""
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
