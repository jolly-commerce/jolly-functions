import { Handler } from "@netlify/functions";
const js2xmlparser = require("js2xmlparser");
import { FullfillmentOrder, data_type } from "./types";
import { get } from "http";
import XLSX from 'xlsx';
import { Readable } from 'stream';
import csv from "csv-parser"


async function convertCsvStringToXlsxString(csvString) {
  const rows = [];

  try {
    // Create readable stream from string
    const readableStream = Readable.from([csvString]);

    // Parse CSV
    await new Promise((resolve, reject) => {
      readableStream
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Create workbook & worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Convert to buffer and then base64
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return xlsxBuffer.toString('base64');
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
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
  return Math.ceil(total / 1000);
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
        M_CCC: "", //"62739-8",
        N_Observaciones: "",
      };
    });


    const getCSVJSON = (result) => {
      const keyMapping = {
        'Referencia_Envío': 'Referencia Envío',
        'Nombre': 'Nombre',
        'Direccion': 'Direccion',
        'Cod_Postal': 'Cod Postal',
        'Población': 'Población',
        'Cod_Pais': 'Cod Pais',
        'Telefono': 'Telefono',
        'Email': 'Email',
        'Servicio': 'Servicio',
        'Producto': 'Producto',
        'K_Bultos': 'Bultos',
        'L_Kilos': 'Kilos',
        'M_CCC': 'CCC (Sin - FR)',
        'N_Observaciones': 'Observaciones'
      };
    
      return result.map (r => Object.entries(r).reduce((acc, [key, value]) => {
        const newKey = keyMapping[key] || key;
        acc[newKey] = value;
        return acc;
      }, {}));
    };
    const getCSV = (orders) => {
      if (!orders || orders.length === 0) return '';
      
      const headers = Object.keys(orders[0]).join(',');
      
      const rows = orders.map(order => {
        return Object.keys(orders[0]).map(header => {
          const value = order[header] || '';
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(',');
      });
    
      return `${headers}\n${rows.join('\n')}`;
    };
  const csvJSON = getCSVJSON(result)
  const responseCSV = getCSV(result);
  const responseXLSX = await convertCsvStringToXlsxString(responseCSV)
  const responseXML = js2xmlparser.parse(
    "Ordini_Spedizione",
    { Testata_Ordine: result },
    {
      declaration: { encoding: "UTF-8" },
   
    }
  );
  return {
    statusCode: 200,
    body: JSON.stringify({responseCSV, responseXLSX}),
  };
};
