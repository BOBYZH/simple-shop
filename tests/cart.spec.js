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
let conn;

describe('# 購物車頁面', () => {
  before(async () => {
    conn = await pool.getConnection();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('TRUNCATE TABLE `cart_main`;');
    await conn.query('TRUNCATE TABLE `cart_sub`;');
  });

  describe('## GET /cart', () => {
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
  });

  describe('## POST /cart', () => {
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

  describe('## PATCH /cartItem/:id/add', () => {
    before(async () => {
      // 測試用的他人購物車與項目
      await conn.query('INSERT INTO cart_main (id) VALUES (2);');
      await conn.query(
        SQL`INSERT INTO cart_sub (cartId, ProductId, quantity) VALUES (${2}, ${1}, ${3});`
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

  describe('## PATCH /cartItem/:id/sub', () => {
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

  describe('## DELETE /cartItem/:id', () => {
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
          // cartItems因cartItem被刪除內容為空，新插入的內容必然在陣列的第一個
          cartItems.push('none');
          cartItems[0].should.be.equal('none');
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
    await conn.release();
  });
});
