async function connection (pool) {
  // 套件名稱都是小寫，DB不要用大寫，否則測試(Github Actions)和部署環境(heroku)會找不到套件
  const mariaDB = require('mariadb');
  if (process.env.NODE_ENV !== 'production') {
    return await pool.getConnection();
  } else { // 開發環境使用JAWSDB MARIA
    return await mariaDB.createConnection(process.env.JAWSDB_MARIA_URL);
  }
}

module.exports = connection;
