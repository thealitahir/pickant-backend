var express = require('express');
var app = express();
var mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const user = require('./routes/userController');
const solution = require('./routes/solutionsController');
const category = require('./routes/categoryController');
const subCategory = require('./routes/subCategoryController');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const fileRoute = require('./routes/fileUpload');
const payment = require('./routes/payment');
require('dotenv').config();
const ngrok = require('ngrok');
(async function() {
  const url = await ngrok.connect(3010);
  console.log(url);
})();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser(''));
// Configurations
app.use('/user', user);
app.use('/solution',solution);
app.use('/category',category);
app.use('/subCategory',subCategory);
app.use('/file', fileRoute);
app.use('/payment', payment);

var opt = {
  useNewUrlParser: true
};
mongoose.connect(
  process.env.CONNECTION_STRING,
  opt
);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('DB CONNECTED', process.env.PORT);
  var server = app.listen(process.env.PORT || 8080, process.env.HOST, function() {
    console.log('Server started on port :' + process.env.PORT);
  });
  io = require('socket.io').listen(server);
});

module.exports = app;
