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
  console.log(originalQuerystring);

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
  const branchSearch = eventBody?.branchSearch
  const branchCountResultsSearch = eventBody?.branchCountResultsSearch
  const facetKeysSearch = eventBody?.facetKeysSearch
  const filterSearch = eventBody?.filterSearch
  const offsetSearch = eventBody?.offsetSearch
  const searchOrderBy = eventBody?.searchOrderBy
  const productId = eventBody?.productId
  // console.log(event);
  // console.log(querySeaarch);

  const token = await auth.getAccessToken()

  let response
  if (eventBody.rout == 'search') {
    const searchResponse = await mainSearch(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/servingConfigs/search-general:search`, token, querySeaarch, visitorId, branchSearch, branchCountResultsSearch, facetKeysSearch, filterSearch, offsetSearch, searchOrderBy)
    response = searchResponse
  } else if (eventBody.rout == 'autocomplete') {
    const autocompleteResponse = await mainGetResponse(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog:completeQuery?query=${querySeaarch}&dataset=user-data`, token);
    response = autocompleteResponse
  } else if (eventBody.rout == 'predict') {
    const predictResponse = await mainPredict(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/servingConfigs/similar_items:predict`, token, predictProducts, visitorId);
    response = predictResponse
  } else if (eventBody.rout == 'uploadProducts') {
    const uploadProductsResponse = await mainUploadProducts(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/branches/${branchUploadProducts}/products:import`, token, uploadProducts);
    response = uploadProductsResponse
  } else if (eventBody.rout == 'getProduct') {
    const getProductResponse = await mainGetResponse(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog/branches/default_branch/products/${productId}`, token);
    response = getProductResponse
  }

  // console.log(response);

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

async function mainSearch(catalog, token, query, visitorId, branch, branchCountResultsSearch, facetKeys, filter, offset, orderBy) {
  const searchProductResponse = await fetch(catalog, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      "query": `${query}`,
      "visitorId": `${visitorId}`,
      "branch": `projects/${projectId}/locations/global/catalogs/default_catalog/branches/${branch}`,
      "pageSize": branchCountResultsSearch,
      "facetSpecs": facetKeys,
      "filter": filter,
      "offset": offset,
      "orderBy": orderBy
    })
  })
    .then(res => res.json())
    .catch(err => console.error('error:' + err));

  return searchProductResponse
}

async function mainGetResponse(catalog, token) {
  const mainGetResponse = await fetch(catalog, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
      'Authorization': `Bearer ${token}`,
    }
  })
    .then(res => res.json())
    .catch(err => console.error('error:' + err));

  return mainGetResponse
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