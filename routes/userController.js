var express = require("express");
var router = express.Router();
var UserModel = require("../models/user");
var SolutionModel = require("../models/solutions");
var VerificationModel = require("../models/verification");
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
const service = client.notify.services(
  process.env.TWILIO_MESSAGING_SERVICE_SID
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
      {
        $or: [{ mobile_no: creds.email }, { email: creds.email }],
        password: creds.password,
      },
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
        {
          $or: [
            { mobile_no: creds.email },
            { email: creds.email.toLowerCase() },
          ],
        },
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
    validateNumber(newUser.mobile_no, async (error, validate_number) => {
      if (!error) {
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
        newUser.created_at = Date.now();
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
      } else {
        res.status(401).send({
          status: false,
          message: "Number not valid",
          data: {},
        });
      }
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
        .catch((err) => {
          console.log("in reject");
          console.log(err);
          reject(err);
        });
    })
      .then(async (validate_number) => {
        console.log("number validated");
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
          console.log("+++++++++ updating db++++++++++++++++++", mobile_no);
          const updated_user = await new Promise((resolve, reject) => {
            VerificationModel.findOneAndUpdate(
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
          res.status(401).send({
            status: false,
            message: "Unable to send message",
            data: {},
          });
        }
      })
      .catch((err) => {
        console.log(err);
        console.log("invalid number");
        res.status(404).send({
          status: false,
          message: "Invalid Number",
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

router.post("/sendBulkMessages", async (req, res) => {
  console.log(" in send bulk messages");
  console.log(req.body);
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: req.body.admin_id, auth_key: req.body.auth_key },
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
    const bindings = req.body.numbers.map((number) => {
      return JSON.stringify({ binding_type: "sms", address: number });
    });
    service.notifications
      .create({
        toBinding: bindings,
        body: req.body.message,
      })
      .then((notification) => {
        console.log(notification);
        console.log("Messages sent!");
        res.status(200).send({
          status: true,
          message: "messages sent to all numbers",
          data: notification,
        });
      })
      .catch((err) => {
        console.error(err);
        res.status(401).send({
          status: false,
          message: "Invalid number found",
          data: err,
        });
      });
    /* Promise.all(
      req.body.numbers.map((number) => {
        return client.messages.create({
          to: number,
          from: process.env.TWILIO_MESSAGING_SERVICE_SID,
          body: req.body.message,
        });
      })
    )
      .then((messages) => {
        console.log("Messages sent!");
        res.status(200).send({
          status: true,
          message: "messages sent to all numbers",
          data: updated_user,
        });
      })
      .catch((err) => {
        console.error(err);
        res.status(401).send({
          status: false,
          message: "Invalid number found",
          data: err,
        });
      }); */
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {},
    });
  }
});

router.post("/sendMessagesToAllUsers", async (req, res) => {
  console.log(" in send messages to all users");
  console.log(req.body);
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: req.body.admin_id, auth_key: req.body.auth_key },
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
    var all_users = await new Promise((resolve, reject) => {
      UserModel.find({ admin: false }, (error, users) => {
        if (!error) {
          resolve(users);
        } else {
          reject(error);
        }
      });
    });
    if (all_users) {
      var numbers = [];
      invalid_numbers = [];
      const bindings = [];
      var i = 0;
      all_users.map((user) => {
        // console.log(user["mobile_no"]);
        validateNumber(user["mobile_no"], (err, data) => {
          i++;
          if (!err && user) {
            numbers.push(user["mobile_no"]);
            bindings.push(
              JSON.stringify({
                binding_type: "sms",
                address: user["mobile_no"],
              })
            );
          } else if (user) {
            invalid_numbers.push(user["mobile_no"]);
          }
          if (i == all_users.length) {
            service.notifications
              .create({
                toBinding: bindings,
                body: req.body.message,
              })
              .then((notification) => {
                console.log(notification);
                console.log("Messages sent!");
                res.status(200).send({
                  status: true,
                  message: "messages sent to all numbers",
                  data: { notification, invalid_numbers },
                });
              })
              .catch((err) => {
                console.error(err);
              });
          }
        });
      });

      /* for (var i = 0; i < all_users.length; i++) {
        validateNumber(all_users[i]["mobile_no"], (err, data) => {
          if (!err && all_users[i]) {
            numbers.push(all_users[i]["mobile_no"]);
          } else if(all_users[i]) {
            invalid_numbers.push(all_users[i]["mobile_no"]);
          }
        });
      }
      const bindings = numbers.map((number) => {
        return JSON.stringify({ binding_type: "sms", address: number });
      });
      res.send({bindings,numbers}); */
      /* service.notifications
        .create({
          toBinding: bindings,
          body: req.body.message,
        })
        .then((notification) => {
          console.log(notification);
          console.log("Messages sent!");
          res.status(200).send({
            status: true,
            message: "messages sent to all numbers",
            data: { notification, invalid_numbers },
          });
        })
        .catch((err) => {
          console.error(err);
           res.status(401).send({
            status: false,
            message: "Invalid number found",
            data: err,
          });
        }); */
      /* Promise.all(
        numbers.map((number) => {
          return client.messages.create({
            to: number,
            from: process.env.TWILIO_MESSAGING_SERVICE_SID,
            body: req.body.message,
          });
        })
      )
        .then((messages) => {
          console.log("Messages sent!");
          res.status(200).send({
            status: true,
            message: "messages sent to all numbers",
            data: updated_user,
          });
        })
        .catch((err) => {
          console.error(err);
          res.status(401).send({
            status: false,
            message: "Invalid number found",
            data: err,
          });
        }); */
    } else {
      res.status(401).send({
        status: false,
        message: "Unable to get users",
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

router.post("/codeValidation", async (req, res) => {
  console.log(req.body.mobile_no, req.body.code);
  const user_data = await new Promise((resolve, reject) => {
    VerificationModel.findOne(
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
    console.log("code verified", user_data);
    res
      .status(200)
      .send({ status: true, message: "Code verified", data: user_data });
  } else {
    console.log("Unable to verify code");
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

router.get(
  "/getUsers/:admin_id/:auth_key/:search_type/:searchString",
  async (req, res) => {
    console.log("in get users");
    console.log(req.params.admin_id);
    console.log(req.params.auth_key);
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
    if (user_data) {
      var query = {};
      if (req.params.search_type === "mobile") {
        var mobile_no = "";
        if (req.params.searchString[0] == "+") {
          mobile_no = req.params.searchString.substr(1);
        } else {
          mobile_no = req.params.searchString;
        }
        query = {
          mobile_no: {
            $regex: new RegExp(mobile_no, "i"),
          },
        };
      } else if (req.params.search_type === "name") {
        query = {
          $or: [
            {
              firstName: {
                $regex: new RegExp("^" + req.params.searchString, "i"),
              },
            },
            {
              lastName: {
                $regex: new RegExp("^" + req.params.searchString, "i"),
              },
            },
          ],
        };
      } else if (req.params.search_type === "email") {
        query = {
          email: {
            $regex: new RegExp("^" + req.params.searchString, "i"),
          },
        };
      }
      console.log(query);
      UserModel.find(query, (err, users) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "users fetched",
            data: users,
          });
        } else {
          res.status(400).send({
            status: false,
            message: "unable to fetch users",
            data: [],
          });
        }
      });
    } else {
      res.status(401).send({
        status: false,
        message: "Authentication failed",
        data: {},
      });
    }
  }
);

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

router.put(
  "/updateUserSubscription/:admin_id/:auth_key/:user_id/:subscription",
  async (req, res) => {
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
    var set = {};
    if (user_data) {
      if (req.params.subscription) {
        var current_date = new Date();
        var year = current_date.getFullYear();
        var month = current_date.getMonth();
        var day = current_date.getDate();
        var end_date = new Date(year + 1, month, day);
        set = {
          $set: {
            "subscription.subscription_flag": req.params.subscription,
            "subscription.subscription_type": "yearly payment",
            "subscription.subscription_start_date": current_date,
            "subscription.subscription_end_date": end_date,
          },
        };
      } else {
        set = {
          $set: {
            "subscription.subscription_flag": req.params.subscription,
            "subscription.subscription_type": "",
            "subscription.subscription_start_date": null,
            "subscription.subscription_end_date": null,
          },
        };
      }

      UserModel.findOneAndUpdate(
        { _id: req.params.user_id },
        set,
        { new: true },
        (err, user) => {
          if (!err) {
            res.status(200).send({
              status: true,
              message: "Users subscription updated",
              data: user,
            });
          } else {
            res.status(401).send({
              status: false,
              message: "Unable to update user subscription",
              data: {},
            });
          }
        }
      );
    } else {
      res.status(401).send({
        status: false,
        message: "Authentication failed",
        data: {},
      });
    }
  }
);

router.put("/makeVip/:admin_id/:auth_key/:user_id/:vip", async (req, res) => {
  const user_data = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: req.params.user_id, auth_key: req.params.auth_key },
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
    UserModel.findOneAndUpdate(
      { _id: req.params.user_id },
      {
        $set: {
          vip: req.params.vip,
        },
      },
      { new: true },
      (err, updated_user) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "User VIP status changed",
            data: updated_user,
          });
        } else {
          res.status(400).send({
            status: false,
            message: "Unable to change user VIP status",
            data: {},
          });
        }
      }
    );
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {},
    });
  }
});

router.get("/test", async (req, res) => {
  var numbers = ["+923009498431"];
  var message = "hello from the other side";
  const client2 = require("twilio")(
    "ACa0ffacadbcf88c4dcc6c4fbf17df3e17",
    "7974983cf56ddfde1e0d573caafa89dd"
  );
  const service2 = client2.notify.services(
    "ISe6e3c803300f2527cc0baa9410f4b7b4"
  );
  const bindings = numbers.map((number) => {
    return JSON.stringify({ binding_type: "sms", address: number });
  });
  service2.notifications
    .create({
      toBinding: bindings,
      body: message,
    })
    .then((notification) => {
      console.log(notification);
      console.log("Messages sent!");
      res.status(200).send({
        status: true,
        message: "messages sent to all numbers",
        data: notification,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(401).send({
        status: false,
        message: "Invalid number found",
        data: err,
      });
    });
  /* UserModel.find({ admin: true }, (error, users) => {
    if (!error) {
      var numbers = [];
      // console.log(users[0]["mobile_no"]);
      // for (var i = 0; i < users.length; i++) {
      //   numbers.push(users[i]["mobile_no"]);
      // }
      res.send(users);
    } else {
      res.send(error);
    }
  }); */
  /* var num = "+9203009498431";
  console.log("in test", num);
  const test = await client.lookups
    .phoneNumbers(num)
    .fetch({ countryCode: "US" })
    .then((phone_number) => {
      console.log(phone_number.phoneNumber);
      res.send(phone_number);
    })
    .catch((err) => {
      console.log(err);
      res.send(err);
    }); */
});

router.post("/updateVerificationImage", multipleUpload, async (req, res) => {
  console.log("in updateVerificationImage");
  const files = req.files;
  console.log(req.body);
  console.log(files.length);
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
      console.log("file uploaded >>>>>");
      var valid_user = await new Promise((resolve, reject) => {
        UserModel.findOne({ _id: req.body.user_id }, (err, user) => {
          if (!err) {
            resolve(user);
          } else {
            reject(err);
          }
        });
      });
      if (valid_user) {
        console.log(fileUploadResponse.locations);
        update_data.images = fileUploadResponse.locations;
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
          message: "user not found",
          data: {},
        });
      }
    })
    .catch((err) => {
      console.log(err.errors);
      res.status(422).send({
        status: false,
        message: err.errors,
        data: {},
      });
    });
});

router.get("/bulkCreate", (req, res) => {
  /* UserModel.updateMany({ "created_at" : { $exists : true } }, {$set: {old_flag: true}},(err,data)=>{
    if(!err){
      res.send(data);
    }else{
      res.send(err);
    }
  }) */
  const oldUser = [
    {
      firstName: "fallou",
      lastName: "",
      email: "falloudiagne690@yahoo.com",
      mobile_no: "+221776143042",
      password: "123123",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Bassirou",
      lastName: "Diémé",
      email: "bassedieme251085@yahoo.com",
      mobile_no: "+221772153677",
      password: "123123",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "cheikh",
      lastName: "",
      email: "kheuchdi8089@gmail.com",
      mobile_no: "+221770951212",
      password: "123123",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "francois",
      lastName: "",
      email: "adsaffairsen@outlook.com",
      mobile_no: "+221771376310",
      password: "123123",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Mariama",
      lastName: "",
      email: "baldemariama972@gmail.com",
      password: "123123",
      mobile_no: "+221775389923",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Mamadou moctar cisse",
      lastName: "",
      email: "cmatar576@gmail.com",
      mobile_no: "+221774593839",
      password: "123123",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "aboubacrine",
      lastName: "",
      email: "aboubacrinediouf844@gmail.com",
      mobile_no: "+221785558570",
      password: "123123",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Francois",
      lastName: "Corea",
      email: "francoiscorea22@gmail.com",
      password: "123123",
      mobile_no: "+221777076470",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Francois",
      lastName: "Corea",
      email: "francoiscorea@gmail.com",
      password: "123123",
      mobile_no: "+221762084274",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Andy",
      lastName: "souza",
      email: "souzandy19@gmail.com",
      password: "123123",
      mobile_no: "+221773928507",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "djiby",
      lastName: "",
      email: "djiby.so19@gmail.com",
      password: "123123",
      mobile_no: "221779222444",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
    {
      firstName: "Ibrahima",
      lastName: "Diallo",
      email: "ibrahimadiallopellaltoul100@gmail.com",
      password: "123123",
      mobile_no: "+221761938988",
      admin: false,
      identity_flag: false,
      verified: false,
      old_flag: true,
    },
  ];
  UserModel.insertMany(oldUser, (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.send(err);
    }
  });
});

function validateNumber(number, cb) {
  client.lookups
    .phoneNumbers(number)
    .fetch({ countryCode: "US" })
    .then((phone_number) => {
      mobile_no = phone_number.phoneNumber;
      cb(null, phone_number);
    })
    .catch((err) => {
      cb(err, null);
    });
}

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