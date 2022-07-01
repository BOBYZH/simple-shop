/* 功能：建立專案測試用的商品資料 */

if (process.env.NODE_ENV !== 'production') { // 本機開發測試時自訂環境變數
  require('dotenv').config();
}

const mariaDBConfig = require('../config/mariaDB.js'); // 載入模組化的mariaDB設定
const pool = mariaDBConfig();
const connection = require('../config/connection.js');
let conn;

(async () => {
  try {
    conn = await connection(pool);

    await conn.query(
      // 允許無視外鍵關聯限制清空表格
      `
        SET FOREIGN_KEY_CHECKS = 0;
        `
    );

    await conn.query(
      `
        TRUNCATE table product; 
        `
    );

    await conn.query(
      // 清空後恢復外鍵關聯限制
      `
        SET FOREIGN_KEY_CHECKS = 1;
        `
    );

    await conn.query(
      `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/8/87/Pok%C3%A9_Ball.png', 
        '精靈球', '用於投向野生寶可夢並將其捕捉的球。它是膠囊樣式的。', 200, 600);
        `
    );

    await conn.query(
      `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/4/45/Great_Ball.png', 
        '超級球', '性能還算不錯的球。比起精靈球更容易捉到寶可夢。', 600, 200);
        `
    );

    await conn.query(
      `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/3/34/Ultra_Ball.png', 
        '高級球', '性能非常不錯的球。比起超級球更容易捉到寶可夢。', 1200, 100);
        `
    );

    await conn.query(
      `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/e/ee/Master_Ball.png', 
        '大師球', '性能最好的球。必定能捉到野生寶可夢。', 120000, 1);
        `
    );

    await conn.query(
      `
        INSERT INTO product (imgUrl, prodName, description, price, quantity) 
        VALUES ('https://static.wikia.nocookie.net/pokemongo/images/8/8d/Premier_Ball.png', 
        '紀念球', '作為某種紀念品而特別製造的，有點稀奇的球。', 
        2000, 60);
        `
    );

    console.log('Data of products have been generated!');
  } catch (err) {
    console.log('ERROR!');
    throw err;
  } finally {
    if (conn) conn.release();
  }

  process.exit();
})();
