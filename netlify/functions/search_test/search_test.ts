import * as https from "https";
const { SearchServiceClient } = require('@google-cloud/retail').v2beta;
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();
const querystring = require('querystring')
const crypto = require('crypto')
const serviseAccountInfo = JSON.parse(process.env.GOOGLE_CLOUD_INFO)
const projectId = serviseAccountInfo.project_id
const searchAppSecretClient = process.env.SEARCH_APP_SECRET_CLIENT

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud_search.query', 'https://www.googleapis.com/auth/cloud_search', 'https://www.googleapis.com/auth/cloud_search.settings.query', 'https://www.googleapis.com/auth/cloud_search.indexing', 'https://www.googleapis.com/auth/cloud_search.debug', 'https://www.googleapis.com/auth/cloud_search.settings', 'https://www.googleapis.com/auth/cloud_search.settings.indexing', 'https://www.googleapis.com/auth/cloud_search.stats', 'https://www.googleapis.com/auth/cloud_search.stats.indexing', "https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/dfatrafficking", "https://www.googleapis.com/auth/ddmconversions", "https://www.googleapis.com/auth/dfareporting",],
  credentials: getGoogleCredentials(serviseAccountInfo.private_key, serviseAccountInfo.client_email)
});

function getGoogleCredentials(private_key, client_email) {
  return {
    private_key: private_key,
    client_email: client_email
  }
}

const handler = async (event) => {
  const originalQuerystring = event.rawQuery
  const signatureFromClient = querystring.parse(originalQuerystring).signature
  const computedSignature = computeSignature(originalQuerystring, searchAppSecretClient)
  console.log(event);

  if (computedSignature != signatureFromClient) {
    return {
      statusCode: 400,
      body: "not ok"
    };
  }

  const eventBody = event?.body ? JSON.parse(event?.body) : {}
  const querySeaarch = eventBody?.query
  console.log(querySeaarch);
  const token = await auth.getAccessToken()
  let response
  if (eventBody.rout == 'search') {
    const searchResponse = await mainSearch(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/placements/default_search:search`, token, querySeaarch)
    response = searchResponse
  }else if(eventBody.rout == 'autocomplete'){
    const autocompleteResponse = await mainAutocomplete(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog:completeQuery?query=${querySeaarch}`, token);
    response = autocompleteResponse
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}

async function mainSearch(catalog, token, query) {
  const searchProductResponse = await fetch(catalog, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      "query": `${query}`,
      "visitorId": `${new Date().valueOf()}`
    })
  })
    .then(res => res.json())
    .catch(err => console.error('error:' + err));

  return searchProductResponse
}

async function mainAutocomplete(catalog, token) {
  const autocompleteProductResponse = await fetch(catalog, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    }
  })
    .then(res => res.json())
    .catch(err => console.error('error:' + err));

  return autocompleteProductResponse
}

function computeSignature(querystringFromClient, shopifyAppSecret) {
  const formattedQueryString = querystringFromClient.replace("/?", "")
    .replace(/&signature=[^&]*/, "").split("&")
    .map(x => querystring.unescape(x)).sort().join("")
  const computedSignature = crypto.createHmac('sha256', shopifyAppSecret)
    .update(formattedQueryString, 'utf-8').digest('hex')
  return computedSignature
}

module.exports = { handler }