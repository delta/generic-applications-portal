const express = require("express");
const path = require("path");
const favicon = require("static-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const secretString = require("./config/session_config.js").secretString;
const loginAndSignup = require("./routes/loginAndSignup");
const application = require("./routes/applications");
const users = require("./routes/users");
const usersProtected = require("./routes/users_protected");
const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);
const dbConfig = require("./config/config.js")[process.env.NODE_ENV || "development"];
const app = express();

const sessionStore = new MySQLStore(dbConfig);

app.use(express.static("public"));
app.use(session({
  "secret": secretString,
  "cookie": {
    "maxAge": 186000000,
  },
  "path": "/",
  "store": sessionStore
}));

const models = require("./models/");

models.sequelize
  .authenticate()
  .then(() => {
    console.log("Connection successful");
  })
  .catch((error) => {
    console.log("Error creating connection:", error);
  });

const initDb = require("./middlewares/db_init").initDb;
const authenticate = require("./middlewares/authenticate").authenticate;

initDb();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(favicon());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", loginAndSignup);
app.use("/users", users);
app.use(authenticate);
app.use("/applications", application);
app.use("/uploads/", express.static(path.join(__dirname, "uploads")));
app.use("/users", usersProtected);
app.get('/logout', (req, res)=>{
  req.session.destroy();
  res.redirect('/login');
})

// / catch 404 and forwarding to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");

  err.status = 404;
  next(err);
});

// / error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render("error", {
      "message": err.message,
      "error": err,
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render("error", {
    "message": err.message,
    "error": {},
  });
});


module.exports = app;
