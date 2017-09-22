const mysql = require("mysql");
const dbConfig = require("../config/db_config");
const connection = mysql.createConnection({
  "host": dbConfig.host,
  "user": dbConfig.username,
  "password": dbConfig.password,
  "database": "generic-applications-portal",
});

module.exports.initDb = function() {
  connection.connect((err) => {
    if (err) {
      console.error(`error connecting: ${err.stack}`);
      return;
    }

    console.log(`connected as id ${connection.threadId}`);
  });
};
module.exports.getConnection = () => {
  if (connection) {
    return connection;
  }
};
