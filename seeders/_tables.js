/* 功能：定義專案使用的所有資料表 */

if (process.env.NODE_ENV !== 'production') { // 本機開發測試時自訂環境變數
  require('dotenv').config();
}

const mariaDBConfig = require('../config/mariaDB.js'); // 載入模組化的mariaDB設定
const pool = mariaDBConfig();
let conn;

(async () => {
  try {
    conn = await pool.getConnection();

    await conn.query(
      `
        CREATE TABLE if not exists member(
          id    INT(10)      unsigned NOT NULL AUTO_INCREMENT,
          email  VARCHAR(64)           NOT NULL CHECK (email LIKE '%_@_%'),
          password VARCHAR(100)        NOT NULL,
          createdAt  DATETIME  DEFAULT current_timestamp(),
          PRIMARY KEY(id)
        );
        `
    );

    await conn.query(
      `
        CREATE TABLE if not exists product(
          id    INT(10)      unsigned NOT NULL AUTO_INCREMENT,
          imgUrl  VARCHAR(512)        NOT NULL,
          prodName VARCHAR(64)        NOT NULL,
          description TEXT       NOT NULL,
          price    INT(10)      unsigned NOT NULL,
          quantity    INT(10)      unsigned NOT NULL,
          createdAt  DATETIME  DEFAULT current_timestamp(),
          PRIMARY KEY(id)
        );
        `
    );

    await conn.query(
      `
        CREATE TABLE if not exists cart_main(
          id    INT(10)      unsigned NOT NULL AUTO_INCREMENT,
          createdAt  DATETIME  DEFAULT current_timestamp(),
          PRIMARY KEY(id)
        );
        `
    );

    await conn.query(
      `
        CREATE TABLE if not exists cart_sub(
          id    INT(10)      unsigned NOT NULL AUTO_INCREMENT,
          quantity INT(10) UNSIGNED NOT NULL,
          CartId   INT(10)      unsigned NOT NULL,
          ProductId   INT(10)      unsigned NOT NULL,
          createdAt  DATETIME  DEFAULT current_timestamp(),
          PRIMARY KEY(id),
          FOREIGN KEY (CartId) REFERENCES cart_main(id),
          FOREIGN KEY (ProductId) REFERENCES product(id) 
        );
        `
    );

    await conn.query(
      `
        CREATE TABLE if not exists order_main(
          id    INT(10)      unsigned NOT NULL AUTO_INCREMENT,
          UserId   INT(10)      unsigned NOT NULL,
          name  VARCHAR(100)        NOT NULL,
          phone VARCHAR(50)        NOT NULL,
          address VARCHAR(100)        NOT NULL,
          amount    INT(10)      unsigned NOT NULL,
          status VARCHAR(10)   NOT NULL,
          sn     VARCHAR(20),
          createdAt  DATETIME  DEFAULT current_timestamp() ,
          PRIMARY KEY(id),
          FOREIGN KEY (UserId) REFERENCES member(id)
        );
        `
    );

    await conn.query(
      `
        CREATE TABLE if not exists order_sub(
          id    INT(10)      unsigned NOT NULL AUTO_INCREMENT,
          prodName VARCHAR(64)        NOT NULL,
          price    INT(10)      unsigned NOT NULL,
          quantity    INT(10)      unsigned NOT NULL,
          OrderId   INT(10)      unsigned NOT NULL,
          ProductId   INT(10)      unsigned NOT NULL,
          createdAt  DATETIME  DEFAULT current_timestamp() ,
          PRIMARY KEY(id),
          FOREIGN KEY (OrderId) REFERENCES order_main(id),
          FOREIGN KEY (ProductId) REFERENCES product(id) 
        );
        `
    );

    console.log('Tables have been generated!');
  } catch (err) {
    console.log('ERROR!');
    throw err;
  } finally {
    if (conn) conn.release();
  }

  process.exit();
})();
