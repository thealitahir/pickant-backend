const admin = require('firebase-admin');
const path = require('path');

const googleApplicationCredentials =  require('./settings');
const serviceAccount = require(path.join(__dirname,googleApplicationCredentials));
// console.log('TEST',serviceAccount)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pickant-app.firebaseio.com',
});

const messaging = admin.messaging();
module.exports = {messaging}
