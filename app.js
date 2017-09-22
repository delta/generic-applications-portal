const express = require("express");
const path = require("path");
const favicon = require("static-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const secretString = require("./config/session_config.js").secretString;
const users = require("./routes/users");
const usersProtected = require("./routes/users_protected");
const session = require("express-session");
const app = express();

app.use(session({
  "secret": secretString,
  "cookie": {
    "maxAge": 186000000,
  },
  "path": "*",
}));

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

app.use("/users", users);
app.use(authenticate);
app.use("/users", usersProtected);
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
