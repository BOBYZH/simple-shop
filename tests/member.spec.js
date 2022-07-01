const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const chai = require('chai');
chai.should(); // 包含include語法

const request = require('supertest');

let cookies;

const app = require('../app');

const mariaDBConfig = require('../config/mariaDB.js');
const pool = mariaDBConfig();
const connection = require('../config/connection.js');
let conn;

describe('# 會員系統', () => {
  before(async () => {
    conn = await connection(pool);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  });

  describe('## 註冊', () => {
    it('### 進入註冊頁面', (done) => {
      request(app)
        .get('/signup')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.include('註冊');
          return done();
        });
    });
  });

  describe('## 註冊會員資料', () => {
    it('### 密碼輸入不相同時導回', (done) => {
      request(app)
        .post('/signup')
        .send({
          email: 'member@email.com',
          password: 'password',
          password2: 'password2'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          let member = await conn.query('SELECT email FROM member;');
          // 沒有新增會員
          member = JSON.parse(JSON.stringify(member));
          member.length.should.equal(0);
          return done();
        });
    });
    it('### 密碼為空時導回', (done) => {
      request(app)
        .post('/signup')
        .send({
          email: 'member@email.com',
          password: '',
          password2: ''
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          let member = await conn.query('SELECT email FROM member;');
          // 沒有新增會員
          member = JSON.parse(JSON.stringify(member));
          member.length.should.equal(0);
          return done();
        });
    });

    it('### 成功註冊', (done) => {
      request(app)
        .post('/signup')
        .send({
          email: 'member@email.com',
          password: 'password',
          password2: 'password'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const member = await conn.query('SELECT email FROM member;');
          expect(member[0].email).to.equal('member@email.com');
          expect(res.header.location).to.equal('/signin');
          return done();
        });
    });

    it('### 信箱已註冊帳號時導回', (done) => {
      request(app)
        .post('/signup')
        .send({
          email: 'member@email.com',
          password: 'password',
          password2: 'password'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          let member = await conn.query('SELECT email FROM member;');
          member = JSON.parse(JSON.stringify(member));
          member.length.should.equal(1); // 仍只有一筆會員資料
          return done();
        });
    });
  });

  describe('## 登入', () => {
    it('### 進入登入頁面', (done) => {
      request(app)
        .get('/signin')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.include('登入');
          return done();
        });
    });
  });

  describe('## 登入建立session', () => {
    it('### 成功登入', (done) => {
      request(app)
        .post('/signin')
        .send({
          email: 'member@email.com',
          password: 'password',
          password2: 'password'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          expect(res.header.location).to.equal('/');
          cookies = res.header['set-cookie'];
          return done();
        });
    });

    it('### 登入後註冊連結導向根目錄', (done) => {
      request(app)
        .get('/signup')
        .set('Cookie', cookies)
        .set('Accept', 'application/json')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          res.header.location.should.equal('/');
          return done();
        });
    });

    it('### 登入後登入連結也導向根目錄', (done) => {
      request(app)
        .get('/signin')
        .set('Cookie', cookies)
        .set('Accept', 'application/json')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          res.header.location.should.equal('/');
          return done();
        });
    });
  });

  describe('## 登出', () => {
    it('### 成功登出', (done) => {
      request(app)
        .post('/logout')
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          expect(res.header.location).to.equal('/');
          return done();
        });
    });
  });

  after(async () => {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    await conn.release();
  });
});
