import { Handler } from "@netlify/functions";
const js2xmlparser = require("js2xmlparser");
import { data_type } from "./types";

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

export const handler: Handler = async (event, context) => {
  let body: data_type = JSON.parse(event.body);

  const result = body.map((order) => {
    const billingAddress =
      order.billingAddress != null
        ? order.billingAddress
        : order.shippingAddress;
    return getObjectWithoutEmptyProperties({
      Codice_Cliente: String(order.customer.id).slice(0, -1), // because they want 12 number user ids and cannot change their system. This is the best we can do.
      Numero_Ordine: String(order.id.replace("gid://shopify/Order/","")).slice(0, -1),
      Ragione_Sociale_Destinatario: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      Indirizzo_Destinatario: order.shippingAddress.address1,
      Localita_Destinatario: order.shippingAddress.city,
      CAP_Destinatario: order.shippingAddress.zip,
      Provincia_Destinatario: order.shippingAddress.provinceCode,
      Nazione_Destinatario: order.shippingAddress.countryCodeV2,
      Teléfono_destinatario: order.shippingAddress.phone,
      Email_destinatario: order.email,
      Ragione_Sociale_Destinazione_Merce: `${billingAddress.firstName} ${billingAddress.lastName}`,
      Indirizzo_Destinazione_Merce: billingAddress.address1,
      Localita_Destinazione_Merce: billingAddress.city,
      CAP_Destinazione_Merce: billingAddress.zip,
      Provincia_Destinazione_Merce: billingAddress.provinceCode,
      Nazione_Destinazione_Merce: billingAddress.countryCodeV2,
      Codice_Vettore: order.fulfillments[0],
      Righe_Ordine: {
        Riga_Ordine: order.lineItems.nodes.map((line_item, k) => ({
          Codice_Cliente: String(order.customer.id).slice(0, -1),
          Numero_Ordine: `0000${order.name.replace("#", "")}`,
          Numero_Riga: k + 1,
          Numero_SottoRiga: 1,
          Codice_Articolo: line_item.sku,
          Quantita_da_Spedire: line_item.quantity,
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
