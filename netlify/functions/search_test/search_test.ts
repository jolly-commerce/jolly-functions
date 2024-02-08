import * as https from "https";
import { CatalogServiceClient } from '@google-cloud/retail'
const { Storage } = require('@google-cloud/storage');
const { CompletionServiceClient } = require('@google-cloud/retail').v2beta;
const client = new CatalogServiceClient();
const projectId = "jollycommerce-uni-676-gbp"

const handler = async (event) => {
  const checkShop = event?.queryStringParameters?.shop
  // await authenticateImplicitWithAdc();
  await main(`projects/${projectId}/locations/global/catalogs/default_catalog`, 'bas');
  // await listCatalogs();
  if (checkShop) {
    return {
      statusCode: 200,
      body: JSON.stringify("ok")
    };
  } else {
    return {
      statusCode: 400,
      body: "not ok"
    };
  }
}

function main(catalog, query) {
  const retailClient = new CompletionServiceClient();

  async function callCompleteQuery() {
    const request = {
      catalog,
      query,
    };

    const response = await retailClient.completeQuery(request);
    console.log(response[0].completionResults);
  }

  callCompleteQuery();
}

async function listCatalogs() {
  const location = "global"

  const catalogs = await client.listCatalogs({
    parent: `projects/${projectId}/locations/${location}`,
  });

  console.info(catalogs);
}

async function authenticateImplicitWithAdc() {
  const storage = new Storage({
    projectId,
  });
  const [buckets] = await storage.getBuckets();
  console.log('Buckets:');

  for (const bucket of buckets) {
    console.log(`- ${bucket.name}`);
  }

  console.log('Listed all storage buckets.');
}

module.exports = { handler }