import * as https from "https";
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
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
  
  if (computedSignature != signatureFromClient) {
    return {
      statusCode: 400,
      body: "not ok"
    };
  }

  const eventBody = event?.body ? JSON.parse(event?.body) : {}
  const querySeaarch = eventBody?.query
  const uploadProducts = eventBody?.products
  const predictProducts = eventBody?.predictProducts
  const visitorId = eventBody?.visitorId
  const branchUploadProducts = eventBody?.branchUploadProducts
  console.log(event);
  console.log(querySeaarch);
  console.log(visitorId);
  
  const token = await auth.getAccessToken()

  let response
  if (eventBody.rout == 'search') {
    const searchResponse = await mainSearch(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/servingConfigs/default_search:search`, token, querySeaarch, visitorId)
    response = searchResponse
  } else if (eventBody.rout == 'autocomplete') {
    const autocompleteResponse = await mainAutocomplete(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog:completeQuery?query=${querySeaarch}`, token);
    response = autocompleteResponse
  } else if (eventBody.rout == 'predict') {
    const predictResponse = await mainPredict(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/servingConfigs/similar_items:predict`, token, predictProducts, visitorId);
    response = predictResponse
  } else if (eventBody.rout == 'uploadProducts') {
    const uploadProductsResponse = await mainUploadProducts(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/branches/${branchUploadProducts}/products:import`, token, uploadProducts);
    response = uploadProductsResponse
  }
  console.log(response);

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}

// why only 100 products
async function mainUploadProducts(catalog, token, products) {
  const searchProductResponse = await fetch(catalog, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      "inputConfig": {
        "productInlineSource": {
          "products": products
        }
      }
    })
  })
    .then(res => res.json())
    .catch(err => console.error('error:' + err));

  return searchProductResponse
}

async function mainPredict(catalog, token, products, visitorId) {
  const searchProductResponse = await fetch(catalog, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      "pageSize": 100,
      "params": {
        "returnProduct": true,
      },
      "userEvent": {
        "eventType": "detail-page-view",
        "visitorId": `${visitorId}`,
        "productDetails": products
      }
    })
  })
    .then(res => res.json())
    .catch(err => console.error('error:' + err));

  return searchProductResponse
}

async function mainSearch(catalog, token, query, visitorId) {
  const searchProductResponse = await fetch(catalog, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      "query": `${query}`,
      "visitorId": `${visitorId}`
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