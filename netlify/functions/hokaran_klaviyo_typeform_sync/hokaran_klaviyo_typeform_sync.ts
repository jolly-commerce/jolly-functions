import { URLSearchParams } from "url";
import fetch from "node-fetch";
const encodedParams = new URLSearchParams();

exports.handler = async function (event, context) {
  // Parse the Typeform webhook payload
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
  const payload = JSON.parse(event.body);
  const variables = payload.form_response.variables;
  const email = extractEmail(payload)
  // Prepare the data for Klaviyo
  const klaviyoData = variables.reduce((acc, variable) => {
    acc[`diag_antidotes_${variable.key}`] = variable.text || variable.number;
    return acc;
  }, {});


  encodedParams.set(
    "data",
    JSON.stringify({"token": process.env.HOKARAN_KLAVIYO_PUBLIC_KEY,"properties": {"$email": email, ...klaviyoData}})
  );

  const url = "https://a.klaviyo.com/api/identify";
  const options = {
    method: "POST",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: encodedParams,
  };

  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => console.log(json))
    .catch((err) => console.error("error:" + err));
  try {

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Failed to sync to Klaviyo:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false }),
    };
  }
};


function extractEmail(payload) {
    const answers = payload.form_response.answers;
    const emailAnswer = answers.find(answer => answer.type === 'email');
    return emailAnswer ? emailAnswer.email : null;
  }