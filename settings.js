const dotenv = require('dotenv');

dotenv.config();
const googleApplicationCredentials =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

module.exports = googleApplicationCredentials