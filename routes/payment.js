var express = require("express");
var router = express.Router();
const request = require("request");
var PaymentModel = require("../models/payment");
var UserModel = require("../models/user");
var SolutionModel = require("../models/solutions");
var ObjectID = require("objectid");
const CFA = 655.06;

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
  console.log(payment_details);
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal"
    },
    redirect_urls: {
      return_url: payment_details.return_url,
      cancel_url: payment_details.cancel_url
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: payment_details.name,
              sku: payment_details.sku,
              price: payment_details.total_price,
              currency: payment_details.currency,
              quantity: payment_details.quantity
            }
          ]
        },
        amount: {
          currency: payment_details.currency,
          total: payment_details.total_price
        },
        description: payment_details.description
      }
    ]
  };
  console.log(create_payment_json);
  paypal.payment.create(create_payment_json, function(error, payment) {
    console.log(payment);
    console.log(error);
    if (error) {
      throw error;
    } else {
      console.log(payment.links);
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === "approval_url") {
          res.send({ url: payment.links[i].href });
        }
      }
    }
  });
});

router.post("/success", async (req, res) => {
  console.log("in success");
  var payment_data = req.body;
  console.log(payment_data);
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
  console.log(execute_payment_json);
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
          payment_details.user_id = payment_data.user_id;
          payment_details.payer_id = payment_data.payerId;
          payment_details.payment_id = payment_data.paymentId;
          payment_details.total_price = payment_data.total_price;
          payment_details.currency = payment_data.currency;
          payment_details.payment_type = payment_data.payment_type;

          payment_details.save((err, saved_payment) => {
            if (!err) {
              resolve(saved_payment);
            } else {
              reject(err);
            }
          });
        });
        if (payment_saved) {
          const updated_solution = await new Promise((resolve, reject) => {
            var new_price = payment_data.balance + payment_data.total_price;
            console.log("updating solution");
            SolutionModel.findOneAndUpdate(
              { _id: payment_data.solution_id },
              {
                $set: {
                  status: "Accepted",
                  accepted_by: ObjectID(payment_data.accpeted_by_id)
                }
              },
              { new: true }
            )
              .populate("user")
              .exec((err, user) => {
                if (!err) {
                  resolve(user);
                } else {
                  reject(err);
                }
              });
          })
            .then(updated_solution => {
              console.log(updated_solution);
              res.status(200).send({
                status: true,
                message: "Solution updated successfully",
                data: updated_solution
              });
            })
            .catch(err => {
              console.log(err);
              res.status(401).send({
                status: false,
                message: "Unable to update Solution",
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
  var to_rate, from_rate, euro, converted_amount;
  const url = `http://data.fixer.io/api/latest?access_key=${process.env.FIXER_API_KEY}`;
  console.log(url);
  request.get(url, (error, response, body) => {
    var rates = JSON.parse(response.body);
    rates = rates.rates;
    rates["CFA"] = CFA;
    to_rate = rates[req.body.to];
    from_rate = rates[req.body.from];
    euro = rates["EUR"];
    console.log(to_rate, from_rate, euro);
    converted_amount = (euro / from_rate) * to_rate;
    res.send({ converted_amount });
  });
});

module.exports = router;
