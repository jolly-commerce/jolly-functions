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
  return total / 1000;
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
  if (deliveryTitle.includes("SEUR - Entrega entre 2 y 3 días laborables")) {
    return "SEUR24";
  } else if (
    deliveryTitle.includes("XPO - Entrega entre 5 y 7 días laborables")
  ) {
    return "XPOES";
  } else if (
    deliveryTitle.includes(
      "SEUR - Entrega entre 3 y 5 días laborables (Baleares)"
    )
  ) {
    return "SEUR48";
  } else if (
    deliveryTitle.includes(
      "XPO - Entrega entre 5 y 7 días laborables (Baleares)"
    )
  ) {
    return "XPOIS";
  }
  return "FERCAM_FLEX";
}
function getServicio(order): number {
  const deliveryCode = getDeliveryCode(order);
  if (deliveryCode.includes('24')) {
    return 1
  } else if (deliveryCode.includes('48')) {
    return 15
  } else {
    return 13;
  }
}

export const handler: Handler = async (event, context) => {
  let body: data_type = JSON.parse(event.body);

  const result = body
    .filter((order) => {
      return (
        getDeliveryCode(order).includes("SEUR") &&
        order.shippingLines?.nodes[0]?.title
      );
    }) // we need to skip orders without shipping line titles
    .map((order) => {
      return {
        Referencia_Envío: String(
          order.id.replace("gid://shopify/Order/", "")
        ).slice(0, -1),
        Nombre: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        Direccion: order.shippingAddress.address1,
        Cod_Postal: order.shippingAddress.zip,
        Población: order.shippingAddress.city,
        Cod_Pais: "ES",
        Telefono: normalizePhone(order.shippingAddress.phone),
        Email: order.email,
        Servicio: getServicio(order),
        Producto: 2,
        K_Bultos: order.lineItems.nodes.length,
        L_Kilos: getOrderTotalWeight(
          order.fulfillmentOrders.nodes
        ),
        M_CCC: "62739-8",
        N_Observaciones: "",
      };
    });

  const reponse = js2xmlparser.parse(
    "Ordini_Spedizione",
    { Testata_Ordine: result },
    {
      declaration: { encoding: "UTF-8" },
   
    }
  );
  return {
    statusCode: 200,
    body: reponse,
  };
};