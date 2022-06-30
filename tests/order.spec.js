const { describe, it, before, after } = require('mocha');
const request = require('supertest');
const sinon = require('sinon');
/* 另設一個變數儲存cookie內容，以在不同測試項目使用
參考：https://stackoverflow.com/questions/39118250/accessing-req-session-object-when-writing-tests-that-use-supertest */
let cookies;

const app = require('../app');

const bcrypt = require('bcryptjs');

const SQL = require('sql-template-strings');
const mariaDBConfig = require('../config/mariaDB.js');
const pool = mariaDBConfig();
let conn;

describe('# 訂單相關頁面', () => {
  before(async () => {
    conn = await pool.getConnection();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('TRUNCATE TABLE `cart_main`;');
    await conn.query('TRUNCATE TABLE `cart_sub`;');
    await conn.query('TRUNCATE TABLE `order_main`;');
    await conn.query('TRUNCATE TABLE `order_sub`;');

    // 建立2個測試用會員帳號
    await conn.query(
      `
        INSERT INTO member (email, password) VALUES ('member@email.com', '${bcrypt.hashSync(
          'password',
          bcrypt.genSaltSync(10),
          null
        )}');
        `
    );
    await conn.query(
      SQL`
        INSERT INTO member (email, password) VALUES ('anotherMember@email.com', '${bcrypt.hashSync(
          'password',
          bcrypt.genSaltSync(10),
          null
        )}');
        `
    );
  });

  describe('## 先取得cookie-based session', () => {
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

    it('(登入取得req.session.member)', (done) => {
      request(app)
        .post('/signin')
        .send({
          email: 'member@email.com',
          password: 'password',
          password2: 'password'
        })
        .set('Accept', 'application/json')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          cookies = res.headers['set-cookie'].pop().split(';')[0];
          done();
        });
    });

    it('(建立購物車取得req.session.cartId)', (done) => {
      request(app)
        .post('/cart')
        .send({
          productId: 1,
          quantity: 2
        })
        .set('Accept', 'application/json')
        .set('Cookie', cookies)
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          cookies = res.headers['set-cookie'].pop().split(';')[0];
          done();
        });
    });
  });

  describe('## GET /orders', () => {
    it('### 預設顯示無項目的訂單頁面', (done) => {
      request(app)
        .get('/orders')
        .set('Accept', 'application/json')
        // 將上一個測試項目產生的cookie-based session以變數設置
        .set('Cookie', [cookies])
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.include('你還沒有訂單資料');
          return done();
        });
    });
  });

  describe('## POST /order', () => {
    before(async () => {
      // 模擬LinePay API回傳的訂單資料，替代實際打API的動作
      this.linePayRespond = sinon
        .stub(require('../config/linePayApis'), 'postRequest')
        .returns({
          // 某次實際API回傳的
          returnCode: '0000',
          returnMessage: 'Success.',
          info: {
            paymentUrl: {
              web: 'https://sandbox-web-pay.line.me/web/payment/wait?transactionReserveId=VHh0aDFIamFDS01JellTTnNKNXBLZHowWTkvWDFLM2NKNVZ4Y3k2M2ROeC91eEtzZ1JxdkM3R3Y0TTJPVDJQbg',
              app: 'line://pay/payment/VHh0aDFIamFDS01JellTTnNKNXBLZHowWTkvWDFLM2NKNVZ4Y3k2M2ROeC91eEtzZ1JxdkM3R3Y0TTJPVDJQbg'
            },
            transactionId: 2022062900717799400,
            paymentAccessToken: '665993946128'
          },
          sn: 'f5a2128b-b07a-4eec-adda-25a7aadf14b3'
        });
    });

    it('### 新增購物車項目到訂單', (done) => {
      request(app)
        .post('/order')
        .send({
          name: 'member Test',
          address: 'test address',
          phone: '0987654321',
          status: '0',
          amount: 400
        })
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          // 訂單資料檢查
          const orders = await conn.query(
            SQL`SELECT id, MemberId, 
          AES_DECRYPT(UNHEX(name), ${process.env.AES_KEY}) as name, 
          AES_DECRYPT(UNHEX(phone), ${process.env.AES_KEY}) as phone,
          AES_DECRYPT(UNHEX(address), ${process.env.AES_KEY}) as address, 
          amount, status, sn, paymentUrl, createdAt 
          FROM order_main;`
          );
          const order = orders[0];
          // 在nodejs環境內，從MariaDB以AES_DECRYPT後的資料以buffer(緩衝區)顯示為二進制(相當於未完全轉換？)，因此需要再轉換成字串，才能用斷言比對
          order.name.toString().should.be.equal('member Test');
          order.phone.toString().should.be.equal('0987654321');
          order.address.toString().should.be.equal('test address');
          order.status.toString().should.be.equal('0');
          order.amount.should.be.equal(400);
          order.sn.should.be.equal('f5a2128b-b07a-4eec-adda-25a7aadf14b3');
          order.paymentUrl.should.be.equal(
            'https://sandbox-web-pay.line.me/web/payment/wait?transactionReserveId=VHh0aDFIamFDS01JellTTnNKNXBLZHowWTkvWDFLM2NKNVZ4Y3k2M2ROeC91eEtzZ1JxdkM3R3Y0TTJPVDJQbg'
          );

          // 訂單項目檢查
          const orderItems = await conn.query(
            SQL`SELECT * FROM order_sub WHERE orderId = ${order.id};`
          );
          const orderItem = orderItems[0];
          orderItem.ProductId.should.be.equal(1);
          orderItem.price.should.be.equal(200);
          orderItem.quantity.should.be.equal(2);

          // 商品數量減少
          const product = await conn.query(
            SQL`SELECT * FROM product WHERE id = ${orderItem.ProductId};`
          );
          product[0].quantity.should.be.equal(598); // 600-2

          // 購物車與項目已經清空
          let cart = await conn.query('SELECT * FROM cart_main;');
          let cartItems = await conn.query('SELECT * FROM cart_sub;');
          // 轉成可操作的空陣列
          cart = JSON.parse(JSON.stringify(cart));
          cartItems = JSON.parse(JSON.stringify(cartItems));
          // 刪除後購物車與項目陣列長度為0
          cart.length.should.be.equal(0);
          cartItems.length.should.be.equal(0);

          // 轉到專屬付款頁面
          res.headers.location.should.be.equal('/order/1/payment');

          return done();
        });
    });
  });

  describe('## POST /order/:id/cancel', () => {
    // 額外建立訂單資料，以便測試取消功能
    before(async () => {
      // 同使用者的另一筆訂單資料
      await conn.query(
        SQL`INSERT INTO order_main
        (MemberId, name, phone, address, amount, status, sn, paymentUrl)
        VALUES (1, 
          HEX(AES_ENCRYPT('member Test', ${process.env.AES_KEY})), 
          HEX(AES_ENCRYPT('0912345678', ${process.env.AES_KEY})), 
          HEX(AES_ENCRYPT('test address', ${process.env.AES_KEY})), 600, 0, 'sn', 'url');`
      );
      await conn.query(
        'INSERT INTO order_sub (OrderId, ProductId, prodName, price, quantity) VALUES (2, 1, "精靈球", 200, 3);'
      );

      // 另一位使用者的訂單資料
      await conn.query(
        SQL`INSERT INTO order_main
        (MemberId, name, phone, address, amount, status, sn, paymentUrl)
        VALUES (2, 
          HEX(AES_ENCRYPT('AnotherMember Test', ${process.env.AES_KEY})), 
          HEX(AES_ENCRYPT('0928592562', ${process.env.AES_KEY})), 
          HEX(AES_ENCRYPT('test address', ${process.env.AES_KEY})), 1000, 0, 'sn', 'url');`
      );
      await conn.query(
        'INSERT INTO order_sub (OrderId, ProductId, prodName, price, quantity) VALUES (3, 1, "精靈球", 200, 5);'
      );
    });

    it('### 取消自己訂單的付款', (done) => {
      request(app)
        .put('/order/2/cancel')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const order = await conn.query(
            SQL`SELECT * FROM order_main WHERE id = 2;`
          );
          order[0].status.should.be.equal('-1'); // 表示已取消付款
          return done();
        });
    });

    it('### 取消他人訂單付款時導回頁面', (done) => {
      request(app)
        .put('/order/3/cancel')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const order = await conn.query(
            SQL`SELECT * FROM order_main WHERE id = 3;`
          );
          order[0].status.should.be.equal('0'); // 表示沒有取消付款
          return done();
        });
    });
  });

  describe('## GET /order/:id/payment', () => {
    it('### 顯示使用者有效訂單對應的付款頁面', (done) => {
      request(app)
        .get('/order/1/payment')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(200)
        .end(async (err, res) => {
          if (err) return done(err);
          res.text.should.include('付款資訊');
          res.text.should.include('訂單資訊');
          res.text.should.include('商店資訊');
          return done();
        });
    });

    it('### 想查看已付清或取消訂單付款資訊時，導回訂單頁面', (done) => {
      request(app)
        .get('/order/2/payment')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const order = await conn.query(
            SQL`SELECT * FROM order_main WHERE id = 2;`
          );
          order[0].status.should.not.be.equal('0');
          res.headers.location.should.be.equal('/orders');
          return done();
        });
    });

    it('### 想看他人訂單付款資訊頁時，導回訂單頁面', (done) => {
      request(app)
        .get('/order/3/payment')
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const order = await conn.query(
            SQL`SELECT * FROM order_main WHERE id = 3;`
          );
          order[0].MemberId.should.not.be.equal(1);
          res.headers.location.should.be.equal('/orders');
          return done();
        });
    });
  });

  describe('## GET /orders/confirm', () => {
    before(async () => {
      this.linePayRespond = sinon
        .stub(require('../config/linePayApis'), 'postConfirm')
        .returns({
          returnCode: '0000',
          returnMessage: 'OK',
          info: {
            orderId: 'f5a2128b-b07a-4eec-adda-25a7aadf14b3',
            transactionId: parseInt('2018082512345678910') // 繞過semistandard.js的規則
          }
        });
    });

    it('### 從API回傳訊息確認付款成功', (done) => {
      request(app)
        .get(
          '/orders/confirm?orderId=f5a2128b-b07a-4eec-adda-25a7aadf14b3&transactionId=2022062900717799400'
        )
        .set('Accept', 'application/json')
        .set('Cookie', [cookies])
        .expect(302)
        .end(async (err, res) => {
          if (err) return done(err);
          const order = await conn.query(
            SQL`SELECT * FROM order_main WHERE id = 1;`
          );
          order[0].status.should.be.equal('1'); // 表示已付款
          return done();
        });
    });
  });

  after(async () => {
    await conn.query('TRUNCATE TABLE `member`;');
    await conn.query('TRUNCATE TABLE `product`;');
    await conn.query('TRUNCATE TABLE `cart_main`;');
    await conn.query('TRUNCATE TABLE `cart_sub`;');
    await conn.query('TRUNCATE TABLE `order_main`;');
    await conn.query('TRUNCATE TABLE `order_sub`;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    await conn.release();
  });
});
