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
  const email = extractEmail(payload);
  const questionsAndAnswers = extractQuestionsAndAnswers(payload);
  // Prepare the data for Klaviyo
  const klaviyoData = variables.reduce((acc, variable) => {
    acc[`diag_antidotes_${variable.key}`] = variable.text || variable.number;
    return acc;
  }, {});

  const klaviyoBody = JSON.stringify({
    data: {
      token: process.env.HOKARAN_KLAVIYO_PUBLIC_KEY,
      properties: {
        $email: "kevin@jollycommerce.io",
        ...klaviyoData,
        ...questionsAndAnswers,
      },
    },
  });

  encodedParams.set(
    "data",
    JSON.stringify({
      token: process.env.HOKARAN_KLAVIYO_PUBLIC_KEY,
      properties: {
        $email: email,
        $first_name: email.split("@")[0],
        $last_name: "antidote",
        $consent: ["sms", "email"],
        ...klaviyoData,
      },
    })
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
  let json;
  await fetch(url, options)
    .then((res) => res.json())
    .then((_json) => {
      console.log(_json);
      json = _json;
    })
    .catch((err) => console.error("error:" + err));

  // then track
  const encodedParamsTrack = new URLSearchParams();

  encodedParamsTrack.set(
    "data",
    JSON.stringify({
        token: process.env.HOKARAN_KLAVIYO_PUBLIC_KEY,
        event: "Answered Antidote Form",
        customer_properties: {
          $email: email,
          $first_name: email.split("@")[0],
          $last_name: "antidote",
          $consent: ["sms", "email"],
          ...klaviyoData,
          ...questionsAndAnswers
        },
      })
  );

  const urlTrack = "https://a.klaviyo.com/api/track";
  const optionsTrack = {
    method: "POST",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: encodedParamsTrack,
  };

  await fetch(urlTrack, optionsTrack)
    .then((res) => res.json())
    .then((json) => console.log(json))
    .catch((err) => console.error("error:" + err));
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, json, klaviyoBody }),
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
  const emailAnswer = answers.find((answer) => answer.type === "email");
  return emailAnswer ? emailAnswer.email : null;
}

function extractQuestionsAndAnswers(payload) {
  const fields = payload.form_response.definition.fields;
  const answers = payload.form_response.answers;

  const result = {};

  fields.forEach((field, index) => {
    const question = field.title;
    let answer = null;

    if (answers[index]) {
      switch (answers[index].type) {
        case "choice":
          answer = answers[index].choice.label;
          break;
        case "number":
          answer = answers[index].number;
          break;
        case "email":
          answer = answers[index].email;
          break;
        // Add more cases for other answer types if needed
      }
    }

    result[question] = answer;
  });

  return result;
}
