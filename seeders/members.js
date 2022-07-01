/* 功能：建立專案測試用的登入帳號 */

if (process.env.NODE_ENV !== 'production') { // 本機開發測試時自訂環境變數
  require('dotenv').config();
}

const bcrypt = require('bcryptjs');

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
        TRUNCATE table member; 
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
        INSERT INTO member (email, password) VALUES ('member1@example.com', '${bcrypt.hashSync(
          '12345678',
          bcrypt.genSaltSync(10),
          null
        )}');
        `
    );

    await conn.query(
      `
        INSERT INTO member (email, password) VALUES ('member2@example.com', '${bcrypt.hashSync(
          '12345678',
          bcrypt.genSaltSync(10),
          null
        )}');`
    );

    console.log('Data of members have been generated!');
  } catch (err) {
    console.log('ERROR!');
    throw err;
  } finally {
    if (conn) conn.release();
  }

  process.exit();
})();
