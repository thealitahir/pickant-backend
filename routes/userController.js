var express = require("express");
var router = express.Router();
var UserModel = require("../models/user");
var SolutionModel = require("../models/solutions");
const nodemailer = require("nodemailer");
var http = require("https");
const sgMail = require("@sendgrid/mail");
var uploadFile = require("./fileUpload");
const bodyParser = require("body-parser");
const multer = require("multer");
const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
sgMail.setApiKey(
  "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"
);
/* const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
stripe.charges.retrieve("ch_1GT4aH2eZvKYlo2C03o0cGY7", {
  api_key: "sk_test_4eC39HqLyjWDarjtT1zdp7dc"
}); */
require("dotenv").config();
const client = require("twilio")(
  process.env.TWILIO_ACCOUNTSID,
  process.env.TWILIO_AUTHTOKEN
);
var storage = multer.memoryStorage();
var multipleUpload = multer({ storage: storage }).array("file");

router.post("/login", async (req, res) => {
  console.log("in login");
  let creds = req.body;
  if (!creds.email) {
    creds.email = "x";
  }
  if (!creds.password) {
    creds.email = "x";
  }
  // creds.email = creds.email.toLowerCase();
  const user = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { $or:[{mobile_no: creds.email}, {email:creds.email}] , password: creds.password },
      (err, user) => {
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
    res
      .status(401)
      .send({ status: false, message: "Invalid Credentials", data: {} });
  } else {
    console.log(user);
    var key = generateRandomString();
    const updated_user = await new Promise((resolve, reject) => {
      UserModel.findOneAndUpdate(
        { $or:[{mobile_no: creds.email}, {email:creds.email.toLowerCase()}] },
        {
          $set: {
            auth_key: key,
          },
        },
        { new: true },
        function (error, auth_user) {
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
        data: updated_user,
      });
    } else {
      res.status(401).send({
        status: false,
        message: "Unable to save auth token",
        data: {},
      });
    }
  }
});

router.post("/register", multipleUpload, async (req, res) => {
  console.log("in register");
  //check if email already exists
  var files = req.files;
  var newUser = {};
  newUser = JSON.parse(req.body.new_user);
  console.log(files);
  console.log(newUser);
  const unique_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ email: newUser.email.toLowerCase() }, (err, user) => {
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
    console.log("creating new user");
    if (newUser.identity_flag) {
      const fileUploadResponse = await new Promise((resolve, reject) => {
        uploadFile(files, "users/", (err, data) => {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        });
      })
        .then(async (fileUploadResponse) => {
          newUser.images = fileUploadResponse.locations;
        })
        .catch((err) => {
          res.status(422).send({
            status: false,
            message: err.errors[0],
            data: {},
          });
        });
    }

    /* newUser.firstName = req.body.firstName;
    newUser.lastName = req.body.lastName;
    newUser.email = req.body.email;
    newUser.password = req.body.password;
    newUser.mobile_no = req.body.mobile_no;
    newUser.physical_address = req.body.physical_address;
    newUser.admin = req.body.admin;
    newUser.identity_flag = req.body.identity_flag; */
    console.log("********************");
    console.log(newUser);
    newUser.email = newUser.email.toLowerCase();
    //create new user
    const new_user = await new Promise((resolve, reject) => {
      UserModel.findOneAndUpdate(
        { mobile_no: newUser.mobile_no },
        newUser,
        { upsert: true, new: true },
        (err, new_user) => {
          if (!err) {
            resolve(new_user);
          } else {
            reject(err);
          }
        }
      );
    })
      .then((new_user) => {
        res.status(200).send({
          status: true,
          message: "User registered successfully",
          data: new_user,
        });
      })
      .catch((err) => {
        res.status(401).send({
          status: false,
          message: "Unable to register user",
          data: err,
        });
      });
  }
});

router.post("/sendMessage", async (req, res) => {
  var mobile_no = req.body.mobile_no;
  var send_code = false;
  console.log(mobile_no);
  const unique_user = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { $or: [{ mobile_no: req.body.mobile_no }, { email: req.body.email }] },
      (err, user) => {
        if (!err) {
          resolve(user);
        } else {
          reject(err);
        }
      }
    );
  });
  if (!unique_user) {
    send_code = true;
  } else if (unique_user && !unique_user.email) {
    send_code = true;
  } else if (req.body.forget_password) {
    send_code = true;
  } else {
    send_code = false;
  }
  if (send_code) {
    const code = generateRandomCode();
    // const validate_number = await client.lookups.phoneNumbers(mobile_no).fetch({ countryCode: "US" });
    var validate_number = undefined;
    validate_number = await new Promise((resolve, reject) => {
      client.lookups
        .phoneNumbers(mobile_no)
        .fetch({ countryCode: "US" })
        .then((phone_number) => {
          console.log("in resolve");
          console.log(phone_number.phoneNumber);
          mobile_no = phone_number.phoneNumber;
          resolve(phone_number);
        })
        .catch(err => {
          console.log("in reject");
          console.log(err);
          reject(err);
        });
    }).then(async validate_number =>{
      console.log("number validated")
      console.log(validate_number);
      const msg = await new Promise((resolve, reject) => {
        client.messages
          .create({
            body: `Use code ${code} to verify your phone number - Pickant`,
            from: "(717) 415-5703",
            to: mobile_no,
          })
          .then((message) => {
            console.log(message.sid);
            resolve(message);
          })
          .catch((error) => {
            console.log(error);
            reject(error);
          });
      });
      if (msg) {
        console.log("+++++++++ updating db++++++++++++++++++",mobile_no);
        const updated_user = await new Promise((resolve, reject) => {
          UserModel.findOneAndUpdate(
            { mobile_no: mobile_no },
            {
              $set: {
                verification_code: code,
              },
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
            data: updated_user,
          });
        } else {
          res.status(401).send({
            status: false,
            message: "Unable to save code in db",
            data: {},
          });
        }
      } else {
        res
          .status(401)
          .send({ status: false, message: "Unable to send message", data: {} });
      }
    }).catch(err =>{
      console.log(err);
      console.log("invalid number");
      res.status(404).send({
        status: false,
        message: "Invalid Phone Number",
        data: {},
      });
    });
    
  } else {
    res.status(409).send({
      status: false,
      message: "User already register with same phone number or email",
      data: {},
    });
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

router.put("/updatePassword", async (req, res) => {
  var user = req.body;
  const updated_user = await new Promise((resolve, reject) => {
    UserModel.findOneAndUpdate(
      { mobile_no: user.mobile_no },
      {
        $set: {
          password: user.password,
        },
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
      data: updated_user,
    });
  } else {
    res
      .status(401)
      .send({ status: false, message: "Unable to update password", data: {} });
  }
});

router.put("/verifyUser", async (req, res) => {
  // const user_data = await new Promise((resolve, reject) => {
  // UserModel.findOne(
  //   { _id: req.body.id },
  //   // { _id: req.body.id, auth_key: req.body.auth_key },
  //   (err, user) => {
  //     if (!err) {
  //       resolve(user);
  //     } else {
  //       reject(err);
  //     }
  //   }
  // );
  // });
  // if (user_data && user_data.admin) {
  // if (user_data) {
  const updated_user = await new Promise((resolve, reject) => {
    UserModel.findOneAndUpdate(
      { _id: req.body.user_id },
      {
        $set: {
          verified: req.body.verifyFlag,
          verified_by: req.body.user_id,
        },
      },
      { new: true },
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
      message: "User verified",
      data: updated_user,
    });
  } else {
    res.status(401).send({
      status: false,
      message: "User verification failed",
      data: {},
    });
  }
  // } else {
  //   res.status(403).send({
  //     status: false,
  //     message: "Access Denied",
  //     data: {}
  //   });
  // }
});

router.put("/updateUser", multipleUpload, async (req, res) => {
  console.log("upadte user");
  const files = req.files;
  console.log(req.files);
  console.log("+++++++++++++++");
  console.log(JSON.parse(req.body.update_data));
  var update_data = JSON.parse(req.body.update_data);
  const fileUploadResponse = await new Promise((resolve, reject) => {
    uploadFile(files, "users/", (err, data) => {
      if (!err) {
        resolve(data);
      } else {
        reject(err);
      }
    });
  })
    .then(async (fileUploadResponse) => {
      var valid_user = await new Promise((resolve, reject) => {
        UserModel.findOne(
          { _id: req.body.user_id, auth_key: req.body.auth_key },
          (err, user) => {
            if (!err) {
              resolve(user);
            } else {
              reject(err);
            }
          }
        );
      });
      if (valid_user) {
        console.log(fileUploadResponse.locations[0]);
        update_data.profile_pic = fileUploadResponse.locations[0];
        console.log(update_data);
        const updated_user = await new Promise((resolve, reject) => {
          UserModel.findOneAndUpdate(
            { _id: req.body.user_id },
            update_data,
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
            message: "User updated successfuly",
            data: updated_user,
          });
        } else {
          res.status(401).send({
            status: false,
            message: "Unable to update user",
            data: {},
          });
        }
      } else {
        res.status(401).send({
          status: false,
          message: "Authentication failed",
          data: {},
        });
      }
    })
    .catch((err) => {
      res.status(422).send({
        status: false,
        message: err.errors[0],
        data: {},
      });
    });
});

router.post("/updateSubscription", async (req, res) => {
  var current_date = new Date();
  var year = current_date.getFullYear();
  var month = current_date.getMonth();
  var day = current_date.getDate();
  var end_date = new Date(year, month + 3, day);
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOneAndUpdate(
      { _id: req.body.user_id, auth_key: req.body.auth_key },
      {
        $set: {
          "subscription.subscription_flag": req.body.status,
          "subscription.trail_complete": req.body.trail_complete,
          "subscription.subscription_type": "90 days trail",
          "subscription.subscription_start_date": current_date,
          "subscription.subscription_end_date": end_date,
        },
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
  });
  if (valid_user) {
    res.status(200).send({
      status: true,
      message: "User updated successfuly",
      data: valid_user,
    });
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {},
    });
  }
});

router.get("/getUser/:id/:user_id/:auth_key", async (req, res) => {
  console.log("in get user");
  console.log(req.params.id, req.params.auth_key);
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: req.params.id, auth_key: req.params.auth_key },
      (err, user) => {
        if (!err) {
          resolve(user);
        } else {
          reject(err);
        }
      }
    );
  });
  if (user_data) {
    console.log(user_data);
    UserModel.findOne({ _id: req.params.user_id }, function (err, user) {
      if (!err) {
        var end_user = {};
        end_user.firstName = user.firstName;
        end_user.lastName = user.lastName;
        end_user.email = user.email;
        end_user.mobile_no = user.mobile_no;
        end_user.profile_pic = user.profile_pic;
        if (user_data.admin) {
          end_user.images = user.images;
        }
        res.status(200).send({
          status: true,
          message: "User login successful",
          data: end_user,
        });
      } else {
        console.log("error occured");
        res.status(401).send({
          status: false,
          message: {
            en: "Invalid Credentials",
            fr: "Les informations invalids",
          },
          data: {},
        });
      }
    });
  } else {
    res.status(401).send({
      status: false,
      message: "User verification failed",
      data: {},
    });
  }
});

// router.get("/getAllUsers/:id/:auth_key", async (req, res) => {
router.get("/getAllUsers", async (req, res) => {
  // const user_data = await new Promise((resolve, reject) => {
  //   UserModel.findOne(
  //     { _id: req.params.id, auth_key: req.params.auth_key },
  //     (err, user) => {
  //       if (!err) {
  //         resolve(user);
  //       } else {
  //         reject(err);
  //       }
  //     }
  //   );
  // });
  // if(user_data && user_data.admin){
  UserModel.find({}, function (err, users) {
    if (!err) {
      res.status(200).send({
        status: true,
        message: "all users fetched",
        data: users,
      });
    } else {
      res.status(401).send({
        status: false,
        message: {
          en: "Invalid Credentials",
          fr: "Les informations invalids",
        },
        data: {},
      });
    }
  });
  // }else{
  //   res.status(403).send({
  //     status: false,
  //     message: "Access Denied",
  //     data: {}
  //   });
  // }
});

router.delete("/deleteUser/:admin_id/:user_id/:auth_key", async (req, res) => {
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: req.params.admin_id, auth_key: req.params.auth_key },
      (err, user) => {
        if (!err) {
          resolve(user);
        } else {
          reject(err);
        }
      }
    );
  });
  if (user_data && user_data.admin) {
    const removed_user = await new Promise((resolve, reject) => {
      UserModel.findOneAndRemove({ _id: req.params.user_id }, function (
        err,
        users
      ) {
        if (!err) {
          resolve(users);
        } else {
          reject(err);
        }
      });
    });
    if (removed_user) {
      SolutionModel.deleteMany({ user: req.params.user_id }, function (
        error,
        solutions
      ) {
        if (!error) {
          res.status(200).send({
            status: true,
            message: "user and solution deleted",
            data: solutions,
          });
        } else {
          res.status(401).send({
            status: false,
            message: "unable to delete solution",
            data: {},
          });
        }
      });
    } else {
      res.status(401).send({
        status: false,
        message: "unable to delete user",
        data: {},
      });
    }
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {},
    });
  }
});

router.get("/test",async (req, res) => {
  var num = "+9203009498431"
  console.log("in test",num);
  const test = await client.lookups
    .phoneNumbers(num).fetch({ countryCode: "US" }).then((phone_number) => {
      console.log(phone_number.phoneNumber);
      res.send(phone_number);
    })
    .catch((err) => {
      console.log(err);
      res.send(err);
    });
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
