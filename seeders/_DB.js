/* 功能：建立專案使用的資料庫 */

if (process.env.NODE_ENV !== 'production') { // 本機開發測試時自訂環境變數
  require('dotenv').config();
}

/*
由於未建立資料庫時，使用"database: process.env.DB"此設定會出錯，
故從config/mariaDB拿掉此行再另於此設定，
*/
const mariaDB = require('mariaDB');
const pool = mariaDB.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  acquireTimeout: 100000
});

let conn;

(async () => {
  try {
    conn = await pool.getConnection();

    await conn.query(
      `
        DROP database if exists ${process.env.DB};
        `
    );

    await conn.query(
      `
        CREATE database if not exists ${process.env.DB};
        `
    );

    await conn.query(
      `
        USE ${process.env.DB};
        `
    );

    console.log('DB has been generated!');
  } catch (err) {
    console.log('ERROR!');
    throw err;
  } finally {
    if (conn) conn.release();
  }

  process.exit();
})();
