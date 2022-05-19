/* 選用與MySQL類似但較無授權問題的MariaDB練習 */
function mariaDBSettings () {
  const mariaDB = require('mariaDB');
  const pool = mariaDB.createPool({
    database: process.env.DB, // 使用的資料庫名稱(如本專案seeder產生的"simple_shop")
    host: process.env.DB_HOST, // 資料庫的URL或ip位址(本機預設為127.0.0.1)
    port: process.env.DB_PORT, // 連線到資料庫使用的通訊埠(SQL預設為3306)
    user: process.env.DB_USER, // 資料庫設定的使用者名稱(如root)
    password: process.env.DB_PWD, // 上述使用者對應的登入密碼

    // 因建立資料庫或資料表較費時，需延長等待時間(預設10000)
    acquireTimeout: 100000
  });

  return pool;
}

module.exports = mariaDBSettings;
