import { Handler } from "@netlify/functions";
const js2xmlparser = require("js2xmlparser");
import { FullfillmentOrder, data_type } from "./types";

// check https://docs.google.com/spreadsheets/d/1Ruaw8xqtg1XsYTtvEPYxbXmF5EiREBs3/edit#gid=1627918533 for more details

// useful to send clean objects to external api.
export function getObjectWithoutEmptyProperties<T>(object: T): T {
  let result = {} as T;
  Object.keys(object).forEach((key) =>
    object[key] !== undefined && object[key] !== null
      ? (result[key] = object[key])
      : null
  );
  return result;
}

function getOrderTotalWeight(fulfillmentOrders: FullfillmentOrder[]) {
  let total = 0;
  fulfillmentOrders.forEach((fo) => {
    fo.lineItems.nodes.forEach((le) => {
      total += parseFloat(le.weight.value as any as string);
    });
  });
  return parseFloat(total.toFixed(2));
}

function normalizePhone(phone: string): string {
  if (!phone) {
    return "";
  }
  return phone.replace(/[^0-9]/g, "");
}
function getDeliveryTitle(order: any): string {
  return "";
}
function getDeliveryCode(order: any): string {
  let deliveryTitle = order.shippingLines?.nodes[0]?.title;
  if (!deliveryTitle) {
    deliveryTitle = getDeliveryTitle(order);
  }
  if (deliveryTitle.includes("SEUR - Entrega entre 2 y 3 días laborables") || deliveryTitle.includes("SEUR GRATIS - Entrega entre 2 y 3 días laborables")) {
    return "SEUR24";
  } else if (deliveryTitle.includes("XPO - Entrega entre 5 y 7 días laborables") || deliveryTitle.includes("XPO - Entrega entre 4 y 5 días laborables")) {
    return "XPOES";
  } else if (deliveryTitle.includes("SEUR - Entrega entre 3 y 5 días laborables (Baleares)")) {
    return "SEUR48";
  } else if (deliveryTitle.includes("XPO - Entrega entre 5 y 7 días laborables (Baleares)") || deliveryTitle.includes("XPO - Entrega entre 6 y 7 días laborables (Baleares)")) {
    return "XPOIS";
  } else if (deliveryTitle.toLowerCase().includes("ontime")) {
    return "ON_TIME";
  } 
  return "FERCAM_FLEX";
}

function getPreferredSKU(lineItem: any, note?: string | null): string {
  if (note?.includes("belveo.es")) {
    const variantSku = lineItem.variant?.variant_mata_sku;
    const productSku = lineItem.product?.product_meta_sku;
    
    if (variantSku) {
      return typeof variantSku === "object" ? variantSku.value : variantSku;
    }
    if (productSku) {
      return typeof productSku === "object" ? productSku.value : productSku;
    }
  }
  return lineItem.sku;
}

export const handler: Handler = async (event, context) => {
  let body: data_type = JSON.parse(event.body);

  const result = body
    .filter((order) => order.shippingLines?.nodes[0]?.title) // we need to skip orders without shipping line titles
    .map((order) => {
      const shippingAddress = order.shippingAddress;
      const billingAddress = order.billingAddress != null ? order.billingAddress : order.shippingAddress;
      return getObjectWithoutEmptyProperties({
        Codice_Cliente: String(
          order.customer.id.replace("gid://shopify/Customer/", "")
        ).slice(0, -1), // because they want 12 number user ids and cannot change their system. This is the best we can do.
        Numero_Ordine: String(
          order.id.replace("gid://shopify/Order/", "")
        ).slice(0, -1),
        Ragione_Sociale_Destinatario: `${billingAddress.firstName} ${billingAddress.lastName}`,
        Indirizzo_Destinatario: billingAddress.address1,
        Localita_Destinatario: billingAddress.city,
        CAP_Destinatario: billingAddress.zip,
        Provincia_Destinatario: billingAddress.provinceCode,
        Nazione_Destinatario: billingAddress.countryCodeV2,
        Telefono_Destinatario: normalizePhone(billingAddress.phone),
        EMail_Destinatario: order.email,
        Ragione_Sociale_Destinazione_Merce: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        Indirizzo_Destinazione_Merce: shippingAddress.address1,
        Localita_Destinazione_Merce: shippingAddress.city,
        CAP_Destinazione_Merce: shippingAddress.zip,
        Provincia_Destinazione_Merce: shippingAddress.provinceCode,
        Nazione_Destinazione_Merce: shippingAddress.countryCodeV2,
        Codice_Vettore: getDeliveryCode(order),
        Peso_Carico_Previsto: getOrderTotalWeight(order.fulfillmentOrders.nodes),
        Aspetto1_Qta: order.shippingLines.nodes.length,
        Righe_Ordine: {
          Riga_Ordine: order.lineItems.nodes.flatMap((line_item, k) => {
            const sku = getPreferredSKU(line_item, order.note);
            
            if (sku.includes(',')) {
              const skus = sku.split(',').map(s => s.trim());
              const skuCounts = {};
              
              // Count occurrences of each SKU
              skus.forEach(individualSku => {
                skuCounts[individualSku] = (skuCounts[individualSku] || 0) + line_item.quantity;
              });
              
              // Create entries for unique SKUs with their counts
              return Object.entries(skuCounts).map(([individualSku, quantity]) => ({
                Codice_Cliente: String(
                  order.customer.id.replace("gid://shopify/Customer/", "")
                ).slice(0, -1),
                Numero_Ordine: `0000${order.name.replace("#", "")}`,
                Numero_Riga: null, // Will be set later
                Numero_SottoRiga: 1,
                Codice_Articolo: individualSku,
                Quantita_da_Spedire: quantity,
              }));
            } else {
              // Single SKU, return as is
              return [{
                Codice_Cliente: String(
                  order.customer.id.replace("gid://shopify/Customer/", "")
                ).slice(0, -1),
                Numero_Ordine: `0000${order.name.replace("#", "")}`,
                Numero_Riga: null, // Will be set later
                Numero_SottoRiga: 1,
                Codice_Articolo: sku,
                Quantita_da_Spedire: line_item.quantity,
              }];
            }
          }).map((item, index) => ({
            ...item,
            Numero_Riga: index + 1, // Sequential numbering
          })),
        },
      });
    });

  const reponse = js2xmlparser.parse(
    "Ordini_Spedizione",
    { Testata_Ordine: result },
    {
      declaration: { encoding: "UTF-8" },
      cdataKeys: [
        "Ragione_Sociale_Destinazione_Merce",
        "Ragione_Sociale_Destinatario",
        "Indirizzo_Destinatario",
        "Indirizzo_Destinazione_Merce",
      ],
    }
  );
  return {
    statusCode: 200,
    body: reponse,
  };
};
