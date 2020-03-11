var express = require("express");
var router = express.Router();
const request = require("request");
var PaymentModel = require("../models/payment");
var UserModel = require("../models/user");

require("dotenv").config();
const paypal = require("paypal-rest-sdk");
const convertCurrency = require("nodejs-currency-converter");

paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

router.post("/pay", (req, res) => {
  console.log("in payment");
  var payment_details = req.body;
  var item_list = payment_details.item_list;
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal"
    },
    redirect_urls: {
      return_url: `http://localhost:3010/payment/success/?price=${payment_details.total_price}
      &currency=${payment_details.currency}&user_id=${payment_details.user_id}`,
      cancel_url: "http://localhost:3010/payment/cancel"
    },
    transactions: [
      {
        item_list,
        amount: {
          currency: payment_details.currency,
          total: payment_details.total_price
        },
        description: payment_details.description
      }
    ]
  };

  paypal.payment.create(create_payment_json, function(error, payment) {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === "approval_url") {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

router.get("/success", async (req, res) => {
  var payment_data = req.body;
  /* const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const total_price = req.query.price;
  const currency = req.query.currency;
  console.log("in success", total_price, currency, payerId, paymentId); */
  const execute_payment_json = {
    payer_id: payment_data.payerId,
    transactions: [
      {
        amount: {
          currency: payment_data.currency,
          total: payment_data.total_price
        }
      }
    ]
  };

  paypal.payment.execute(
    payment_data.paymentId,
    execute_payment_json,
    async function(error, payment) {
      if (error) {
        console.log(error.response);
        res.status(400).send({
          status: false,
          message: "Unable to process payment",
          data: {}
        });
      } else {
        //   console.log(JSON.stringify(payment));
        // res.send(payment);
        const payment_saved = await new Promise((resolve, reject) => {
          var payment_details = new PaymentModel();
          payment_details.user_id = req.query.user_id;
          payment_details.payer_id = payerId;
          payment_details.payment_id = paymentId;
          payment_details.total_price = total_price;
          payment_details.currency = currency;

          payment_details.save((err, saved_payment) => {
            if (!err) {
              resolve(saved_payment);
            } else {
              reject(err);
            }
          });
        });
        if (payment_saved) {
          const updated_user = await new Promise((resolve, reject) => {
            var new_price = payment_data.balance + payment_data.total_price;
            UserModel.findOneAndUpdate(
              { _id: payment_details.user_id },
              {
                $set: {
                  wallet: new_price
                }
              },
              { new: true },
              (err, user) => {
                if (!err) {
                  resolve(user);
                } else {
                  reject(err);
                }
              }
            );
          })
            .then(updated_user => {
              res.status(200).send({
                status: true,
                message: "user wallet updated successfully",
                data: updated_user
              });
            })
            .catch(err => {
              res.status(401).send({
                status: false,
                message: "Unable to update user wallet",
                data: err
              });
            });
        } else {
          res.status(400).send({
            status: false,
            message: "Unable to process payment",
            data: {}
          });
        }
      }
    }
  );
});

router.get("/cancel", (req, res) => res.send("Cancelled"));

router.post("/currencyconverter", (req, res) => {
  console.log("currency converter", req.body);
  var to_rate, from_rate;
  const url = `http://data.fixer.io/api/latest?access_key=${process.env.FIXER_API_KEY}`;
  console.log(url);
  request.get(url, (error, response, body) => {
    var rates = JSON.parse(response.body);
    rates = rates.rates;
    to_rate = rates[req.body.to];
    from_rate = rates[req.body.from];
    res.send({ to_rate, from_rate });
  });
});

module.exports = router;
