import * as https from "https";
const { SearchServiceClient } = require('@google-cloud/retail').v2beta;
const projectId = "jollycommerce-uni-676-gbp"
const { GoogleAuth } = require('google-auth-library');
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud_search.query', 'https://www.googleapis.com/auth/cloud_search', 'https://www.googleapis.com/auth/cloud_search.settings.query', 'https://www.googleapis.com/auth/cloud_search.indexing', 'https://www.googleapis.com/auth/cloud_search.debug', 'https://www.googleapis.com/auth/cloud_search.settings', 'https://www.googleapis.com/auth/cloud_search.settings.indexing', 'https://www.googleapis.com/auth/cloud_search.stats', 'https://www.googleapis.com/auth/cloud_search.stats.indexing', "https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/dfatrafficking", "https://www.googleapis.com/auth/ddmconversions", "https://www.googleapis.com/auth/dfareporting",],
});


const handler = async (event) => {
  const token = await auth.getAccessToken()
  const checkShop = event?.queryStringParameters?.shop
  console.time()
  const autocompleteResponse = await mainAutocomplete(`projects/${projectId}/locations/global/catalogs/default_catalog`, 'bas', token);
  // const searchResponse = mainSearch(`projects/${projectId}/locations/global/catalogs/default_catalog/servingConfigs/default_search`, '123')
  console.log(autocompleteResponse);
  console.timeEnd()

  if (checkShop) {
    return {
      statusCode: 200,
      body: JSON.stringify(autocompleteResponse)
    };
  } else {
    return {
      statusCode: 400,
      body: "not ok"
    };
  }
}

function mainSearch(placement, visitorId, query) {
  const retailClient = new SearchServiceClient();

  async function callSearch() {
    const request = {
      placement,
      visitorId
    };

    const iterable = retailClient.searchAsync(request);
    for await (const response of iterable) {
      console.log(response);
    }
  }

  callSearch();
}

async function mainAutocomplete(catalog, query, token) {
  // v1
  // const autocompleteProductResponse = await fetch(`https://cloudsearch.googleapis.com/v1/query/suggest`, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     catalog,
  //     query,
  //     visitorId: '12581147560-qg2973u7ne51adj8uj3mkptqqcot2vvc.apps.googleusercontent.com',
  //   }),
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'X-Goog-User-Project': projectId,
  //     'Authorization': `Bearer ${token}`,
  //   }
  // })
  //   .then(res => res.json())
  //   .catch(err => console.error('error:' + err));

  // return autocompleteProductResponse

  // v2
  const autocompleteProductResponse = await fetch(`https://retail.googleapis.com/v2/projects/${projectId}/locations/global/catalogs/default_catalog:completeQuery?query=bas`, {
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

  // example
  // const retailClient = new CompletionServiceClient();

  // async function callCompleteQuery() {
  //   const request = {
  //     catalog,
  //     query,
  //   };

  //   return await retailClient.completeQuery(request);
  // }

  // return callCompleteQuery();
}

module.exports = { handler }