require("dotenv").config();
const sgMail = require('@sendgrid/mail');
const from = process.env.MAIL_FROM;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sendMail = (mailOptions, cb) => {
  mailOptions.from = from;
  sgMail.send(mailOptions,cb);
};

module.exports = {
  sendMail: sendMail,
};
