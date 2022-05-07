const createError = require('http-errors');
const express = require('express');

// 開發環境使用dotenv讀取環境變數
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const session = require('express-session'); // 手作會員系統需要的session

const flash = require('connect-flash'); // 顯示提示訊息

const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');

const app = express();

// 選用ejs+ejs-locals作為樣板引擎，以原生JS為主免去各類樣板(template)的獨特語法
const engine = require('ejs-locals');
app.engine('ejs', engine);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 取代body-parser解析form data
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET, // 將加密用的session id移到環境變數，不在程式碼內顯示
    cookie: { maxAge: 86400000 }, // 延長登入狀態維持至1天方便使用
    resave: true,
    saveUninitialized: false
  })
);

// 顯示flash提示訊息的相關設定與全域變數
app.use(flash());
app.use((req, res, next) => {
  res.locals.successMessages = req.flash('successMessages');
  res.locals.errorMessages = req.flash('errorMessages');
  res.locals.user = req.user;

  res.locals.webTitle = process.env.WEB_TITLE;
  res.locals.webIcon = process.env.WEB_ICON;
  res.locals.ThemeName = process.env.THEME_NAME;

  next();
});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
