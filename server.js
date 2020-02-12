var express = require('express');
var app = express();
var mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const user = require('./routes/userController');
const product = require('./routes/productController');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('dotenv').config();


app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser(''));
// Configurations
app.use('/user', user);
app.use('/product',product)

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
