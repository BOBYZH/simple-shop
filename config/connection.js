async function connection (pool) {
  const mariaDB = require('mariaDB');
  if (process.env.NODE_ENV !== 'production') {
    return await pool.getConnection();
  } else { // 開發環境使用JAWSDB MARIA
    return await mariaDB.createConnection(process.env.JAWSDB_MARIA_URL);
  }
}

module.exports = connection;
