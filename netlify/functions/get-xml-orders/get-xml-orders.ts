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

    const billing_address = order.billing_address != null ? order.billing_address : order.shipping_address;
    return getObjectWithoutEmptyProperties({
      Codice_Cliente: String(order.customer.id).slice(0, -1), // because they want 12 number user ids and cannot change their system. This is the best we can do.
      Numero_Ordine: String(order.id).slice(0, -1),
      Ragione_Sociale_Destinatario: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
      Indirizzo_Destinatario: order.shipping_address.address1,
      Localita_Destinatario: order.shipping_address.city,
      CAP_Destinatario: order.shipping_address.zip,
      Provincia_Destinatario: order.shipping_address.province_code,
      Nazione_Destinatario: order.shipping_address.country_code,
      Ragione_Sociale_Destinazione_Merce: `${billing_address.first_name} ${billing_address.last_name}`,
      Indirizzo_Destinazione_Merce: billing_address.address1,
      Localita_Destinazione_Merce: billing_address.city,
      CAP_Destinazione_Merce: billing_address.zip,
      Provincia_Destinazione_Merce: billing_address.province_code,
      Nazione_Destinazione_Merce: billing_address.country_code,
      Codice_Vettore: "FERCAM_FLEX",
      Righe_Ordine: {
        Riga_Ordine: order.line_items.map((line_item, k) => ({
          Codice_Cliente: String(order.customer.id).slice(0, -1),
          Numero_Ordine: `0000${order.number}`,
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
