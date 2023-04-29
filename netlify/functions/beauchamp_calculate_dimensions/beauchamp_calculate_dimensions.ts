import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ err: "no body :( " }),
    };
  }
  const body = JSON.parse(event.body);
  const productTags = getProductTags(body);
  const { productHeight, productWidth } = getProductDimensions(body);
  const { boxDepth, boxHeight, boxWidth } = findBestBox({
    productHeight,
    productWidth,
    productTags,
    boxSizes,
  });

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

  return tags;
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
    // Normalize the Unicode string by decomposing the characters
    // with diacritics (accents) into their base characters.
    const decomposedTag = tag.normalize("NFD");

    // Remove diacritics (accents) by matching and replacing
    // characters in the Unicode range U+0300 to U+036F.
    const removedAccentsTag = decomposedTag.replace(/[\u0300-\u036f]/g, "");

    // Remove any white spaces from the tag.
    const removedSpacesTag = removedAccentsTag.replace(/\s+/g, "");

    // Convert the tag to lowercase for easier comparison.
    const normalizedTag = removedSpacesTag.toLowerCase();

    if (normalizedTag === "boitesimple") {
      isSimpleBox = true;
    } else if (normalizedTag === "boitedouble") {
      isDoubleBox = true;
    } else if (normalizedTag === "boitespeciale") {
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
