const mariaDBConfig = require('../config/mariaDB.js');
const SQL = require('sql-template-strings');
const pool = mariaDBConfig();
let conn;

const cartController = {
  getCart: async (req, res) => {
    try {
      conn = await pool.getConnection();

      /* 列出使用者購物車與其中挑選項目 */
      let cart = await conn.query(
        // 列出對應使用者當前session儲存cartId的特定購物車
        SQL`SELECT * FROM cart_main WHERE id = ${req.session.cartId || 0};` // 找不到購物車的話，定義cartId為0回傳空物件
      );
      // 以SQL (INNER )JOIN 查詢購物車項目與對應的商品資料，二表中名稱重複部分則將商品的改名以辨別
      const items = await conn.query(
        SQL`SELECT cart_sub.*, product.id as prodId, product.imgUrl, product.prodName, product.price, product.quantity as prodStock FROM product 
          JOIN cart_sub ON product.id = cart_sub.ProductId
          WHERE CartId = ${req.session.cartId || 0};`
      );

      cart.items = items; // 將購物車項目插入購物車，以便後續在EJS渲染時讀取
      cart = cart || { items: [] }; // 找不到購物車的話，回傳空的內容(代表沒加入購物車項目時，購物車是空的)

      // console.log('cart with items', cart)

      /* 定義購物車所有項目的價格加總 */
      const totalPrice =
        cart.items.length > 0
          ? cart.items.map((d) => d.price * d.quantity).reduce((a, b) => a + b)
          : 0;

      return res.render('cart', { cart, totalPrice });
    } catch (err) {
      await req.flash('errorMessages', '系統錯誤！');
      res.redirect('back');
      throw err;
    } finally {
      if (conn) conn.release();
    }
  },

  postCart: async (req, res) => {
    // 使用或新增購物車與選購項目
    try {
      let cart;
      conn = await pool.getConnection();

      /* 模擬sequelize的findOrCreate：找尋是否已有使用者對應的購物車，有的話使用它，沒有的話新增一個給使用者 */
      cart = await conn.query(
        SQL`SELECT * FROM cart_main WHERE id = ${req.session.cartId || 0};` // 找不到購物車的話，定義cartId為0回傳空物件
      );

      if (cart.length === 0) {
        // 使用者沒有購物車時，補產生之
        const query = await conn.query('INSERT INTO cart_main () VALUES ();');
        cart = await conn.query(
          // 重新選取補產生的購物車
          SQL`SELECT * FROM cart_main WHERE id = ${query.insertId};`
        );
      }
      cart = cart[0]; // 由於只有一個購物車，需去掉外層陣列以便後續controller/views操作

      /* 同樣模擬sequelize的findOrCreate，找尋是否已有對應的購物車項目 */
      let cartItem = await conn.query(
        // JOIN查詢購物車項目與對應的商品資料
        SQL`SELECT cart_sub.*, product.id as prodId, product.imgUrl, product.prodName, product.price, 
          product.quantity as prodStock FROM product 
          JOIN cart_sub ON product.id = cart_sub.ProductId
          WHERE cartId = ${cart.id} and ProductId = ${req.body.productId};`
      );

      if (cartItem.length === 0) {
        // 沒有時補產生
        await conn.query(
          `INSERT INTO cart_sub (quantity, CartId, ProductId) VALUES (0, ${cart.id}, ${req.body.productId});`
        );
        cartItem = await conn.query(
          // 重新JOIN查詢購物車項目與商品
          SQL`SELECT cart_sub.*, product.id as prodId, product.imgUrl, product.prodName, product.price, 
          product.quantity as prodStock FROM product 
          JOIN cart_sub ON product.id = cart_sub.ProductId
          WHERE cartId = ${cart.id} and ProductId = ${req.body.productId};`
        );
      }
      cartItem = cartItem[0]; // 由於隨購物車新增的項目只有一個，也去陣列以便後續操作

      if (cartItem.quantity >= cartItem.prodStock) {
        await req.flash('errorMessages', '挑選數量不得超過庫存量！');
        return res.redirect('back');
      } else {
        await conn.query(
          `UPDATE cart_sub SET quantity = ${
            cartItem.quantity + Number(req.body.quantity)
          } WHERE cartId = ${cart.id} and ProductId = ${req.body.productId};`
        );
        await req.flash('successMessages', '已成功將商品加入購物車 ！');

        /* 將cartId存到session，以便切換頁面後仍使用相同購物車 */
        req.session.cartId = cart.id;
        return req.session.save(() => {
          return res.redirect('back');
        });
      }
    } catch (err) {
      await req.flash('errorMessages', '系統錯誤！');
      res.redirect('back');
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }

};

module.exports = cartController;
