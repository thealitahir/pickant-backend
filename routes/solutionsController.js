var express = require("express");
var router = express.Router();
var SolutionModel = require("../models/solutions");
var UserModel = require("../models/user");
var ObjectID = require("objectid");
const client = require("twilio")(
  process.env.TWILIO_ACCOUNTSID,
  process.env.TWILIO_AUTHTOKEN
);
router.get("/getAllSolutions/:user_id/:auth_key/:role", async (req, res) => {
  console.log("in get all solutions");
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

router.post("/addSolution", async (req, res) => {
  console.log("in add solution");
  console.log(req.body);
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
    console.log("user validated");
    var solution_details = req.body;
    console.log(solution_details);
    var solution = new SolutionModel();
    solution.category = solution_details.category;
    solution.sub_category = solution_details.sub_category;
    solution.sub_category_price_dollar =
      solution_details.sub_category_price_dollar;
    solution.sub_category_price_euro = solution_details.sub_category_price_euro;
    solution.sub_category_price_fr = solution_details.sub_category_price_fr;
    solution.pickup_street_address = solution_details.pickup_street_address;
    solution.pickup_city = solution_details.pickup_city;
    solution.pickup_region = solution_details.pickup_region;
    solution.pickup_date = solution_details.pickup_date;
    solution.pickup_country = solution_details.pickup_country;
    solution.pickup_location.lat = solution_details.pickup_lat;
    solution.pickup_postal_address = solution_details.pickup_postal_address;
    solution.pickup_location.lng = solution_details.pickup_lng;
    solution.delivery_street_address = solution_details.delivery_street_address;
    solution.delivery_postal_address = solution_details.delivery_postal_address;
    solution.delivery_city = solution_details.delivery_city;
    solution.delivery_region = solution_details.delivery_region;
    solution.delivery_date = solution_details.delivery_date;
    solution.delivery_country = solution_details.delivery_country;
    solution.delivery_location.lat = solution_details.delivery_lat;
    solution.delivery_location.lng = solution_details.delivery_lng;
    solution.description = solution_details.description;
    solution.user = ObjectID(solution_details.user_id);
    solution.user_role = solution_details.user_role;
    const saved_solution = await new Promise((resolve, reject) => {
      solution.save((err, new_solution) => {
        if (!err) {
          resolve(new_solution);
        } else {
          reject(err);
        }
      });
    });
    if (saved_solution) {
      res.status(200).send({
        status: true,
        message: "solution saved",
        data: saved_solution
      });
    } else {
      res
        .status(400)
        .send({ status: false, message: "Unable to save solution", data: {} });
    }
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
    UserModel.findOne(
      { _id: solution.user_id, auth_key: solution.auth_key },
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
      const userAccepted = await new Promise((resolve, reject) => {
        UserModel.findOne({ _id: updated_solution.user }, (err, user) => {
          if (!err) {
            client.messages
              .create({
                body: `You order has been accepted by ${user.firstName} You can contact your supplier through email:${user.email} or through mobile number : ${user.mobile_no} `,
                from: "(717) 415-5703",
                to: user.mobile_no
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
        });
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
