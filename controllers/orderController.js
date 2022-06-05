const mariaDBConfig = require('../config/mariaDB.js');
const SQL = require('sql-template-strings');
const pool = mariaDBConfig();
let conn;

const linePayApis = require('../config/linePayApis.js');

/* 使用dayjs套件處理時間格式 */

const dayjs = require('dayjs');

// 開啟時區切換功能
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// 開啟相對時間功能
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

// 以台灣中文格式顯示時間
require('dayjs/locale/zh-tw');
dayjs.locale('zh-tw');

const orderController = {
  getOrders: async (req, res) => {
    if (!req.session.user) {
      await req.flash('errorMessages', '需登入才能查看訂單！！');
      return res.redirect('back');
    } else {
      try {
        conn = await pool.getConnection();

        /* 示範以AES對訂購者姓名、電話號碼、地址等個資加解密，並將加密金鑰存在環境變數，以及從16進位還原否則產生錯誤 */
        let orders = await conn.query(
          SQL`SELECT id, UserId, 
          AES_DECRYPT(UNHEX(name), ${process.env.AES_KEY}) as name, 
          AES_DECRYPT(UNHEX(phone), ${process.env.AES_KEY}) as phone,
          AES_DECRYPT(UNHEX(address), ${process.env.AES_KEY}) as address, 
          amount, status, sn, createdAt 
          FROM order_main WHERE UserId = ${req.session.user.id};`
        );

        for (let i = 0; i < orders.length; i++) {
          // 依訂單項目數量選取對應的資料，由於與商品JOIN欄位名稱會重複，將商品資料重新命名
          const orderItems = await conn.query(
            SQL`SELECT order_sub.*, product.id as prodId, product.imgUrl, 
            product.prodName as originalProdName, product.price as originalPrice, product.quantity as prodStock 
            FROM product 
            JOIN order_sub ON product.id = order_sub.ProductId
            WHERE OrderId = ${orders[i].id};`
          );
          orders[i].items = orderItems;
        }

        orders = orders.sort((a, b) => b.createdAt - a.createdAt); // 使最新的訂單在上面

        return res.render('order', { orders, dayjs }); // 使EJS能使用dayjs顯示日期時間
      } catch (err) {
        await req.flash('errorMessages', '系統錯誤！');
        res.redirect('back');
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }
  },

  postOrder: async (req, res) => {
    if (!req.session.user) {
      await req.flash('errorMessages', '需登入才能送出訂單！！');
      return res.redirect('back');
    } else {
      try {
        conn = await pool.getConnection();

        let cart = await conn.query(
          SQL`SELECT * FROM cart_main WHERE id = ${req.session.cartId};`
        );
        cart = cart[0]; // 單項去陣列

        // 讀取購物車項目資訊，並與商品資訊JOIN(後者並重新命名)
        const items = await conn.query(
          SQL`SELECT cart_sub.*, product.id as prodId, product.imgUrl, product.prodName, product.price, product.quantity as prodStock FROM product 
                JOIN cart_sub ON product.id = cart_sub.ProductId
                WHERE CartId = ${req.session.cartId};`
        );

        cart.items = items; // 將購物車項目插入購物車以便後續操作與EJS渲染

        // 依表單回傳建立訂單，其中姓名、電話與地址以AES加密儲存，避免客戶資料直接洩露
        const query = await conn.query(
          SQL`INSERT INTO order_main (UserId, name, address, phone, status, amount) 
                  VALUES (${req.session.user.id}, 
                  HEX(AES_ENCRYPT(${req.body.name},  ${process.env.AES_KEY})),
                  HEX(AES_ENCRYPT(${req.body.address},  ${process.env.AES_KEY})),
                  HEX(AES_ENCRYPT(${req.body.phone}, ${process.env.AES_KEY})), 
                  ${req.body.status}, ${req.body.amount});`
        );

        // 讀取新增的訂單資訊
        let order = await conn.query(
          SQL`SELECT * FROM order_main WHERE id = ${query.insertId};`
        );
        order = order[0];

        // 依訂單與購物車項目數量用迴圈操作，插入對應的訂單項目資料
        for (let i = 0; i < cart.items.length; i++) {
          await conn.query(
            SQL`INSERT INTO order_sub (OrderId, ProductId, prodName, price, quantity) 
                    VALUES (${order.id}, ${cart.items[i].prodId}, ${cart.items[i].prodName}, ${cart.items[i].price}, ${cart.items[i].quantity});`
          );

          // 依定單項數量刪減商品庫存，代表商品已被預訂不能再被選購
          await conn.query(
            SQL`UPDATE product SET quantity = ${
              Number(cart.items[i].prodStock) - Number(cart.items[i].quantity)
            } WHERE id = ${cart.items[i].prodId};`
          );
        }

        /* 打LINE PAY API 產生付款連結 */
        const amount = parseInt(req.body.amount); // 將金額從字串轉為整數
        const linePayRespond = await linePayApis.postRequest(
          amount,
          order.id,
          cart.items
        );
        console.log('LinePayRequestRes: ', linePayRespond);

        /* 註：訂單編號在訂單產生後即固定，但同一張訂單的交易序號會在每次交易執行時變動(無論交易成功與否) */
        const sn = linePayRespond.sn; // 取得訂單編號
        const paymentUrl = linePayRespond.info.paymentUrl.web; // 取得付款連結

        /* 清空當前購物車，代表已訂購而非挑選階段 */
        await conn.query(
          SQL`DELETE FROM cart_sub WHERE CartId = ${cart.id};`
        );
        await conn.query(SQL`DELETE FROM cart_main WHERE id = ${cart.id};`);

        await conn.query(
          SQL`UPDATE order_main SET sn = ${sn}, paymentUrl = ${paymentUrl} WHERE id = ${order.id};`
        );

        // 轉到付款頁面
        await req.flash('successMessages', '訂單已建立，請前往付款！');
        return res.redirect(`/order/${order.id}/payment`);
      } catch (err) {
        await req.flash('errorMessages', '系統錯誤！');
        res.redirect('back');
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }
  },

  getPayment: async (req, res) => {
    if (!req.session.user) {
      await req.flash('errorMessages', '需登入才能進入付款頁面！！');
      return res.redirect('back');
    } else {
      try {
        conn = await pool.getConnection();

        let order = await conn.query(
          SQL`SELECT * FROM order_main WHERE id = ${req.params.id};`
        );
        order = order[0];

        if (order.UserId !== req.session.user.id) {
          // 防止對他人的訂單擅自操作
          await req.flash('errorMessages', '只能替自己的訂單付款！');
          res.redirect('/orders');
          // '0'表示未付款，'1'為已付款，'-1'為取消，後二者不需付款
        } else if (order.status !== '0') {
          await req.flash('errorMessages', '此訂單已付清或取消，不開放付款！');
          res.redirect('/orders');
        } else {
          const tradeInfo = {
            // 模擬金流服務提供的交易資訊
            tradeLink: order.paymentUrl,
            orderAmount: order.amount,
            shopName: process.env.WEB_TITLE,
            productCategoryName: process.env.WEB_PRODUCT_CATEGORY,
            sn: order.sn
          };

          res.render('payment', { tradeInfo });
        }
      } catch (err) {
        await req.flash('errorMessages', '系統錯誤！');
        res.redirect('back');
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }
  },

  cancelOrder: async (req, res) => {
    if (!req.session.user) {
      await req.flash('errorMessages', '需登入才能取消訂單！');
      return res.redirect('back');
    } else {
      try {
        conn = await pool.getConnection();

        let order = await conn.query(
          SQL`SELECT * FROM order_main WHERE id = ${req.params.id};`
        );
        order = order[0];

        if (order.UserId !== req.session.user.id) {
          // 防止對他人的訂單擅自操作
          await req.flash('errorMessages', '只能取消自己的訂單！');
          return res.redirect('/orders');
        } else {
          await conn.query(
            SQL`UPDATE order_main SET status = '-1' WHERE id = ${req.params.id};`
          );

          return res.redirect('back');
        }
      } catch (err) {
        await req.flash('errorMessages', '系統錯誤！');
        res.redirect('back');
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }
  },

  confirmPayment: async (req, res) => {
    if (!req.session.user) {
      await req.flash('errorMessages', '需登入才能取消訂單！');
      return res.redirect('back');
    } else {
      try {
        const transactionId = req.query.transactionId;
        const orderId = req.query.orderId;

        conn = await pool.getConnection();
        let order = await conn.query(
          SQL`SELECT UserId, amount FROM order_main WHERE sn = ${orderId};`
        );
        order = order[0];

        if (order.UserId !== req.session.user.id) {
          // 防止對他人的訂單擅自操作
          await req.flash('errorMessages', '只能確認自己的訂單！');
          return res.redirect('/orders');
        } else {
          /* 打LINE PAY API 確認付款成功 */
          const linePayRespond = await linePayApis.postConfirm(
            order.amount,
            transactionId
          );
          console.log('LinePayConfirmRes: ', linePayRespond);

          if (linePayRespond.returnCode === '0000') {
            await req.flash('successMessages', '付款成功！');
            // 更新訂單狀態為已付款
            await conn.query(
              SQL`UPDATE order_main SET status = '1' WHERE sn = ${orderId};`
            );
            return res.redirect('/orders');
          } else {
            await req.flash('errorMessages', '付款失敗，請重新嘗試！');
            return res.redirect('back');
          }
        }
      } catch (err) {
        await req.flash('errorMessages', '系統錯誤！');
        res.redirect('back');
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }
  }
};

module.exports = orderController;
