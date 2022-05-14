const mariaDBConfig = require('../config/mariaDB.js');
const SQL = require('sql-template-strings');
const pool = mariaDBConfig();
let conn;

const productController = {
  getProducts: async (req, res) => {
    conn = await pool.getConnection();
    try {
      const products = await conn.query('SELECT * FROM product;');
      res.render('index', { products });
    } catch (err) {
      await req.flash('errorMessages', '系統錯誤！');
      res.redirect('back');
      throw err;
    } finally {
      if (conn) conn.release();
    }
  },

  getProduct: async (req, res) => {
    conn = await pool.getConnection();
    try {
      const showProducts = await conn.query(
        SQL`SELECT * FROM product WHERE id = ${req.params.id};`
      );
      const product = showProducts[0]; // 單項去陣列，以便後續操作與EJS渲染

      // 避免無庫存仍可進入下單
      if (product.quantity === 0) {
        await req.flash('errorMessages', '產品已經售完！');
        return res.redirect('back');
      } else {
        res.render('product', { product });
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

module.exports = productController;
