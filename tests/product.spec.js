const { describe, it, before, after } = require('mocha');
const chai = require('chai');
chai.should();

const request = require('supertest');

const app = require('../app');

const mariaDBConfig = require('../config/mariaDB.js');
const pool = mariaDBConfig();
const connection = require('../config/connection.js');
let conn;

describe('# 商品頁面', () => {
  before(async () => {
    conn = await connection(pool);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  });

  describe('## 避免出現無效頁面', () => {
    it('將無效的路由導回首頁', (done) => {
      request(app)
        .get('/:illegalUrl') // 代表未定義的路由
        .set('Accept', 'application/json')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          res.headers.location.should.equal('/');
          return done();
        });
    });
  });

  describe('## 顯示所有商品', () => {
    describe('(先測沒有上架商品時的首頁)', () => {
      it('### 提示：目前尚未有商品上架', (done) => {
        request(app)
          .get('/products')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            res.text.should.include('新顧客');
            res.text.should.include('目前尚未有商品上架');
            return done();
          });
      });
    });

    describe('(再測有上架商品時的首頁)', () => {
      before(async () => {
        // 補上測試用的商品
        // 測試用商品：有庫存
        await conn.query(
          `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/8/87/Pok%C3%A9_Ball.png', 
        '精靈球', '用於投向野生寶可夢並將其捕捉的球。它是膠囊樣式的。', 200, 600);
        `
        );
        // 測試用商品：無庫存
        await conn.query(
          `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/e/ee/Master_Ball.png', 
        '大師球', '性能最好的球。必定能捉到野生寶可夢。', 120000, 0);
        `
        );
      });

      it('### 從根目錄導向商品總覽頁', (done) => {
        request(app)
          .get('/')
          .expect(302)
          .end((err, res) => {
            if (err) return done(err);
            res.headers.location.should.equal('/products');
            return done();
          });
      });

      it('### 進入商品總覽', (done) => {
        request(app)
          .get('/products')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            res.text.should.include('歡迎光臨');
            res.text.should.include('精靈球');
            res.text.should.include('大師球');
            return done();
          });
      });
    });
  });

  describe('## 個別商品介紹', () => {
    it('### 進入存在的商品頁面', (done) => {
      request(app)
        .get('/products/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.include('商品說明：');
          res.text.should.include('精靈球');
          return done();
        });
    });

    it('### 從庫存售完的商品頁面轉回首頁', (done) => {
      request(app)
        .get('/products/2')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          res.headers.location.should.equal('/');
          return done();
        });
    });

    it('### 從不存在的商品頁面轉回首頁', (done) => {
      request(app)
        .get('/products/3')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          res.headers.location.should.equal('/');
          return done();
        });
    });
  });

  after(async () => {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    await conn.end();
  });
});
