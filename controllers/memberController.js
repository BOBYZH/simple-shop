const mariaDBConfig = require('../config/mariaDB.js');
const SQL = require('sql-template-strings'); // 讓ES6模板字串防止 sql 注入

const bcrypt = require('bcryptjs');

const memberController = {
  signUpPage: (req, res) => {
    if (req.session.userName) { // 有會員名稱(登入狀態)時轉到首頁(不須註冊)
      res.redirect('/');
    } else {
      res.render('signUp');
    }
  },

  signUp: async (req, res) => {
    if (req.body.password !== req.body.password2) {
      await req.flash('errorMessages', '密碼輸入不相同');
      return res.redirect('back');
    }

    // 直接使用SQL語法操作資料庫
    const pool = mariaDBConfig();
    let conn;
    try {
      conn = await pool.getConnection();

      const findEmail = await conn.query(
        SQL`SELECT email FROM member WHERE email = ${req.body.email};`
      );

      if (findEmail[0]) {
        await req.flash('errorMessages', '信箱已註冊帳號');
        return res.redirect('back');
      } else {
        const email = req.body.email;
        const password = bcrypt.hashSync(req.body.password, 10);

        await conn.query(
          SQL`INSERT INTO member (email, password) VALUES (${email}, ${password});`
        );
      }
      if (conn) {
        conn.release();
        await await req.flash('successMessages', '成功註冊');
        res.redirect('/signin');
      }
    } catch (err) {
      throw err;
    }
  },

  signInPage: (req, res) => {
    if (req.session.userName) { // 有會員名稱(登入狀態)時轉到首頁(不須登入)
      res.redirect('/');
    } else {
      res.render('signIn');
    }
  },

  signIn: async (req, res) => {
    const pool = mariaDBConfig();
    let conn;
    try {
      conn = await pool.getConnection();

      const users = await conn.query('SELECT email, password FROM member;');

      const searchResult = users.find(
        (user) =>
          user.email === req.body.email &&
          bcrypt.compareSync(req.body.password, user.password)
      );

      if (searchResult === undefined) { // 沒有找到對應的帳號與密碼組合
        await req.flash('errorMessages', '帳號或密碼輸入錯誤');
        return res.redirect('back');
      } else {
        const userName = searchResult.email.split('@')[0];
        req.session.userName = userName; // 將會員名稱存入session，建立登入狀態
      }
      if (conn) {
        conn.release();
        res.redirect('/');
      }
    } catch (err) {
      throw err;
    }
  },

  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/');
  }
};

module.exports = memberController;
