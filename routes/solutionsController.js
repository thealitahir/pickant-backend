var express = require("express");
var router = express.Router();
var SolutionModel = require("../models/solutions");
var UserModel = require("../models/user");
var ObjectID = require("objectid");
// const translate = require('translate');
const translate = require("@vitalets/google-translate-api");

const client = require("twilio")(
  process.env.TWILIO_ACCOUNTSID,
  process.env.TWILIO_AUTHTOKEN
);
const multer = require("multer");
var uploadFile = require("./fileUpload");

var storage = multer.memoryStorage();
var multipleUpload = multer({ storage: storage }).array("file");
const mailer = require("./mailer");
const { sendNotificationToClient } = require("../notify");
const { addNotification } = require("../routes/notificationController");

router.get(
  "/getAllSolutions/:role",
  async (req, res) => {
    console.log("in get all solutions");
    console.log(req.params.role);
    // var valid_user = await new Promise((resolve, reject) => {
    //   UserModel.findOne(
    //     { _id: req.params.user_id, auth_key: req.params.auth_key },
    //     (err, user) => {
    //       if (!err) {
    //         resolve(user);
    //       } else {
    //         reject(err);
    //       }
    //     }
    //   );
    // });

    // if (valid_user) {
    SolutionModel.find({
      user_role: req.params.role,
      $or: [
        { status: "Pending" },
        { status: "Active" },
        { status: "Accepted" },
      ],
    })
      .populate("user")
      .exec((err, data) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "solutions found",
            data: data,
          });
        } else {
          res.status(400).send({
            status: false,
            message: "unable to find solutions",
            data: {},
          });
        }
      });
  }
  //    else {
  //     res.status(401).send({
  //       status: false,
  //       message: "Authentication failed",
  //       data: {}
  //     });
  //   }
  // }
);

router.get("/getCategorySolutions/:category_name/:role", async (req, res) => {
  SolutionModel.find({
    category: req.params.category_name,
    user_role: req.params.role,
  })
    .populate("user")
    .exec((err, data) => {
      if (!err) {
        res.status(200).send({
          status: true,
          message: "solutions found",
          data: data,
        });
      } else {
        res.status(400).send({
          status: false,
          message: "unable to find solutions",
          data: {},
        });
      }
    });
});

router.get(
  "/getSolutionDetails/:user_id/:solution_id/:role",
  async (req, res) => {
    console.log("in get solution details");
    var valid_user = await new Promise((resolve, reject) => {
      UserModel.findOne({ _id: req.params.user_id }, (err, user) => {
        if (!err) {
          resolve(user);
        } else {
          reject(err);
        }
      });
    });
    if (valid_user) {
      console.log("user validated");
      SolutionModel.findOne({
        _id: req.params.solution_id,
        user_role: req.params.role,
      })
        .populate("user")
        .exec((err, data) => {
          if (!err) {
            res.status(200).send({
              status: true,
              message: "solutions found",
              data: data,
            });
          } else {
            res.status(400).send({
              status: false,
              message: "unable to find solutions",
              data: {},
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

router.get("/getUserSolutions/:user_id/:auth_key", async (req, res) => {
  console.log("in get solution details");
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.find(
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
  if (valid_user) {
    SolutionModel.find({
      user: req.params.user_id,
    })
      .populate("user")
      .exec((err, data) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "solutions found",
            data: data,
          });
        } else {
          res.status(400).send({
            status: false,
            message: "unable to find solutions",
            data: {},
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
});

router.get(
  "/getSolutionUsers/:solution_id/:user_id/:auth_key",
  async (req, res) => {
    console.log("in get solution users details");
    var valid_user = await new Promise((resolve, reject) => {
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
    if (valid_user) {
      SolutionModel.findOne({
        _id: req.params.solution_id,
        $or: [
          { status: "Pending" },
          { status: "Active" },
          { status: "Accepted" },
          { status: "InActive" },
        ],
      })
        .populate("user")
        .populate("accepted_by")
        .exec((err, data) => {
          if (!err) {
            res.status(200).send({
              status: true,
              message: "solutions found",
              data: data,
            });
          } else {
            res.status(400).send({
              status: false,
              message: "unable to find solutions",
              data: {},
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

router.get("/getUserAcceptedSolutions/:user_id/:auth_key", async (req, res) => {
  console.log("in get User Accepted Solutions");
  var valid_user = await new Promise((resolve, reject) => {
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
  if (valid_user) {
    SolutionModel.find({ accepted_by: req.params.user_id })
      .populate("user")
      .exec((err, data) => {
        if (!err) {
          console.log(data);
          res.status(200).send({
            status: true,
            message: "solutions found",
            data: data,
          });
        } else {
          res.status(400).send({
            status: false,
            message: "unable to find solutions",
            data: {},
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
});

router.get(
  "/searchSolution/:user_id/:auth_key/:solutionType/:searchBy/:searchString",
  async (req, res) => {
    console.log(
      "in get search solution",
      req.params.solutionType,
      req.params.searchBy,
      req.params.searchString
    );
    var query = {};
    var searchBy = req.params.searchBy;
    console.log(req.params.searchString);
    frenchToEnglish(req.params.searchString, (englishString) => {
      englishToFrench(req.params.searchString, async (frenchString) => {
        if (searchBy == "pickup_country") {
          query = {
            user_role: req.params.solutionType,
            $or: [
              {
                pickup_country: {
                  $regex: new RegExp("^" + englishString.toLowerCase(), "i"),
                },
              },
              {
                pickup_country: {
                  $regex: new RegExp("^" + frenchString.toLowerCase(), "i"),
                },
              },
            ],
          };
        } else if (searchBy == "sub_category") {
          query = {
            user_role: req.params.solutionType,
            $or: [
              {
                "sub_category.en": {
                  $regex: new RegExp(
                    "^" + req.params.searchString.toLowerCase(),
                    "i"
                  ),
                },
              },
              {
                "sub_category.fr": {
                  $regex: new RegExp(
                    "^" + req.params.searchString.toLowerCase(),
                    "i"
                  ),
                },
              },
            ],
          };
        } else if (searchBy == "category") {
          query = {
            user_role: req.params.solutionType,
            $or: [
              {
                category: {
                  $regex: new RegExp("^" + englishString.toLowerCase(), "i"),
                },
              },
              {
                category: {
                  $regex: new RegExp("^" + frenchString.toLowerCase(), "i"),
                },
              },
            ],
          };
        } else if (searchBy == "pickup_city") {
          query = {
            user_role: searchString,
            $or: [
              {
                pickup_city: {
                  $regex: new RegExp("^" + englishString.toLowerCase(), "i"),
                },
              },
              {
                pickup_city: {
                  $regex: new RegExp(
                    "^" + req.params.frenchString.toLowerCase(),
                    "i"
                  ),
                },
              },
            ],
          };
        }
        console.log(query);
        var valid_user = await new Promise((resolve, reject) => {
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
        if (valid_user) {
          console.log(query);
          SolutionModel.find(query)
            .populate("user")
            .exec((err, data) => {
              if (!err) {
                res.status(200).send({
                  status: true,
                  message: "solutions found",
                  data: data,
                });
              } else {
                res.status(400).send({
                  status: false,
                  message: "unable to find solutions",
                  data: {},
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
      });
    });
  }
);

router.put("/rejectSolution", async (req, res) => {
  console.log("in reject Solution");
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
    SolutionModel.findOneAndUpdate(
      { _id: req.body.solution_id },
      {
        $set: {
          accepted_by: null,
        },
      },
      { new: true },
      (err, solution) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "Solution updated successfuly",
            data: solution,
          });
        } else {
          res.status(409).send({
            status: false,
            message: "unable to update solution",
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

router.post("/addSolution", multipleUpload, async (req, res) => {
  console.log("in add solution");
  const files = req.files;
  console.log(req.files);
  var solution = new SolutionModel();
  var solution_details = JSON.parse(req.body.new_solution);
  console.log(solution);
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: req.body.user, auth_key: req.body.auth_key },
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
    const fileUploadResponse = await new Promise((resolve, reject) => {
      uploadFile(files, "categories/", (err, data) => {
        console.log("file upload response ");
        console.log(">>>>>>>>>>>>", err);
        console.log("<<<<<<<<<<<<", data);
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    })
      .then(async (fileUploadResponse) => {
        solution.category = solution_details.category;
        solution.sub_category.en = solution_details.en;
        solution.sub_category.fr = solution_details.fr;
        solution.display_price = solution_details.display_price;
        solution.sub_category_price_dollar =
          solution_details.sub_category_price_dollar;
        solution.sub_category_price_euro =
          solution_details.sub_category_price_euro;
        solution.sub_category_price_fr = solution_details.sub_category_price_fr;
        solution.pickup_street_address = solution_details.pickup_street_address;
        solution.pickup_city = solution_details.pickup_city;
        solution.pickup_region = solution_details.pickup_region;
        solution.pickup_date = solution_details.pickup_date;
        solution.pickup_country = solution_details.pickup_country;
        solution.pickup_location.lat = solution_details.pickup_lat;
        solution.pickup_location.lng = solution_details.pickup_lng;
        solution.pickup_postal_address = solution_details.pickup_postal_address;
        solution.delivery_street_address =
          solution_details.delivery_street_address;
        solution.delivery_postal_address =
          solution_details.delivery_postal_address;
        solution.delivery_city = solution_details.delivery_city;
        solution.delivery_region = solution_details.delivery_region;
        solution.delivery_date = solution_details.delivery_date;
        solution.delivery_country = solution_details.delivery_country;
        solution.delivery_location.lat = solution_details.delivery_lat;
        solution.delivery_location.lng = solution_details.delivery_lng;
        solution.description = solution_details.description;
        solution.display_price = solution_details.display_price;
        solution.user = ObjectID(solution_details.user);
        solution.user_role = solution_details.user_role;
        solution.images = fileUploadResponse.locations;
        console.log(solution);
        const saved_solution = await new Promise((resolve, reject) => {
          SolutionModel.create(solution, (err, new_solution) => {
            if (!err) {
              resolve(new_solution);
            } else {
              reject(err);
            }
          });
        });
        if (saved_solution) {
          console.log(saved_solution);
          res.status(200).send({
            status: true,
            message: "solution saved",
            data: saved_solution,
          });
        } else {
          res.status(400).send({
            status: false,
            message: "Unable to save solution",
            data: {},
          });
        }
      })
      .catch((err) => {
        console.log("error occured");
        console.log(err);
        res.status(422).send({
          status: false,
          message: err.errors,
          data: {},
        });
      });
  } else {
    res
      .status(401)
      .send({ status: false, message: "User authentication failed", data: {} });
  }
});

router.put("/solutionAccepted", async (req, res) => {
  console.log("in solutionAccepted", req.body);
  const solution = req.body;
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ _id: solution.user_id }, (err, user) => {
      if (!err) {
        console.log("USER", user);
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user) {
    const updated_solution = await new Promise((resolve, reject) => {
      SolutionModel.findOneAndUpdate(
        { _id: solution.solution_id },
        {
          $set: {
            status: "Accepted",
            accepted_by: ObjectID(solution.accepted_by),
          },
        },
        { new: true }
      )
        .populate("user")
        .exec((err, data) => {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        });
    });
    if (updated_solution) {
      console.log("Valid", valid_user);
      const userAccepted = await new Promise((resolve, reject) => {
        var new_price = solution.old_balance + solution.price;
        UserModel.findOneAndUpdate(
          { _id: solution.accepted_by },
          {
            $set: {
              wallet: new_price,
            },
          },
          { new: true },
          (err, user) => {
            if (!err) {
              console.log(user);
              client.messages
                .create({
                  body: `Pickant: Offer accepted by ${user.firstName}. Call : ${user.mobile_no} Email:${user.email}`,
                  from: "(717) 415-5703",
                  to: valid_user.mobile_no,
                })
                .then((message) => {
                  resolve(message);
                })
                .catch((error) => {
                  reject(error);
                });
            } else {
              reject(error);
            }
          }
        );
      });
      res.status(200).send({
        status: true,
        message: "Solution updated successfuly",
        data: updated_solution,
      });
    } else {
      res.status(409).send({
        status: false,
        message: "unable to update solution",
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

router.delete("/deleteSolution/:user_id/:solution_id", async (req, res) => {
  console.log("deleteSolution", req.body);
  const solution = req.body;
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ _id: req.params.user_id }, (err, user) => {
      if (!err) {
        console.log("USER", user);
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user) {
    const deleted_solution = await new Promise((resolve, reject) => {
      SolutionModel.remove({ _id: req.params.solution_id }, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
    if (deleted_solution) {
      res.status(200).send({
        status: true,
        message: "Solution deleted",
        data: deleted_solution,
      });
    } else {
      res.status(401).send({
        status: true,
        message: "Unable to update solution",
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

//  API for updateSolutionStatus
router.put("/updateSolutionStatus", async (req, res) => {
  console.log("updateSolutionStatus", req.body);
  const solution = req.body;
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ _id: solution.user_id }, (err, user) => {
      if (!err) {
        console.log("USER", user);
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user) {
    const updated_solution = await new Promise((resolve, reject) => {
      SolutionModel.findOneAndUpdate(
        { _id: solution.solution_id },
        {
          $set: {
            status: `${solution.status}`,
            accepted_by: ObjectID(solution.accepted_by),
          },
        },
        { new: true }
      )
        .populate("user")
        .exec((err, data) => {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        });
    });
    if (updated_solution) {
      res.status(200).send({
        status: true,
        message: "Solution updated",
        data: updated_solution,
      });
    } else {
      res.status(401).send({
        status: true,
        message: "Unable to update solution",
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

router.post("/solutionClicked", async (req, res) => {
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ _id: req.body.user_id }, (err, user) => {
      if (!err) {
        console.log("USER", user);
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user && valid_user.device_token) {
    var notificationOptions = {
      message_en: "Someone viewed your offer",
      message_fr: "Quelqu'un a consulté votre offre",
      status: "true",
      user_id: valid_user._id,
    };
    addNotification(notificationOptions, (data) => {
      if (data) {
        var mailOptions = {
          to: valid_user.email,
          subject: "PickantApp Notification",
          text: `Hi, someone just viewed your offer`,
        };
        mailer.sendMail(mailOptions, function (err, info) {
          if (err) {
            console.log(err.response.body);
            res.status(409).send({
              status: false,
              message: "Error while sending email",
              data: {},
            });
          } else {
            const pushNotificationOPtions = {
              title: `Profile Viewed`,
              message: `Someone just viewed your offer`,
            };
            var tokens = valid_user.device_token;
            sendNotificationToClient(tokens,pushNotificationOPtions, (response) => {
              console.log("back from push notification", response);
              if (response) {
                res.status(200).send({
                  status: true,
                  message: "All notifications sent",
                });
              } else {
                res.status(409).send({
                  status: false,
                  message: "Error while sending push notification",
                  data: {},
                });
              }
            });
          }
        });
      } else {
        res.status(409).send({
          status: false,
          message: "Error while sending in app notification",
          data: {},
        });
      }
    });
  } else {
    res.status(401).send({
      status: false,
      message: "User not found",
      data: {},
    });
  }
});


router.get("/test", async (req, res) => {
  const pushNotificationOPtions = {
    title: `Profile Viewed`,
    message: `Someone just viewed your offer`,
  };
  sendNotificationToClient(["chPP5GpddsquPU6c_6xSc8:APA91bE4SCf1hWtotfZ_ZUYXBXxjLGlrgUpzJUHv77eN5OICJv4rqEUjfBuoO619uYWoIZt--CBlB4QI1vPFxVOElGttqpqglkiW8ksVNy_unjWeThDSJlBd1Cq4dV9xqye3AwOtrjEQ"], pushNotificationOPtions, (response) => {
    console.log("RESPONSE", response);
  })
  // console.log("in test");
  // var s = "é, è, ë, ê, à, â, î, ï, ô, ü, ù, û, ÿ,é,ë";
  // var s = "équipement";
  // frenchToEnglish(s, (data) => {
  //   console.log("returned response########", data);
  //   res.send(data);
  // });
  // var query = /.*;
  /* SolutionModel.find(
    {
      user_role: "provideSolution",
      '$or': [
        { "sub_category.en": { $regex: "Storage" } },
        { "sub_category.fr": { $regex: "Storage" } },
      ],
    },
    (err, data) => {
      console.log(data);
      console.log(err);
      res.send(data);
    }
  ); */
  //res.send("Hello from test");
});

function frenchToEnglish(text, cb) {
  console.log("in frenchToEnglish", text);
  translate(text.toLowerCase(), { to: "en" })
    .then((res) => {
      console.log("response >>>>> ", res);
      // console.log(res.from.language.iso);
      cb(res.text);
    })
    .catch((err) => {
      console.error(err);
    });
  /* var str = text
    .replace(/é|_/g, "e")
    .replace(/è|_/g, "e")
    .replace(/ë|_/g, "e")
    .replace(/ê|_/g, "e")
    .replace(/à|_/g, "a")
    .replace(/â|_/g, "a")
    .replace(/î|_/g, "i")
    .replace(/ï|_/g, "i")
    .replace(/ô|_/g, "o")
    .replace(/ü|_/g, "u")
    .replace(/ù|_/g, "u")
    .replace(/û|_/g, "u")
    .replace(/ÿ|_/g, "y");
  console.log(str);
  return str; */
}

function englishToFrench(text, cb) {
  console.log("in englishToFrench", text);
  translate(text.toLowerCase(), { to: "fr" })
    .then((res) => {
      console.log("response >>>>> ", res);
      // console.log(res.from.language.iso);
      cb(res.text);
    })
    .catch((err) => {
      console.error(err);
    });
}
module.exports = router;
