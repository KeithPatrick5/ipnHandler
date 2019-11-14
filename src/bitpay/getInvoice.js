const axios = require("axios");

const NETWORK = process.env.BITPAY_NETWORK;
let resource_url;
if (NETWORK === 'mainnet') resource_url = "https://bitpay.com/invoices";
else resource_url = "https://test.bitpay.com/invoices";

module.exports.getInvoice = async invoice_id => {
  return await axios({
    method: "get",
    url: resource_url + "/" + invoice_id
  });
};
