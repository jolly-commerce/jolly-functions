import { Handler } from "@netlify/functions";
import * as https from "https";

const SHOPIFY_ACCESS_TOKEN = process.env.BELVEO_SHOPIFY_ACCESS_TOKEN;

const shopifyGraphEndpoint =
  "https://belveo-alegria.myshopify.com/admin/api/2023-04/graphql.json";

// 1. Check if order adress contains a company
// 2. if yes, check if company with this address already exists
// 3. if not, create a new company with this name
// 3b. AND attach the customer who placed order to this company
export const handler: Handler = async (event, context) => {
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "*",
  };

  if (event.httpMethod === "OPTIONS") {
    console.log("OPTIONS ", { CORS_HEADERS });
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Successful preflight call." }),
    };
  }

  if (!event.body) {
    return getResponse(400, { err: "no body :( " });
  }
  const body = JSON.parse(event.body);
  console.log("request body : " , JSON.stringify(body))
  let company: Company | null;
  let customer: Contact | null;

  // Check if order adress contains a company
  try {
    company = extractCompany(body);
    customer = extractCustomer(body);
  } catch (error) {
    return getResponse(400, { err: "body has wrong format" });
  }

  if (!company) {
    // it's not a company order. stop here
    return getResponse(200);
  }
  if (!customer) {
    // should not happen, something wrong
    return getResponse(400, { err: "could not find customer from order" });
  }

  // if yes, check if company with this address already exists
  const shopifyData = await graphQLRequest_getCompaniesWithSameName(
    company.name
  );
  console.log("here", JSON.stringify(shopifyData))
  // Handle the GraphQL response
  if (!shopifyData || !shopifyData.data) {
    return getResponse(500, {
      err: "Invalid response from Shopify",
      body,
      shopifyData,
    });
  }
  // The meat
  try {
    const companiesAndContacts = extractCompaniesAndContacts(shopifyData);
    const hasNoMatchingCompanies = companiesAndContacts.length == 0;
    if (hasNoMatchingCompanies) {
      // No matching company : let's create it and assign customer
      const createResponse = await graphQLRequest_createCompany(company);
      console.log("CreateResponse: ",JSON.stringify(createResponse));
      company = createResponse.data.companyCreate.company as any;
    } else {
      console.log(JSON.stringify(companiesAndContacts))
      company = companiesAndContacts[0].company
    }

    const assignCustomerResponse = await graphQLRequest_assignCustomerAsContact(customer, company as Company);
    console.log(`assignCustomerResponse : ${JSON.stringify(assignCustomerResponse)}`)
    return getResponse(200);
  } catch (err) {
    console.log(err);
    return getResponse(500, { err, body, shopifyData });
  }
};

async function graphQLRequest_getCompaniesWithSameName(company: string) {
  // No need to normalize company name, graphql already remove accents and lower case etc...
  const body = `
      {
          companies(first: 2 query:"name:${company}") {
            edges {
              node {
                name
                id
                contacts(first: 2) {
                  edges {
                    node {
                      customer {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

  return makeGraphQLRequest<any>(body);
}
async function graphQLRequest_createCompany(company: Company) {
  console.log(`GraphQL request : createCompany : ${JSON.stringify(company)}`)
  const mutation = `
        mutation companyCreate($input: CompanyCreateInput!) {
            companyCreate(input: $input) {
            company {
               id
            }
            userErrors {
                field
                message
            }
            }
        }
        `;
  const variables = {
    input: {
      company: {
        name: company.name,
      },
      companyLocation: {
        shippingAddress: company.address,
        billingSameAsShipping: true,
        buyerExperienceConfiguration: {
          checkoutToDraft: true,
          editableShippingAddress: true,
        },
        name: "adresse principale",
        phone: company.address.phone,
      },
    },
  };

  return makeGraphQLRequest<any>(mutation, variables);
}

async function graphQLRequest_assignCustomerAsContact(
  customer: Contact,
  company: Company
) {
  console.log(
    `Assign customer as contact: `,
    JSON.stringify({ customer, company })
  );
  const mutation = `
          mutation companyAssignCustomerAsContact($companyId: ID!, $customerId: ID!) {
            companyAssignCustomerAsContact(companyId: $companyId, customerId: $customerId) {
              companyContact {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
          `;
  const variables = { companyId: `${company.id}`, customerId: `gid://shopify/Customer/${customer.id}` };

  return makeGraphQLRequest<any>(mutation, variables);
}

function extractCompaniesAndContacts(graphQLResponse): CompanyContact[] {
  let companyContactData: CompanyContact[] = [];

  // Check if the response is an object and contains 'data' and 'companies'
  if (
    typeof graphQLResponse === "object" &&
    graphQLResponse !== null &&
    "data" in graphQLResponse &&
    "companies" in graphQLResponse.data
  ) {
    const companiesEdges = graphQLResponse.data.companies.edges;

    // Check if companiesEdges is an array
    if (Array.isArray(companiesEdges)) {
      companiesEdges.forEach((companyEdge) => {
        if ("node" in companyEdge && "name" in companyEdge.node) {
          const company: Company = companyEdge.node;
          const contactsEdges = companyEdge.node.contacts
            ? companyEdge.node.contacts.edges
            : [];

          // Check if contactsEdges is an array
          if (Array.isArray(contactsEdges)) {
            let contacts: Contact[] = contactsEdges
              .map((contactEdge) => {
                if (
                  "node" in contactEdge &&
                  "customer" in contactEdge.node &&
                  "id" in contactEdge.node.customer
                ) {
                  return contactEdge.node.customer; // Extract contact id
                }
                return null;
              })
              .filter((id) => id !== null); // Filter out any null values

            companyContactData.push({ company, contacts });
          }
        }
      });
    }
  } else {
    throw new Error("Invalid GraphQL response");
  }

  return companyContactData;
}

function extractCustomer(data: any): Contact | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const customer = data.customer;
  const shippingAddress = data.shipping_address;

  if (
    customer &&
    typeof customer === "object" &&
    shippingAddress &&
    typeof shippingAddress === "object"
  ) {
    const contactAddress: Address = {
      address1: shippingAddress.address1,
      city: shippingAddress.city,
      countryCode: shippingAddress.country_code,
      phone: shippingAddress.phone,
      recipient: shippingAddress.name,
      zip: shippingAddress.zip,
      // Optional fields
      address2: shippingAddress.address2 || undefined,
      zoneCode: shippingAddress.province_code || undefined,
    };

    // Assuming email, firstName, lastName, and locale are required fields
    if (
      typeof customer.email === "string" &&
      typeof customer.first_name === "string" &&
      typeof customer.last_name === "string" &&
      typeof data.customer_locale === "string"
    ) {
      return {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        locale: data.customer_locale,
        phone: shippingAddress.phone,
        address: contactAddress,
      };
    }
  }

  return null;
}

function extractCompany(data: any): Company | null {
  if (!data || typeof data !== "object" || !data.shipping_address) {
    return null;
  }

  const shippingAddress = data.shipping_address;
  if (typeof shippingAddress === "object") {
    const companyAddress: CompanyAddress = {
      address1: shippingAddress.address1,
      // address2: shippingAddress.address2 || '',
      city: shippingAddress.city,
      countryCode: shippingAddress.country_code,
      phone: shippingAddress.phone || "",
      //  recipient: shippingAddress.recipient || '',
    };

    return {
      name: shippingAddress.company,
      address: companyAddress,
    };
  }

  return null;
}

function getResponse(
  code: number,
  body?: any
): {
  headers: { [key: string]: string };
  statusCode: number;
  body?: string;
} {
  let result = {
    statusCode: code,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
  if (body) {
    return {
      ...result,
      body: JSON.stringify(body),
    };
  }
  return result;
}

async function makeGraphQLRequest<T>(
  body: string,
  variables?: Object
): Promise<T> {
  return (await makeRequest(
    shopifyGraphEndpoint,
    "POST",
    {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    },
    JSON.stringify({ query: body, variables })
  )) as T;
}

function makeRequest(url: string, method: string, headers = {}, body?: any) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(data));
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

interface CompanyContact {
  company: Company;
  contacts: Contact[];
}
interface Address {
  address1: string;
  address2?: string;
  city: string;
  countryCode: string;
  phone: string;
  recipient: string;
  zip: string;
  zoneCode?: string;
}
interface Company {
  name: string;
  id?: string;
  address: CompanyAddress;
}

interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  phone: string;
  address: Address;
}

interface CompanyAddress {
  address1: string;
  address2?: string;
  city: string;
  countryCode: string;
  phone?: string;
  recipient?: string;
}
