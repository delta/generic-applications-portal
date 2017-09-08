var mysql = require('mysql')
var dbConfig = require('../config/db_config')
connection = mysql.createConnection({
  host     :dbConfig.host,
  user     : dbConfig.username,
  password : dbConfig.password,
  database: 'generic-applications-portal'
});
module.exports.initDb = function(){
  connection.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }

    console.log('connected as id ' + connection.threadId);
  });
}
