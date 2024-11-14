import { Handler } from "@netlify/functions";
const js2xmlparser = require("js2xmlparser");
import { FullfillmentOrder, data_type } from "./types";
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
  if (deliveryCode.includes("24")) {
    return 1;
  } else if (deliveryCode.includes("48")) {
    return 15;
  } else {
    return 13;
  }
}
function getSubAccount(order) {
  if (order.tags && order.tags.includes("Pro Site")) {
  return '687590-BELVEO SPAIN SL'
  }
  return '68759001-BELVEO SPAIN SL'
}

function getPickupDate(order) {
  if (!order.updatedAt) {
    return null;
  }
  const orderDate = order.updatedAt;
  const date = new Date(orderDate);
  const dayOfWeek = date.getUTCDay(); // 0-6: Sunday-Saturday
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  // Convert time to decimal for easier comparison
  const timeDecimal = hours + minutes / 100;

  // Friday 10:01 to Monday 09:59 -> Monday
  if (
    (dayOfWeek === 5 && timeDecimal >= 10.01) ||
    dayOfWeek === 6 ||
    dayOfWeek === 0 ||
    (dayOfWeek === 1 && timeDecimal <= 9.59)
  ) {
    return "Monday";
  }

  // Monday 10:01 to Wednesday 09:59 -> Wednesday
  if (
    (dayOfWeek === 1 && timeDecimal >= 10.01) ||
    dayOfWeek === 2 ||
    (dayOfWeek === 3 && timeDecimal <= 9.59)
  ) {
    return "Wednesday";
  }

  // Wednesday 10:01 to Friday 09:59 -> Friday
  if (
    (dayOfWeek === 3 && timeDecimal >= 10.01) ||
    dayOfWeek === 4 ||
    (dayOfWeek === 5 && timeDecimal <= 9.59)
  ) {
    return "Friday";
  }
}

export const handler: Handler = async (event, context) => {
  let body: data_type = JSON.parse(event.body);

  const result = body
    .filter((order) => {
      return (
        getDeliveryCode(order).includes("XPO") &&
        order.shippingLines?.nodes[0]?.title
      );
    }) // we need to skip orders without shipping line titles
    .map((order) => {
      return {
        "Sub-Account": getSubAccount(order),
        "Depot Information": "CASTELLBISBAL",
        "Customer Reference": String(
          order.id.replace("gid://shopify/Order/", "")
        ).slice(0, -1),
        "Origin Name": "FERCAM",
        "Origin Address Line 1":
          "Av. Salvador Dalì, parcela 16 vial Rierai - Poligono Industrial Can Margarit",
        "Origin Address Line 2": "",
        "Origin City": "Sant Esteve de Sesrovires",
        "Origin Country": "ES",
        "Origin Zipcode": "8635",
        "Pickup Date": getPickupDate(order),
        "Date Flexibility": "No",
        "Pickup Time": "Between 3:00 p.m. and 5:00 p.m.",
        "Time Flexibility": "No",
        "Destination Name": `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        "Destination Address Line 1": order.shippingAddress.address1,
        "Destination Address Line 2": order.shippingAddress.address2,
        "Destination City": order.shippingAddress.city,
        "Destination Country": "ES",
        "Destination Zipcode": order.shippingAddress.zip,
        Quantity: "1",
        Weight: getOrderTotalWeight(order.fulfillmentOrders.nodes),
        Volume: "",
        "Origin Contact Name": "Luis Vargas Fernandez",
        "Origin Contact Number": "34931173177",
        "Origin Contact Email Address":
          "martorell.pedidos-logistica@fercam.com & martorell.transporte-logistica@fercam.com",
        "Destination Contact Name": `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      };
    });

 
  const getCSV = (orders) => {
    if (!orders || orders.length === 0) return "";

    const headers = Object.keys(orders[0]).join(",");

    const rows = orders.map((order) => {
      return Object.keys(orders[0])
        .map((header) => {
          const value = order[header] || "";
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        })
        .join(",");
    });

    return `${headers}\n${rows.join("\n")}`;
  };
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
    body: JSON.stringify({ responseXML, responseXLSX }),
  };
};
