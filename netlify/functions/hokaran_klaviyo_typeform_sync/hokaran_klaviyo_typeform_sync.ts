import { Handler } from "@netlify/functions";
const axios = require('axios');

exports.handler = async function (event, context) {
  // Parse the Typeform webhook payload
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': '*',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS ', { CORS_HEADERS });
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Successful preflight call.' }),
    };
  }
  const payload = JSON.parse(event.body);
console.log(JSON.stringify(payload))
//   // Extract answers and map them to Klaviyo attributes
//   const attributes = payload.form_response.answers.reduce((acc, answer) => {
//     acc[answer.field.title] = answer[answer.type];
//     return acc;
//   }, {});

//   // Extract variables and map them to Klaviyo event properties
//   const eventProperties = payload.form_response.hidden;

//   // Construct the Klaviyo API payload
//   const klaviyoPayload = {
//     attributes,
//     eventProperties
//   };

  // Send the data to Klaviyo
  try {
    const response = await axios.post('KLAVIYO_ENDPOINT', klaviyoPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer YOUR_KLAVIYO_API_KEY`
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Failed to sync to Klaviyo:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false })
    };
  }
};

