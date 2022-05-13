/* 選用與MySQL類似但較無授權問題的MariaDB練習 */
function mariaDBSettings () {
  const mariaDB = require('mariaDB');
  const pool = mariaDB.createPool({
    database: process.env.DB,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,

    acquireTimeout: 100000,
  });

  return pool;
}

module.exports = mariaDBSettings;
