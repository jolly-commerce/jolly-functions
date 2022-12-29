import { Handler } from "@netlify/functions";
import { data_type } from "../get-xml-orders/types";
import dayjs from "dayjs";



export const handler: Handler = async (event, context) => {
  let body: data_type = JSON.parse(event.body);

  let result: any[] = []

  body.map((order) => {
  let _result = "";

    /**
     * LIGNE 1 :
        - 1 = H --> à chaque fois, cela ne bouge pas
        - 2 = ORDER --> à chaque fois, cela ne bouge pas
        - 3 = CREATE --> à chaque fois, cela ne bouge pas
        - 4 = E902 --> à chaque fois, cela ne bouge pas
        - 7 = Prénom et nom du contact (si c'est un client BtoC) ou le nom de l'entreprise (si c'est un client BtoB) --> change à chaque commande
        - 14 = Nous mettons toujours "United-Kingdom"
        - 15 = Que ce soit un client BtoC ou BtoB, il faut entrer ici le prénom et le nom du contact/client --> change à chaque commande
        - 16 = numéro de téléphone (nous le mettons au format "07XXXXXXXXX")
        - 28 = ce champ n'est pas important mais comme il est obligatoire, jusqu'à présent, on le remplissait en mettant la date du jour. En fait ici, il faudrait mettre la date de livraison souhaitée (date du jour + 2 jours). Si tu peux le faire, c'est bien, sinon ce n'est pas grave !
        - 29 = STANDARD --> à chaque fois, cela ne bouge pas
        - 30 = numéro de commande Shopify (4 chiffres) --> change à chaque commande.
        - 73 = FALSE --> à chaque fois, cela ne bouge pas
     */

    const getLine7 = () => {
      if (order.shipping_address.company) {
        return order.shipping_address.company;
      }
      return `${order.shipping_address.first_name} ${order.shipping_address.last_name}`;
    };

    const getDateField = () => {
      // from 2022-03-20T09:25:29.000Z to 20/03/2022
      const date = order.created_at.split("T")[0];

      return dayjs(date).add(2, "days").format("DD/MM/YYYY");
    };
    let orderLine = `"H","ORDER","CREATE","E902","","","${getLine7()}","${order.shipping_address.address1} ${order.shipping_address.address2}","${order.shipping_address.city}","","","","${order.shipping_address.zip}","United-Kingdom","${order.shipping_address.first_name} ${order.shipping_address.last_name}","${order.shipping_address.phone}","","","","","","","","","","","","${getDateField()}","STANDARD","${order.name.replace("#","")}","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","false",""\n`;
    _result += orderLine;

    order.line_items.forEach((line) => {
      /**
       * 
        1. = Cela commence toujours par la lettre L
        2. = Correspond à la référence du produit.
        4. = correspond à la quantité commandée par référence.
       */
      const getCleanSKU = () => line.sku.replace(/\D+/g, ""); // sometimes sku contains - AIRWIND and we don't want that 36
      let orderProductLine = `"L","${getCleanSKU()}","","${line.quantity}","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""\n`;
      _result += orderProductLine;
    });

    result.push({line: _result, name: order.name.replace("#", "")})
  });
  const response = result;
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
