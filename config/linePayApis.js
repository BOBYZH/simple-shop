/*
串接金流API使用
參考：https://ithelp.ithome.com.tw/articles/10272950
*/
const axios = require('axios');
const uuid = require('uuid4');
const crypto = require('crypto-js');

const key = process.env.LINE_PAY_CHANNEL_SECRET;
const nonce = uuid();

// 加密
function encryptCrypto (route, body) {
  return crypto.HmacSHA256(key + route + JSON.stringify(body) + nonce, key);
}

function encHmacBase64 (encrypt) {
  return crypto.enc.Base64.stringify(encrypt);
}

// headers
function setConfigs (hmacBase64) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': process.env.LINE_PAY_CHANNEL_ID,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': hmacBase64
    }
  };
}

const linePayApis = {
  postRequest: async (amount, orderId, cartItems) => {
    const productName = process.env.WEB_PRODUCT_CATEGORY;
    const body = {
      amount: amount,
      currency: 'TWD',
      orderId: nonce,
      packages: [
        {
          id: orderId,
          amount: amount,
          name: productName,
          products: []
        }
      ],
      redirectUrls: {
        confirmUrl: process.env.WEB_URL + '/order/' + orderId + '/confirm',
        cancelUrl: process.env.WEB_URL + '/'
      }
    };

    for (let i = 0; i < cartItems.length; i++) {
      body.packages[0].products.push({
        id: cartItems[i].prodId,
        name: cartItems[i].prodName,
        quantity: cartItems[i].quantity,
        price: cartItems[i].price
      });
    }

    const route = '/v3/payments/request';
    const encrypt = encryptCrypto(route, body);
    const hmacBase64 = encHmacBase64(encrypt);
    const configs = setConfigs(hmacBase64);

    const res = await axios.post(
      process.env.LINE_PAY_API_URI + route,
      body,
      configs
    );

    return res.data;
  },
  postConfirm: async (amount, transactionId) => {
    const body = {
      amount: amount,
      currency: 'TWD'
    };

    const route = `/v3/payments/${transactionId}/confirm`;
    const encrypt = encryptCrypto(route, body);
    const hmacBase64 = encHmacBase64(encrypt);
    const configs = setConfigs(hmacBase64);

    const res = await axios.post(
      process.env.LINE_PAY_API_URI + route,
      body,
      configs
    );

    return res.data;
  }
};

module.exports = linePayApis;
