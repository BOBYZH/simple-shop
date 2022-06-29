const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const chai = require('chai');
chai.should(); // 包含include語法

const request = require('supertest');

const app = require('../app');

const mariaDBConfig = require('../config/mariaDB.js');
const pool = mariaDBConfig();
let conn;

describe('# 會員系統', () => {
  before(async () => {
    conn = await pool.getConnection();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  });

  describe('## GET /signup', () => {
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

  describe('## POST /signup', () => {
    it('### 成功註冊', (done) => {
      request(app)
        .post('/signup')
        .send({
          email: 'user@email.com',
          password: 'password',
          password2: 'password'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const member = await conn.query('SELECT email FROM member;');
          expect(member[0].email).to.equal('user@email.com');
          expect(res.header.location).to.equal('/signin');
          return done();
        });
    });
  });

  describe('## GET /signin', () => {
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

  describe('## POST /signin', () => {
    it('### 成功登入', (done) => {
      request(app)
        .post('/signin')
        .send({
          email: 'user@email.com',
          password: 'password',
          password2: 'password'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          expect(res.header.location).to.equal('/');
          return done();
        });
    });
  });

  describe('## POST /logout', () => {
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
