var express = require("express");
var router = express.Router();
var UserModel = require("../models/user");
const nodemailer = require("nodemailer");
var http = require("https");
const sgMail = require("@sendgrid/mail");
const bodyParser = require("body-parser");
const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
sgMail.setApiKey(
  "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"
);
require("dotenv").config();
const client = require("twilio")(
  process.env.TWILIO_ACCOUNTSID,
  process.env.TWILIO_AUTHTOKEN
);
router.post("/login", async (req, res) => {
  console.log("in login");
  console.log(req.body);
  const user = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { email: req.body.email, password: req.body.password },
      function(err, user) {
        if (!err) {
          resolve(user);
          //res.send({ status: true, message: 'User found', data: user });
        } else {
          reject(err);
          // res.send({ status: false, message: 'User not found' });
        }
      }
    );
  });

  if (!user) {
    console.log("returning error");
    res
      .status(401)
      .send({ status: false, message: "Invalid Credentials", data: {} });
  } else {
    var key = generateRandomString();
    const updated_user = await new Promise((resolve, reject) => {
      UserModel.findOneAndUpdate(
        { email: req.body.email },
        {
          $set: {
            auth_key: key
          }
        },
        { new: true },
        function(error, auth_user) {
          if (!error) {
            resolve(auth_user);
          } else {
            reject(error);
          }
        }
      );
    });
    console.log(updated_user);
    if (updated_user) {
      res.status(200).send({
        status: true,
        message: "User login successful",
        data: updated_user
      });
    } else {
      res.status(401).send({
        status: false,
        message: "Unable to save auth token",
        data: {}
      });
    }
  }
});

router.post("/register", async (req, res) => {
  console.log("in register");
  console.log(req.body);

  //check if email already exists
  const unique_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ email: req.body.email }, (err, user) => {
      if (!err) {
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (unique_user) {
    res
      .status(409)
      .send({ status: false, message: "User already exists", data: {} });
  } else {
    var newUser = new UserModel();
    newUser.firstName = req.body.firstName;
    newUser.lastName = req.body.lastName;
    newUser.email = req.body.email;
    newUser.password = req.body.password;
    newUser.mobile_no = req.body.mobile_no;
    newUser.physical_address = req.body.physical_address;
    newUser.admin = req.body.admin;
    //create new user
    const new_user = await new Promise((resolve, reject) => {
      newUser.save((err, new_user) => {
        if (!err) {
          resolve(new_user);
        } else {
          reject(err);
        }
      });
    })
      .then(new_user => {
        res.status(200).send({
          status: true,
          message: "User registered successfully",
          data: new_user
        });
      })
      .catch(err => {
        res.status(401).send({
          status: false,
          message: "Unable to register user",
          data: err
        });
      });
  }
});

router.post("/sendMessage", async (req, res) => {
  const mobile_no = req.body.mobile_no;
  console.log(mobile_no);
  const unique_user = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { mobile_no: req.body.mobile_no },
      (err, user) => {
        if (!err) {
          resolve(user);
        } else {
          reject(err);
        }
      }
    );
  });
  console.log(unique_user)
  console.log(unique_user.email)
  if (!unique_user || !unique_user.email) {
    const code = generateRandomCode();
    const msg = await new Promise((resolve, reject) => {
      client.messages
        .create({
          body: `Use code ${code} to verify your phone number - Pickant`,
          from: "(717) 415-5703",
          to: mobile_no
        })
        .then(message => {
          console.log(message.sid);
          resolve(message);
        })
        .catch(error => {
          console.log(error);
          reject(error);
        });
    });
    if (msg) {
      console.log("+++++++++ updating db++++++++++++++++++");
      const updated_user = await new Promise((resolve, reject) => {
        UserModel.findOneAndUpdate(
          { mobile_no: mobile_no },
          {
            $set: {
              verification_code: code
            }
          },
          { upsert: true, new: true },
          (error, user) => {
            if (!error) {
              console.log("user updated", user);
              resolve(user);
            } else {
              console.log("error occured", error);
              reject(error);
            }
          }
        );
      });
      if (updated_user) {
        res.status(200).send({
          status: true,
          message: "message sent and user updated",
          data: updated_user
        });
      } else {
        res.status(401).send({
          status: false,
          message: "Unable to save code in db",
          data: {}
        });
      }
    } else {
      res
        .status(401)
        .send({ status: false, message: "Unable to send message", data: {} });
    }
  } else {
    res
      .status(409)
      .send({ status: false, message: "User already exists", data: {} });
  }
});

router.post("/codeValidation", async (req, res) => {
  console.log(req.body.mobile_no, req.body.code);
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { mobile_no: req.body.mobile_no, verification_code: req.body.code },
      (err, record) => {
        if (!err) {
          resolve(record);
        } else {
          reject(err);
        }
      }
    );
  });
  if (user_data) {
    res
      .status(200)
      .send({ status: true, message: "Code verified", data: user_data });
  } else {
    res
      .status(401)
      .send({ status: false, message: "Unable to verify code", data: {} });
  }
});

router.post("/updatePassword", async (req, res) => {
  var user = req.body;
  const updated_user = await new Promise((resolve, reject) => {
    UserModel.findOneAndUpdate(
      { mobmobile_noile: user.mobile_no },
      {
        $set: {
          password: user.password
        }
      },
      { new: true },
      (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      }
    );
  });
  if (updated_user) {
    res.status(200).send({
      status: true,
      message: "Password updated successfuly",
      data: updated_user
    });
  } else {
    res
      .status(401)
      .send({ status: false, message: "Unable to update password", data: {} });
  }
});

router.post("/getUser", (req, res) => {
  UserModel.findOne(
    { email: req.body.email, auth_key: req.body.auth_key },
    function(err, user) {
      if (!err) {
        res.status(200).send({
          status: true,
          message: "User login successful",
          data: updated_user
        });
      } else {
        res
          .status(401)
          .send({ status: false, message: "Invalid Credentials", data: {} });
      }
    }
  );
});

router.post("/test", (req, res) => {
  console.log("in test");

  res.send("Hello from test");
});

function generateRandomString() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (var i = 0; i < 25; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  text += Date.now();
  return text;
}

function generateRandomCode() {
  var text = "";
  var possible = "1234567890";
  for (var i = 0; i < 6; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function randomAlphaNumericString(length) {
  var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var result = "";
  for (var i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  UserModel.findOne({ pliep_id: result }, (err, data) => {
    console.log(data);
    if (!err && data) {
      randomAlphaNumericString(10);
    } else {
      return result;
    }
  });
  return result;
}

module.exports = router;
