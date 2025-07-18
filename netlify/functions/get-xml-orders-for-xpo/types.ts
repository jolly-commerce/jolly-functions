const fullfillmentOrder = {
  "lineItems": {
    "nodes": [
      {
        "totalQuantity": 1,
        "weight": {
          "unit": "KILOGRAMS",
          "value": 27.3
        }
      },
      {
        "totalQuantity": 1,
        "weight": {
          "unit": "KILOGRAMS",
          "value": 0.7
        }
      }
    ]
  }
}
export const example_data = [
  {
    note: undefined,
    "id": "gid://shopify/Order/5970757910875",
    "fulfillmentOrders": {
      "nodes": [
        {
          "lineItems": {
            "nodes": [
              {
                "totalQuantity": 1,
                "weight": {
                  "unit": "KILOGRAMS",
                  "value": 27.3
                }
              },
              {
                "totalQuantity": 1,
                "weight": {
                  "unit": "KILOGRAMS",
                  "value": 0.7
                }
              }
            ]
          }
        }
      ]
    },
    "shippingLines": {
      "nodes": [
        {
          "title": "Entrega en 7 días laborables - Entrega al pie de su edificio o domicilio",
          "requestedFulfillmentService": null,
          "carrierIdentifier": "650f1a14fa979ec5c74d063e968411d4"
        }
      ]
    },
    "name": "#1773",
    "test": false,
    "email": "nobili.omar@icloud.com",
    "customer": {
      "id": "gid://shopify/Customer/7957005205851",
      "email": "nobili.omar@icloud.com",
      "firstName": "Omar",
      "lastName": "Nobili"
    },
    "shippingAddress": {
      "address1": "Calle Pompeya 3",
      "firstName": "Omar",
      "phone": "638462236",
      "city": "Molina de Segura",
      "zip": "30500",
      "province": "Murcia",
      "country": "Spain",
      "lastName": "Nobili",
      "address2": null,
      "company": null,
      "name": "Omar Nobili",
      "countryCodeV2": "ES",
      "provinceCode": "MU"
    },
    "billingAddress": {
      "address1": "Calle Pompeya 3",
      "firstName": "Omar",
      "phone": "638462236",
      "city": "Molina de Segura",
      "zip": "30500",
      "province": "Murcia",
      "country": "Spain",
      "lastName": "Nobili",
      "address2": null,
      "company": null,
      "name": "Omar Nobili",
      "countryCodeV2": "ES",
      "provinceCode": "MU"
    },
    "lineItems": {
      "nodes": [
        {
          "sku": "PPCE001124",
          "quantity": 1
        },
        {
          "sku": "AHHP001118",
          "quantity": 1
        }
      ]
    },
    "fulfillments": []
  },
  {
    note: undefined,
    "id": "gid://shopify/Order/5970757910875",
    "fulfillmentOrders": {
      "nodes": [
        {
          "lineItems": {
            "nodes": [
              {
                "totalQuantity": 1,
                "weight": {
                  "unit": "KILOGRAMS",
                  "value": 27.3
                }
              },
              {
                "totalQuantity": 1,
                "weight": {
                  "unit": "KILOGRAMS",
                  "value": 0.7
                }
              }
            ]
          }
        }
      ]
    },
    "shippingLines": {
      "nodes": [
        {
          "title": "Entrega en 7 días laborables - Entrega al pie de su edificio o domicilio",
          "requestedFulfillmentService": null,
          "carrierIdentifier": "650f1a14fa979ec5c74d063e968411d4"
        }
      ]
    },
    "name": "#1773",
    "test": false,
    "email": "nobili.omar@icloud.com",
    "customer": {
      "id": "gid://shopify/Customer/7957005205851",
      "email": "nobili.omar@icloud.com",
      "firstName": "Omar",
      "lastName": "Nobili"
    },
    "shippingAddress": {
      "address1": "Calle Pompeya 3",
      "firstName": "Omar",
      "phone": "638462236",
      "city": "Molina de Segura",
      "zip": "30500",
      "province": "Murcia",
      "country": "Spain",
      "lastName": "Nobili",
      "address2": null,
      "company": null,
      "name": "Omar Nobili",
      "countryCodeV2": "ES",
      "provinceCode": "MU"
    },
    "billingAddress": {
      "address1": "Calle Pompeya 3",
      "firstName": "Omar",
      "phone": "638462236",
      "city": "Molina de Segura",
      "zip": "30500",
      "province": "Murcia",
      "country": "Spain",
      "lastName": "Nobili",
      "address2": null,
      "company": null,
      "name": "Omar Nobili",
      "countryCodeV2": "ES",
      "provinceCode": "MU"
    },
    "lineItems": {
      "nodes": [
        {
          "sku": "PPCE001124",
          "quantity": 1
        },
        {
          "sku": "AHHP001118",
          "quantity": 1
        }
      ]
    },
    "fulfillments": []
  },
  
];

export type data_type = Array<typeof example_data[0] & { note?: string | null }>;
export type FullfillmentOrder = typeof fullfillmentOrder