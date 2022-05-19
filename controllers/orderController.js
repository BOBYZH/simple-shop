const mariaDBConfig = require('../config/mariaDB.js');
const SQL = require('sql-template-strings');
const pool = mariaDBConfig();
let conn;

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

        let orders = await conn.query(
          SQL`SELECT * FROM order_main WHERE UserId = ${req.session.user.id};`
        );

        for (let i = 0; i < orders.length; i++) {
          const orderItems = await conn.query(
            SQL`SELECT order_sub.*, product.id as prodId, product.imgUrl, product.prodName as originalProdName, product.price as originalPrice, product.quantity as prodStock FROM product 
              JOIN order_sub ON product.id = order_sub.ProductId
              WHERE OrderId = ${orders[i].id};`
          );
          orders[i].items = orderItems;
        }

        orders = orders.sort((a, b) => b.createdAt - a.createdAt); // 使最新的訂單在上面

        return res.render('order', { orders, dayjs });
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
        cart = cart[0];

        const items = await conn.query(
          SQL`SELECT cart_sub.*, product.id as prodId, product.imgUrl, product.prodName, product.price, product.quantity as prodStock FROM product 
                JOIN cart_sub ON product.id = cart_sub.ProductId
                WHERE CartId = ${req.session.cartId};`
        );

        cart.items = items;

        const query = await conn.query(
          SQL`INSERT INTO order_main (UserId, name, address, phone, status, amount) 
                VALUES (${req.session.user.id}, ${req.body.name}, ${req.body.address}, ${req.body.phone}, ${req.body.status}, ${req.body.amount});`
        );

        let order = await conn.query(
          SQL`SELECT * FROM order_main WHERE id = ${query.insertId};`
        );
        order = order[0];

        for (let i = 0; i < cart.items.length; i++) {
          await conn.query(
            SQL`INSERT INTO order_sub (OrderId, ProductId, prodName, price, quantity) 
                    VALUES (${order.id}, ${cart.items[i].prodId}, ${cart.items[i].prodName}, ${cart.items[i].price}, ${cart.items[i].quantity});`
          );

          await conn.query(
            SQL`UPDATE product SET quantity = ${
              Number(cart.items[i].prodStock) - Number(cart.items[i].quantity)
            } WHERE id = ${cart.items[i].prodId};`
          );
        }

        await conn.query(SQL`DELETE FROM cart_sub WHERE CartId = ${cart.id};`);

        await conn.query(SQL`DELETE FROM cart_main WHERE id = ${cart.id};`);

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
        } else if (order.status !== '0') {
          await req.flash('errorMessages', '此訂單已付清或取消，不開放付款！');
          res.redirect('/orders');
        } else {
          const tradeInfo = {
            // 模擬金流服務提供的交易資訊
            tradeLink: 'https://pay.line.me/portal/tw/main',
            orderAmount: order.amount,
            // 模擬有效期限為七天
            expiryDate:
              dayjs(order.createdAt)
                .add(7, 'day')
                .tz('Asia/Taipei')
                .format('YYYY-MM-DD (dddd)') + ' 23:59:59',

            shopName: process.env.WEB_TITLE,
            productCategoryName: process.env.WEB_PRODUCT_CATEGORY,
            sn: 'test!@#$%^'
          };

          await conn.query(
            SQL`UPDATE order_main SET sn = ${tradeInfo.sn} WHERE id = ${req.params.id};`
          );

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
  }
};

module.exports = orderController;
