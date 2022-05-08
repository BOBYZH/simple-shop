const mariaDBConfig = require('../config/mariaDB.js'); // 直接使用SQL語法操作資料庫
const SQL = require('sql-template-strings'); // 讓ES6模板字串防止 sql 注入
const pool = mariaDBConfig();
let conn;

const bcrypt = require('bcryptjs'); // 產生不可逆的密碼雜湊用

const memberController = {
  signUpPage: (req, res) => {
    // 有會員名稱(登入狀態)時轉到首頁(不須註冊)
    if (req.session.userName) {
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

        await req.flash('successMessages', '成功註冊');
        res.redirect('/signin');
      }
    } catch (err) {
      await req.flash('errorMessages', '系統錯誤！');
      throw err;
      res.redirect('back');
    } finally {
      if (conn) conn.release();
    }
  },

  signInPage: (req, res) => {
    // 有會員名稱(登入狀態)時轉到首頁(不須登入)
    if (req.session.userName) {
      res.redirect('/');
    } else {
      res.render('signIn');
    }
  },

  signIn: async (req, res) => {
    conn = await pool.getConnection();
    try {
      const users = await conn.query('SELECT email, password FROM member;');

      const searchedResult = users.find(
        (user) =>
          user.email === req.body.email &&
          bcrypt.compareSync(req.body.password, user.password)
      );

      // 沒有找到對應的帳號與密碼組合
      if (searchedResult === undefined) {
        await req.flash('errorMessages', '帳號或密碼輸入錯誤');
        res.redirect('back');
      } else {
        const userName = searchedResult.email.split('@')[0]; // 產生在標題列顯示的帳號名稱
        // 將會員資料存入session，建立登入狀態
        req.session.userName = await userName;
        req.session.user = await searchedResult;
        
        res.redirect('back');
      }
    } catch (err) {
      await req.flash('errorMessages', '系統錯誤！');
      throw err;
      res.redirect('back');
    } finally {
      if (conn) conn.release();
    }
  },

  logout: async (req, res) => {
    await req.session.destroy(); // 取消session的登入狀態
    res.redirect('/');
  }
};

module.exports = memberController;
