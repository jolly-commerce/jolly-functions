import { Config, makeGraphQLRequest } from "./utils";

async function Shopify_get_company_by_name(config: Config, company: string) {
  // No need to normalize company name, graphql already remove accents and lower case etc...
  const body = `
        {
            companies(first: 1 query:"name:${company}") {
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

  return makeGraphQLRequest<any>(config, body);
}

async function Shopify_set_metafield(config: Config, currentObj: any): Promise<any> {

  const body = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const variables = {
    "metafields": [
      {
        "key": "list_of_tags",
        "namespace": "jolly_meta",
        "ownerId": `${currentObj.product_id}`,
        "type": "list.mixed_reference",
        "value": `[\"${currentObj.metaobject_id}\"]`
      }
    ]
  };

  return await makeGraphQLRequest<any>(config, body, variables);
}

async function Shopify_update_order_markAsPaid(config: Config, orderId: string,) {
  // mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
  // }
}

async function Shopify_update_order_note(config: Config, orderId: string, note: string) {

}