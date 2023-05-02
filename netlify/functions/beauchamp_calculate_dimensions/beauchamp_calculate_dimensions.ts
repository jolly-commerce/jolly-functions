import { Handler } from "@netlify/functions";
import * as https from "https";




export const handler: Handler = async (event, context) => {

  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const shopifyGraphEndpoint =
  "https://galeriebeauchamp.myshopify.com/admin/api/2023-04/graphql.json";
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ err: "no body :( " }),
    };
  }
  const product = JSON.parse(event.body);

  const queryBody = `
  query {
    product(id: "${product.admin_graphql_api_id}") {
      id
      title
      tags
      variants(first: 2) {
        edges {
          node {
            id
          }
        }
      }
      metafields(first: 20) {
        edges {
          node {
            id
            key
            namespace
            value
            type
          }
        }
      }
    }
  }`;

  const productData = await makeRequest(
    shopifyGraphEndpoint,
    "POST",
    {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, // Replace with your actual access token
    },
    JSON.stringify({ query: queryBody })
  )


  if (!productData) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        toto: false,
        queryBody
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  const productTags = getProductTags(productData);
  const { productHeight, productWidth } = getProductDimensions(productData);
  const { boxDepth, boxHeight, boxWidth } = findBestBox({
    productHeight,
    productWidth,
    productTags,
    boxSizes,
  });

  if (!boxDepth) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  const mutationBody = `
      mutation UpdateVariantMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`;

  const metafields = product.variants.map((variant) => ({
    ownerId: variant.admin_graphql_api_id,
    namespace: "custom",
    key: "package_length",
    value: 44444,
  }));

  const mutationResponse = await makeRequest(
    shopifyGraphEndpoint,
    "POST",
    {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, // Replace with your actual access token
    },
    JSON.stringify({
      query: mutationBody,
      variables: { metafields },
    })
  );

  const mutationData = mutationResponse;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      boxDepth,
      boxHeight,
      boxWidth,
      context: {
        productTags,
        productHeight,
        productWidth,
      },
      mutationData,
    }),
  };
};

//
// DATA
//

const boxSizes = [
  { width: 10, height: 20, packageWidth: 38, packageHeight: 64 },
  { width: 12, height: 24, packageWidth: 43, packageHeight: 74 },
  { width: 12, height: 36, packageWidth: 43, packageHeight: 104 },
  { width: 12, height: 48, packageWidth: 43, packageHeight: 135 },
  { width: 12, height: 60, packageWidth: 43, packageHeight: 165 },
  { width: 16, height: 20, packageWidth: 53, packageHeight: 64 },
  { width: 18, height: 36, packageWidth: 58, packageHeight: 104 },
  { width: 20, height: 24, packageWidth: 64, packageHeight: 74 },
  { width: 24, height: 24, packageWidth: 74, packageHeight: 74 },
  { width: 24, height: 30, packageWidth: 74, packageHeight: 89 },
  { width: 24, height: 36, packageWidth: 74, packageHeight: 104 },
  { width: 24, height: 48, packageWidth: 74, packageHeight: 135 },
  { width: 30, height: 30, packageWidth: 89, packageHeight: 89 },
  { width: 30, height: 36, packageWidth: 89, packageHeight: 104 },
  { width: 30, height: 40, packageWidth: 89, packageHeight: 114 },
  { width: 30, height: 60, packageWidth: 89, packageHeight: 165 },
  { width: 36, height: 36, packageWidth: 104, packageHeight: 104 },
  { width: 36, height: 48, packageWidth: 104, packageHeight: 135 },
  { width: 40, height: 40, packageWidth: 114, packageHeight: 114 },
  { width: 40, height: 60, packageWidth: 114, packageHeight: 165 },
  { width: 48, height: 48, packageWidth: 135, packageHeight: 135 },
  { width: 48, height: 60, packageWidth: 135, packageHeight: 165 },
  { width: 48, height: 72, packageWidth: 135, packageHeight: 196 },
  { width: 60, height: 60, packageWidth: 165, packageHeight: 165 },
  { width: 60, height: 72, packageWidth: 165, packageHeight: 196 },
  { width: 60, height: 84, packageWidth: 165, packageHeight: 226 },
  { width: 60, height: 96, packageWidth: 165, packageHeight: 257 },
];

//
// Extractors
//
function getProductDimensions(product) {
  let productWidth: any = null;
  let productHeight: any = null;

  if (product && product.metafields && product.metafields.edges) {
    product.metafields.edges.forEach((edge) => {
      if (
        edge.node &&
        edge.node.namespace === "syncmaestro" &&
        (edge.node.key === "width" || edge.node.key === "height")
      ) {
        if (edge.node.key === "width") {
          productWidth = parseFloat(edge.node.value) || null;
        } else if (edge.node.key === "height") {
          productHeight = parseFloat(edge.node.value) || null;
        }
      }
    });
  }

  return { productWidth, productHeight };
}

function getProductTags(productJson) {
  if (
    !productJson ||
    typeof productJson !== "object" ||
    !productJson.hasOwnProperty("tags")
  ) {
    return [];
  }

  const tags = productJson.tags;

  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.map((tag) => {
    // Normalize the Unicode string by decomposing the characters
    // with diacritics (accents) into their base characters.
    const decomposedTag = tag.normalize("NFD");

    // Remove diacritics (accents) by matching and replacing
    // characters in the Unicode range U+0300 to U+036F.
    const removedAccentsTag = decomposedTag.replace(/[\u0300-\u036f]/g, "");

    // Remove any white spaces from the tag.
    const removedSpacesTag = removedAccentsTag.replace(/\s+/g, "");

    // Remove any non-alphanumeric characters.
    const alphanumericTag = removedSpacesTag.replace(/[^a-zA-Z0-9]/g, "");

    // Convert the tag to lowercase for easier comparison.
    const normalizedTag = alphanumericTag.toLowerCase();

    return normalizedTag;
  });
}

//
// LOGIC
//

function getBoxType(tags) {
  let isSimpleBox = false;
  let isDoubleBox = false;
  let isSpecialBox = false;
  let hasNoBoxDefinition = false;

  if (!tags || !Array.isArray(tags)) {
    return {
      isSimpleBox: false,
      isDoubleBox: false,
      isSpecialBox: false,
      hasNoBoxDefinition: true,
    };
  }

  tags.forEach((tag) => {
    if (tag === "boitesimple") {
      isSimpleBox = true;
    } else if (tag === "boitedouble") {
      isDoubleBox = true;
    } else if (tag === "boitespeciale") {
      isSpecialBox = true;
    }
  });

  if (!isSimpleBox && !isDoubleBox && !isSpecialBox) {
    hasNoBoxDefinition = true;
  }

  return { isSimpleBox, isDoubleBox, isSpecialBox, hasNoBoxDefinition };
}

function findBestBox({ productTags, productWidth, productHeight, boxSizes }) {
  const { isSimpleBox, isDoubleBox, isSpecialBox, hasNoBoxDefinition } =
    getBoxType(productTags);

  // we don't want to return anything if it has no box definition
  if (hasNoBoxDefinition) {
    return { boxWidth: null, boxHeight: null, boxDepth: null };
  }

  let boxWidth: any = null;
  let boxHeight: any = null;
  let boxDepth: any = null;

  if (isSimpleBox) {
    boxDepth = 11;
  } else if (isDoubleBox) {
    boxDepth = 15;
  } else if (isSpecialBox) {
    boxDepth = 18;
  }

  for (const box of boxSizes) {
    if (productWidth <= box.width && productHeight <= box.height) {
      boxWidth = box.width;
      boxHeight = box.height;
      break;
    }
  }

  return {
    boxWidth: boxWidth,
    boxHeight: boxHeight,
    boxDepth: boxDepth,
  };
}



function makeRequest(url, method, headers = {}, body?: any) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(data));
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}
