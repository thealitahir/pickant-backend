var express = require("express");
var router = express.Router();
var SolutionModel = require("../models/solutions");
var UserModel = require("../models/user");
var ObjectID = require("objectid");
const client = require("twilio")(
  process.env.TWILIO_ACCOUNTSID,
  process.env.TWILIO_AUTHTOKEN
);
const multer = require("multer");
var uploadFile = require("./fileUpload");

var storage = multer.memoryStorage();
var multipleUpload = multer({ storage: storage }).array("file");

router.get("/getAllSolutions/:user_id/:auth_key/:role", async (req, res) => {
  console.log("in get all solutions");
  console.log(req.params.user_id, req.params.auth_key, req.params.role);
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
    SolutionModel.find({ user_role: req.params.role, status: "Pending" })
      .populate("user")
      .exec((err, data) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "solutions found",
            data: data
          });
        } else {
          res.status(400).send({
            status: false,
            message: "unable to find solutions",
            data: {}
          });
        }
      });
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {}
    });
  }
});

router.get(
  "/getSolutionDetails/:user_id/:auth_key/:solution_id/:role",
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
        user_role: req.params.role
      })
        .populate("user")
        .exec((err, data) => {
          if (!err) {
            res.status(200).send({
              status: true,
              message: "solutions found",
              data: data
            });
          } else {
            res.status(400).send({
              status: false,
              message: "unable to find solutions",
              data: {}
            });
          }
        });
    } else {
      res.status(401).send({
        status: false,
        message: "Authentication failed",
        data: {}
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
      user: req.params.user_id
    })
      .populate("user")
      .exec((err, data) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "solutions found",
            data: data
          });
        } else {
          res.status(400).send({
            status: false,
            message: "unable to find solutions",
            data: {}
          });
        }
      });
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {}
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
        status: "Accepted"
      })
        .populate("user")
        .populate("accepted_by")
        .exec((err, data) => {
          if (!err) {
            res.status(200).send({
              status: true,
              message: "solutions found",
              data: data
            });
          } else {
            res.status(400).send({
              status: false,
              message: "unable to find solutions",
              data: {}
            });
          }
        });
    } else {
      res.status(401).send({
        status: false,
        message: "Authentication failed",
        data: {}
      });
    }
  }
);

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
        console.log(">>>>>>>>>>>>",err);
        console.log("<<<<<<<<<<<<",data);
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    })
      .then(async fileUploadResponse => {
        solution.category = solution_details.category;
        solution.sub_category.en = solution_details.en;
        solution.sub_category.fr = solution_details.fr;
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
            data: saved_solution
          });
        } else {
          res.status(400).send({
            status: false,
            message: "Unable to save solution",
            data: {}
          });
        }
      })
      .catch(err => {
        console.log("error occured");
        console.log(err);
        res.status(422).send({
          status: false,
          message: err.errors,
          data: {}
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
            accepted_by: ObjectID(solution.accepted_by)
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
    if (updated_solution) {
      console.log("Valid", valid_user);
      const userAccepted = await new Promise((resolve, reject) => {
        var new_price = solution.old_balance + solution.price;
        UserModel.findOneAndUpdate(
          { _id: solution.accepted_by },
          {
            $set: {
              wallet: new_price
            }
          },
          { new: true },
          (err, user) => {
            if (!err) {
              console.log(user);
              client.messages
                .create({
                  body: `Pickant App: Your offer is accepted by ${user.firstName} You can contact your supplier through email:${user.email} or through mobile number : ${user.mobile_no} `,
                  from: "(717) 415-5703",
                  to: valid_user.mobile_no
                })
                .then(message => {
                  resolve(message);
                })
                .catch(error => {
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
        data: updated_solution
      });
    } else {
      res.status(409).send({
        status: false,
        message: "unable to update solution",
        data: {}
      });
    }
  } else {
    res.status(401).send({
      status: false,
      message: "Authentication failed",
      data: {}
    });
  }
});

router.post("/test", (req, res) => {
  console.log("in test");
  UserModel.findOne({ _id: "5e4a250e594e090510f65cb9" }, (err, data) => {
    res.send(data);
  });
  //res.send("Hello from test");
});

module.exports = router;
