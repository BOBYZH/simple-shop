const { describe, it, before, after } = require('mocha');
const request = require('supertest');
/* 每個測試項目間的cookie似乎是獨立的，
因此沒辦法直接將上一個項目產生的session，直接在下一個項目使用，
於是另外設置一個變數儲存cookie內容
參考：https://stackoverflow.com/questions/39118250/accessing-req-session-object-when-writing-tests-that-use-supertest */
let cookies;

const app = require('../app');

const SQL = require('sql-template-strings');
const mariaDBConfig = require('../config/mariaDB.js');
const pool = mariaDBConfig();
const connection = require('../config/connection.js');
let conn;

describe('# 購物車頁面', () => {
  before(async () => {
    conn = await connection(pool);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('TRUNCATE TABLE `cart_main`;');
    await conn.query('TRUNCATE TABLE `cart_sub`;');
  });

  describe('## 查看購物車', () => {
    it('### 預設顯示無項目的購物車頁面', (done) => {
      request(app)
        .get('/cart')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.include('您還沒有加入商品到購物車中');
          return done();
        });
    });

    it('### 新增超出庫存數量時導回且不新增購物車項目', (done) => {
      request(app)
        .post('/cart')
        .send({
          productId: 1,
          quantity: 601
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const carts = await conn.query('SELECT * FROM cart_main;');
          let cartItem = await conn.query(
            SQL`SELECT * FROM cart_sub WHERE cartId = ${carts[0].id};`
          );
          cartItem = JSON.parse(JSON.stringify(cartItem));
          cartItem.length.should.be.equal(0);

          return done();
        });
    });

    after(async () => { // 測試超買庫存後清除資料，避免影響後面測試
      await conn.query('TRUNCATE TABLE `cart_main`;');
      await conn.query('TRUNCATE TABLE `cart_sub`;');
    });
  });

  describe('## 新增購物車', () => {
    before(async () => {
      // 測試用商品
      await conn.query(
        `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/8/87/Pok%C3%A9_Ball.png', 
        '精靈球', '用於投向野生寶可夢並將其捕捉的球。它是膠囊樣式的。', 200, 600);
        `
      );
    });

    it('### 新增商品項目與購物車', (done) => {
      request(app)
        .post('/cart')
        .send({
          productId: 1,
          quantity: 1
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const carts = await conn.query('SELECT * FROM cart_main;');
          const cartItem = await conn.query(
            SQL`SELECT * FROM cart_sub WHERE cartId = ${carts[0].id};`
          );
          cartItem[0].ProductId.should.be.equal(1);
          cartItem[0].quantity.should.be.equal(1);
          // 記錄使用cookie的session，以在下一個項目使用
          cookies = res.headers['set-cookie'].pop().split(';')[0];

          return done();
        });
    });
  });

  describe('## 增加購買數量', () => {
    before(async () => {
      // 測試用的他人購物車與項目
      await conn.query('INSERT INTO cart_main (id) VALUES (2);');
      await conn.query(
        'INSERT INTO cart_sub (cartId, ProductId, quantity) VALUES (2, 1, 3);'
      );
    });

    it('### 增加1個商品項目數量', (done) => {
      request(app)
        .patch('/cartItem/1/add')
        .set('Accept', 'application/json')
        // 將上一個測試項目產生的cookie-based session以變數設置
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const cartItem = await conn.query(
            'SELECT * FROM cart_sub WHERE cartId = 1;'
          );
          cartItem[0].quantity.should.be.equal(2);
          cookies = res.headers['set-cookie'].pop().split(';')[0];
          return done();
        });
    });

    it('### 想操作他人購物車時導回頁面', (done) => {
      request(app)
        .patch('/cartItem/2/add')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const cartItem = await conn.query(
            'SELECT * FROM cart_sub WHERE cartId = 2;'
          );
          // 沒有被+1改成4
          cartItem[0].quantity.should.not.be.equal(4);
          cartItem[0].quantity.should.be.equal(3);
          res.headers.location.should.be.equal('/cart');
          return done();
        });
    });
  });

  describe('## 減少購買數量', () => {
    it('### 減少1個商品項目數量', (done) => {
      request(app)
        .patch('/cartItem/1/sub')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const cartItem = await conn.query(
            'SELECT * FROM cart_sub WHERE cartId = 1;'
          );
          cartItem[0].quantity.should.be.equal(1);
          cookies = res.headers['set-cookie'].pop().split(';')[0];
          return done();
        });
    });

    it('### 想操作他人購物車時導回頁面', (done) => {
      request(app)
        .patch('/cartItem/2/sub')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const cartItem = await conn.query(
            'SELECT * FROM cart_sub WHERE cartId = 2;'
          );
          // 沒有被-1改成2
          cartItem[0].quantity.should.not.be.equal(2);
          cartItem[0].quantity.should.be.equal(3);
          res.headers.location.should.be.equal('/cart');
          return done();
        });
    });
  });

  describe('## 取消購買的商品', () => {
    before(async () => {
      // 建立另一個購物車項目，以便測試總金額計算
      await conn.query(
      `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/4/45/Great_Ball.png', 
        '超級球', '性能還算不錯的球。比起精靈球更容易捉到寶可夢。', 600, 200);
        `
      );
      await conn.query(
        'INSERT INTO cart_sub (cartId, ProductId, quantity) VALUES (1, 2, 1);'
      );
    });

    it('### 先顯示已有商品的購物車頁面', (done) => {
      request(app)
        .get('/cart')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.include('總金額： NT$ 800'); // 200+600=800
          return done();
        });
    });

    it('### 從購物車刪除商品項目', (done) => {
      request(app)
        .delete('/cartItem/1')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          let cartItems = await conn.query(
            'SELECT * FROM cart_sub WHERE cartId = 1;'
          );
          // 轉成可操作的空陣列
          cartItems = JSON.parse(JSON.stringify(cartItems));
          // 刪除後購物車項目陣列長度為1
          cartItems.length.should.be.equal(1);
          return done();
        });
    });

    it('### 想操作他人購物車時導回頁面', (done) => {
      request(app)
        .delete('/cartItem/2')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const cartItem = await conn.query(
            'SELECT * FROM cart_sub WHERE cartId = 2;'
          );
          cartItem[0].quantity.should.be.equal(3); // 數量正確代表沒被刪掉
          res.headers.location.should.be.equal('/cart');
          return done();
        });
    });
  });

  after(async () => {
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('TRUNCATE TABLE `cart_main`;');
    await conn.query('TRUNCATE TABLE `cart_sub`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    await conn.end();
  });
});
