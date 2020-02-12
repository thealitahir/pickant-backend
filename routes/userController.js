var express = require("express");
var router = express.Router();
var UserModel = require("../models/user");
const nodemailer = require("nodemailer");
var http = require("https");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(
  "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"
);

router.post("/login", async (req, res) => {
  console.log("in login");
  console.log(req.body);
  const user = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { pliep_id: req.body.pliep_id, password: req.body.password },
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
        { pliep_id: req.body.pliep_id },
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
  console.log(unique_user);

  if (unique_user) {
    res
      .status(409)
      .send({ status: false, message: "Email already exists", data: {} });
  } else {
    var pliep_id = randomAlphaNumericString(10);
    var key = generateRandomString();
    const msg = {
      to: req.body.email,
      from: "mwaqaskh@gmail.com",
      subject: `Welcome ${req.body.firstName} - NosaPost`,
      text: `Please use this Pliep Id  ${pliep_id} for future logins`
      // text: `http://localhost:3001?token=${code}`
      // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    };
    var newUser = new UserModel();
    newUser.firstName = req.body.firstName;
    newUser.lastName = req.body.lastName;
    newUser.email = req.body.email;
    newUser.password = req.body.password;
    newUser.phoneNo = req.body.phoneNo;
    //newUser.address = req.body.address;
    newUser.auth_key = key;
    newUser.pliep_id = pliep_id;
    //create new user
    const new_user = await new Promise((resolve, reject) => {
      newUser.save((err, new_user) => {
        if (!err) {
          resolve(new_user);
        } else {
          reject(err);
        }
      });
    });
    console.log(new_user);
    if (new_user) {
      //send pliep id after saving user
      const email_confirmation = await new Promise((resolve, reject) => {
        sgMail.send(msg, (err, response) => {
          if (!err) {
            resolve(response);
          } else {
            reject(err);
          }
        });
      });
      if (email_confirmation) {
        res.status(200).send({
          status: true,
          message: "User registered successfully",
          data: new_user
        });
      } else {
        res.status(401).send({
          status: false,
          message: "unable to send email",
          data: {}
        });
      }
    } else {
      res.status(401).send({
        status: false,
        message: "Unable to register user",
        data: {}
      });
    }
  }
});

router.post("/forgetPassword", async (req, res) => {
  console.log("in forget password");
  var user = req.body;
  var code = generateRandomCode();
  console.log(user);
  //mwaqaskh@gmail.com
  const msg = {
    to: user.email,
    from: "mwaqaskh@gmail.com",
    subject: "Account Verification - NosaPost",
    text: `Please use this verification code  ${code}`
    // text: `http://localhost:3001?token=${code}`
    // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  };
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne({ email: user.email }, function(err, user) {
      if (!err) {
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (!user_data) {
    res.status(404).send({
      status: false,
      message: "No user with this email is registered",
      data: {}
    });
  } else {
    const updated_user = await new Promise((resolve, reject) => {
      UserModel.findOneAndUpdate(
        { pliep_id: user.pliep_id },
        {
          $set: {
            verification_code: code
          }
        },
        { new: true },
        (error, user) => {
          if (!error) {
            resolve(user);
          } else {
            reject(error);
          }
        }
      );
    });
    if (!updated_user) {
      res.status(401).send({
        status: false,
        message: "Unable to update verification code",
        data: {}
      });
    } else {
      const code_confirmation = await new Promise((resolve, reject) => {
        sgMail.send(msg, (err, response) => {
          if (!err) {
            resolve(response);
          } else {
            reject(err);
          }
        });
      });
      if (code_confirmation) {
        res.status(200).send({
          status: true,
          message: "Email sent and code saved",
          data: updated_user
        });
      } else {
        res.status(401).send({
          status: false,
          message: "unable to send email",
          data: {}
        });
      }
    }
  }
});

router.post("/codeValidation", async (req, res) => {
  var user = req.body;
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { email: user.email, verification_code: user.code },
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
      { email: user.email },
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
    res.status(401).send({ status: false, message: "Invalid code", data: {} });
  }
});

router.get("/test", (req, res) => {
  console.log("in test");
  /* for (var i = 0; i < Math.pow(10, 90); i++) {}*/
  res.send("Hello from test");
});
router.post("/asycAwaitExample", (req, res) => {
  var jsonData = req.body.details;
  var searchQuery =
    jsonData.usertype == TRANSCRIBER
      ? { uploaded_by_id: jsonData.id }
      : { doctor_id: jsonData.id };
  searchQuery.is_active = "true";
  isAuthorizedUser(
    jsonData.id,
    jsonData.usertype,
    jsonData.auth_key,
    "",
    async function(err, status) {
      if (status) {
        console.log("Get /get_all_combined_transcriptions Call");
        const doctor_transcriptions = await new Promise((resolve, reject) => {
          Doctor_Transcribtions.find({ ...searchQuery, is_active: "true" })
            .sort({ _id: -1 })
            .exec(function(err, doctorTranscribtions) {
              if (err) {
                res.send({
                  status: 500,
                  message: "Unable to find Transcription."
                });
                reject(err);
              } else {
                resolve(doctorTranscribtions);
              }
            });
        });

        const audio_transcriptions = await new Promise((resolve, reject) => {
          Audio_Transcribtions.find({ ...searchQuery, is_active: "true" })
            .sort({ _id: -1 })
            .exec(function(err, audioTranscribtions) {
              if (err) {
                res.send({
                  status: 500,
                  message: "Unable to find Transcription."
                });
                reject(err);
              } else {
                resolve(audioTranscribtions);
              }
            });
        });
        var data = {};
        data.array = audio_transcriptions.concat(doctor_transcriptions);
        res.send({
          status: 200,
          message: "All Doctor and Audio Transcriptions.",
          data: data
        });
      } else {
        res.send({ status: 300, message: "Authentication Failed" });
      }
    }
  );
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
