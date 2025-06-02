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
  return parseFloat(total.toFixed(2));
}

function getOrderTotalQuantity(order: any): number {
  let total = 0;
  if (order.lineItems?.nodes) {
    order.lineItems.nodes.forEach((lineItem: any) => {
      total += lineItem.quantity || 0;
    });
  }
  return total;
}

function getVolume(lineItems: any[]) {
  let result = [];
  lineItems.forEach(li => {
    const hauteur = parseFloat(li?.product?.hauteur?.value.replace(",", "."))
    const longueur = parseFloat(li?.product?.longueur?.value.replace(",", "."))
    const largeur = parseFloat(li?.product?.largeur?.value.replace(",", "."))
    console.log(JSON.stringify({hauteur, longueur, largeur}))
    if (Number.isNaN(hauteur) || Number.isNaN(longueur) || Number.isNaN(largeur)) {
      
    } else {
      result.push((hauteur * largeur * longueur)  / 1000000)
    }
  })
console.log("result", result)
  return result.reduce((prev, curr) => {
    return prev + curr
  }, 0)
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
function getSubAccount() {
  return '687590-BELVEO SPAIN SL'
}

function getPickupDate(order) {
  if (!order.updatedAt) return null;
  
  const date = new Date(order.updatedAt);
  const dayOfWeek = date.getUTCDay();
  const timeDecimal = date.getUTCHours() + date.getUTCMinutes() / 100;
 
  let targetDate = new Date(date);
 
  if ((dayOfWeek === 5 && timeDecimal >= 10.01) || 
      dayOfWeek === 6 || 
      dayOfWeek === 0 || 
      (dayOfWeek === 1 && timeDecimal <= 9.59)) {
    // Set to next Monday
    targetDate.setUTCDate(date.getUTCDate() + ((8 - dayOfWeek) % 7));
  } else if ((dayOfWeek === 1 && timeDecimal >= 10.01) || 
             dayOfWeek === 2 || 
             (dayOfWeek === 3 && timeDecimal <= 9.59)) {
    // Set to next Wednesday  
    targetDate.setUTCDate(date.getUTCDate() + ((10 - dayOfWeek) % 7));
  } else if ((dayOfWeek === 3 && timeDecimal >= 10.01) || 
             dayOfWeek === 4 || 
             (dayOfWeek === 5 && timeDecimal <= 9.59)) {
    // Set to next Friday
    targetDate.setUTCDate(date.getUTCDate() + ((12 - dayOfWeek) % 7));
  }
 
  return targetDate.toLocaleDateString('en-GB'); // Returns DD/MM/YYYY format
 }

function formatZipCode(zip: string): string {
  if (!zip) return "";
  // Remove any existing hyphens and spaces
  const cleanZip = zip.replace(/[-\s]/g, "");
  // For Portuguese zip codes (7 digits), add hyphen after 4 digits  
  if (cleanZip.length === 7) {
    return `${cleanZip.slice(0, 4)}-${cleanZip.slice(4)}`;
  }
  return cleanZip;
}

export const handler: Handler = async (event, context) => {
  let body: data_type = JSON.parse(event.body);

  const result = body
    .map((order) => {
      return {
        "Sub-Account": getSubAccount(),
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
        "Date Flexibility": "Specific",
        "Pickup Time": "15:00",
        "Time Flexibility": "Specific",
        "Destination Name": `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        "Destination Address Line 1": order.shippingAddress.address1,
        "Destination Address Line 2": order.shippingAddress.address2,
        "Destination City": order.shippingAddress.city,
        "Destination Country": order.shippingAddress?.countryCodeV2 === "PT" ? "PT" : "ES",
        "Destination Zipcode": formatZipCode(order.shippingAddress.zip),
        Quantity: getOrderTotalQuantity(order),
        Weight: getOrderTotalWeight(order.fulfillmentOrders.nodes),
        Volume: getVolume(order.lineItems.nodes),
        "Origin Contact Name": "Luis Vargas Fernandez",
        "Origin Contact Number": "34931173177",
        "Origin Contact Email Address": "martorell.pedidos-logistica@fercam.com",
        "Destination Contact Name": `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        "Destination Contact Phone Number": normalizePhone(order.shippingAddress.phone),
        "Destination Contact Email Address": order.customer.email,
        "Commodity": 91,
        "Pallet quantity": 1,
        "Pallet weight": 27,
        "Pallet volume": 0.32,
        "Total weight": getOrderTotalWeight(order.fulfillmentOrders.nodes) + 27,
        "Total volume": getVolume(order.lineItems.nodes) + 0.32,
      };
    });

 
  const getCSV = (orders) => {
    if (!orders || orders.length === 0) return "";

    const headers = Object.keys(orders[0]).join(";");

    const rows = orders.map((order) => {
      return Object.keys(orders[0])
        .map((header) => {
          const value = order[header] || "";
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        })
        .join(";");
    });

    return `${headers}\n${rows.join("\n")}`;
  };
  console.log(result)
  const responseCSV = getCSV(result);

  return {
    statusCode: 200,
    body: JSON.stringify({ responseCSV }),
  };
};
