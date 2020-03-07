var express = require("express");
var router = express.Router();
const request = require("request");

require("dotenv").config();
const paypal = require("paypal-rest-sdk");
const convertCurrency = require("nodejs-currency-converter");

paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

router.get("/pay/:total_price/:currency", (req, res) => {
  console.log("in payment");
  var payment_details = req.body;
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal"
    },
    redirect_urls: {
      return_url: `http://localhost:3010/payment/success/?price=${req.params.total_price}&currency=${req.params.currency}`,
      cancel_url: "http://localhost:3010/payment/cancel"
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: "Red Sox Hat",
              sku: "001",
              price: "25.00",
              currency: "USD",
              quantity: 1
            }
          ]
        },
        amount: {
          currency: "USD",
          total: "25.00"
        },
        description: "Hat for the best team ever"
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

router.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const total_price = req.query.price;
  const currency = req.query.currency;
  console.log("in success", total_price, currency, payerId, paymentId);
  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: "25.00"
        }
      }
    ]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function(
    error,
    payment
  ) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
    //   console.log(JSON.stringify(payment));
      res.send(payment);
    }
  });
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
