const http = require("http");

// Define the options for the HTTP request
const options = {
  hostname: "localhost",
  port: 8888,
  path: "/.netlify/functions/get-xml-orders-for-xpo",
  method: "POST",
  headers: {
    "Content-Type": "application/json", // Specify JSON content
    "Content-Length": 0, // Placeholder; will be updated later
  },
};

// Define the payload
const payload = JSON.stringify([
  {
    id: "gid://shopify/Order/6134648570203",
    tags: ["send_to_XPO"],
    updatedAt: "2024-11-26T09:29:48Z",
    fulfillmentOrders: {
      nodes: [
        {
          lineItems: {
            nodes: [
              { weight: { unit: "KILOGRAMS", value: 30.5 } },
              { weight: { unit: "KILOGRAMS", value: 0.7 } },
              { weight: { unit: "KILOGRAMS", value: 10.2 } },
            ],
          },
        },
      ],
    },
    shippingLines: {
      nodes: [
        {
          title:
            "XPO - Entrega entre 5 y 7 días laborables - Entrega al pie de su edificio o domicilio",
          requestedFulfillmentService: null,
          carrierIdentifier: "650f1a14fa979ec5c74d063e968411d4",
        },
      ],
    },
    name: "#2337",
    test: false,
    email: "lorenzbogaert@gmail.com",
    customer: {
      id: "gid://shopify/Customer/8246754115931",
      email: "lorenzbogaert@gmail.com",
      firstName: "Lorenz",
      lastName: "Bogaert",
    },
    shippingAddress: {
      address1: "Carrer del Pavelló 50",
      firstName: "Lorenz",
      phone: "+32496561500",
      city: "Begur",
      zip: "17255",
      province: "Girona",
      country: "Spain",
      lastName: "Bogaert",
      address2: null,
      company: null,
      name: "Lorenz Bogaert",
      countryCodeV2: "ES",
      provinceCode: "GI",
    },
    billingAddress: {
      address1: "Carrer del Pavelló 50",
      firstName: "Lorenz",
      phone: "+32496561500",
      city: "Begur",
      zip: "17255",
      province: "Girona",
      country: "Spain",
      lastName: "Bogaert",
      address2: null,
      company: null,
      name: "Lorenz Bogaert",
      countryCodeV2: "ES",
      provinceCode: "GI",
    },
    lineItems: {
      nodes: [
        {
          sku: "PPRB001124",
          quantity: 1,
          product: {
            hauteur: { value: "17" },
            largeur: { value: "37" },
            longueur: { value: "268" },
          },
        },
        {
          sku: "AHHP001118",
          quantity: 1,
          product: {
            hauteur: { value: "8" },
            largeur: { value: "46" },
            longueur: { value: "58" },
          },
        },
        {
          sku: "ALDA003324",
          quantity: 1,
          product: {
            hauteur: { value: "31" },
            largeur: { value: "52" },
            longueur: { value: "52" },
          },
        },
      ],
    },
    fulfillments: [{ service: { serviceName: "Manual" } }],
  },
  {
    id: "gid://shopify/Order/6136244797787",
    tags: ["send_to_XPO"],
    updatedAt: "2024-11-26T09:29:29Z",
    fulfillmentOrders: {
      nodes: [
        {
          lineItems: {
            nodes: [
              { weight: { unit: "KILOGRAMS", value: 28.2 } },
              { weight: { unit: "KILOGRAMS", value: 29 } },
              { weight: { unit: "KILOGRAMS", value: 0.7 } },
              { weight: { unit: "KILOGRAMS", value: 2.13 } },
            ],
          },
        },
      ],
    },
    shippingLines: {
      nodes: [
        {
          title:
            "XPO - Entrega entre 5 y 7 días laborables - Entrega al pie de su edificio o domicilio",
          requestedFulfillmentService: null,
          carrierIdentifier: "650f1a14fa979ec5c74d063e968411d4",
        },
      ],
    },
    name: "#2343",
    test: false,
    email: "hugokruger@gmail.com",
    customer: {
      id: "gid://shopify/Customer/8248893014363",
      email: "hugokruger@gmail.com",
      firstName: "Hugo",
      lastName: "Kruger",
    },
    shippingAddress: {
      address1: "Passeig Miramar 22 B, Vallpineda",
      firstName: "Hugo",
      phone: "+34639422961",
      city: "San Pere de Ribes",
      zip: "08810",
      province: "Barcelona",
      country: "Spain",
      lastName: "Kruger",
      address2: null,
      company: null,
      name: "Hugo Kruger",
      countryCodeV2: "ES",
      provinceCode: "B",
    },
    billingAddress: {
      address1: "Passeig Miramar 22 B, Vallpineda",
      firstName: "Hugo",
      phone: "+34639422961",
      city: "San Pere de Ribes",
      zip: "08810",
      province: "Barcelona",
      country: "Spain",
      lastName: "Kruger",
      address2: null,
      company: null,
      name: "Hugo Kruger",
      countryCodeV2: "ES",
      provinceCode: "B",
    },
    lineItems: {
      nodes: [
        {
          sku: "PPCE017122",
          quantity: 1,
          product: {
            hauteur: { value: "16" },
            largeur: { value: "43" },
            longueur: { value: "262" },
          },
        },
        {
          sku: "ALRL005120",
          quantity: 1,
          product: {
            hauteur: { value: "21" },
            largeur: { value: "88" },
            longueur: { value: "88" },
          },
        },
        {
          sku: "AHHP001118",
          quantity: 1,
          product: {
            hauteur: { value: "8" },
            largeur: { value: "46" },
            longueur: { value: "58" },
          },
        },
        {
          sku: "ALAE001123",
          quantity: 1,
          product: {
            hauteur: { value: "2,5" },
            largeur: { value: "20,5" },
            longueur: { value: "20,5" },
          },
        },
      ],
    },
    fulfillments: [{ service: { serviceName: "Manual" } }],
  },
]);

// Update the Content-Length header with the payload size
options.headers["Content-Length"] = Buffer.byteLength(payload);

// Create the HTTP request
const req = http.request(options, (res) => {
  let responseBody = "";

  // Collect the response data
  res.on("data", (chunk) => {
    responseBody += chunk;
  });

  // Handle the response end
  res.on("end", () => {
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Body: ${responseBody}`);
  });
});

// Handle any errors
req.on("error", (error) => {
  console.error(`Request error: ${error.message}`);
});

// Write the payload to the request body
req.write(payload);

// End the request
req.end();
