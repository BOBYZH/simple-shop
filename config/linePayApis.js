/*
串接金流API使用
參考：
https://ithelp.ithome.com.tw/articles/10272950
https://ithelp.ithome.com.tw/articles/10227794
*/
const axios = require('axios');
const uuid = require('uuid4');
const crypto = require('crypto-js');

// 簽章合成公式所需的資料
const key = process.env.LINE_PAY_CHANNEL_SECRET;
// 定義空的隨機數變數，以符合semistandard的格式
let nonce;

// Header 與所需的 HMAC-SHA256 的 Base64 加密簽章相關函式
function encryptCrypto (route, body) {
  return crypto.HmacSHA256(key + route + JSON.stringify(body) + nonce, key);
}

function encHmacBase64 (encrypt) {
  return crypto.enc.Base64.stringify(encrypt);
}

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
  // Request API，請求付款資訊
  postRequest: async (amount, orderId, cartItems) => {
    // 將uuid移到函式內，避免每次呼叫時uuid沒有更新
    nonce = uuid();
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
        confirmUrl: process.env.WEB_URL + '/orders/confirm',
        confirmUrlType: 'CLIENT',
        cancelUrl: process.env.WEB_URL + '/orders'
      }
    };

    // 將商品項目寫入購物車
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

    // 將nonce作為訂單標號，也是LinePay的orderId與資料庫中的sn
    res.data.sn = nonce;

    return res.data;
  },
  // 用戶確認付款後交易狀態完成
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
