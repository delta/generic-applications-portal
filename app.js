var express = require('express')
var path = require('path')
var favicon = require('static-favicon')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var secretString = require('./config/session_config.js').secretString
var routes = require('./routes/index')
var users = require('./routes/users')
var users_protected = require('./routes/users_protected')
var session = require("express-session")
var app = express()
app.use(session({secret:secretString,cookie: { maxAge: 186000000 }, path:'*'}))

var initDb = require("./middlewares/db_init").initDb
var authenticate = require("./middlewares/authenticate").authenticate
initDb()
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(favicon())
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', routes)
app.use('/users', users)
app.use(authenticate)
app.use('/users', users_protected) 
/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found')
    err.status = 404
    next(err)
})

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500)
        res.render('error', {
            message: err.message,
            error: err
        })
    })
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
        message: err.message,
        error: {}
    })
})


module.exports = app
