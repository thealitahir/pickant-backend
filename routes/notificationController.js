var express = require("express");
var router = express.Router();
const request = require("request");
var NotificationModel = require("../models/notifications");
var UserModel = require("../models/user");

router.post("/notifySpecificUsers", async (req, res) => {
  console.log("notify specific users");
  console.log(req.body);
  const admin = await new Promise((resolve, reject) => {
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
  if (admin && admin.admin) {
    console.log("inserting all records");
    NotificationModel.insertMany(req.body.users, (err, data) => {
      if (!err) {
        res.status(200).send({
          status: true,
          message: "notifications added",
          data: data
        });
      } else {
        res.status(401).send({
          status: true,
          message: "unable to add notifications",
          data: []
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

router.post("/notifyAllUsers", async (req, res) => {
  console.log("notify all users");
  console.log(req.body);
  const admin = await new Promise((resolve, reject) => {
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
  if (admin && admin.admin) {
    const all_users = await new Promise((resolve, reject) => {
      UserModel.find({}, (error, users) => {
        if (!error) {
          resolve(users);
        } else {
          reject(error);
        }
      });
    });
    if (all_users) {
      var users = [];
      var obj = {
        user_id: "",
        message_en: req.body.message_en,
        message_fr: req.body.message_fr,
        status: true,
        created_at: Date.now()
      };
      for (var i = 0; i < all_users.length; i++) {
        if (all_users[i]._id != admin._id) {
          console.log(all_users[i]._id);
          var id = all_users[i]._id;
          obj.user_id = id.toString();
          users.push(obj);
          obj = {
            user_id: "",
            message_en: req.body.message_en,
            message_fr: req.body.message_fr,
            status: true,
            created_at: Date.now()
          };
        }
      }
      console.log(users);
      NotificationModel.insertMany(users, (err, data) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "notifications added",
            data: data
          });
        } else {
          console.log(err);
          res.status(401).send({
            status: true,
            message: "unable to add notifications",
            data: []
          });
        }
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

router.get("/getUserNotif/:user_id", (req, res) => {
  console.log("get user notification");
  NotificationModel.find(
    { user_id: req.params.user_id },
    (err, notifications) => {
      if (!err) {
        res.status(200).send({
          status: true,
          message: "User notifications",
          data: notifications
        });
      } else {
        res.status(401).send({
          status: false,
          message: "Unable to get user notifications",
          data: {}
        });
      }
    }
  );
});

router.put("/updateNotification", (req, res) => {
  console.log("update notification");
  NotificationModel.findOneAndUpdate(
    { _id: req.body.id },
    {
      $set: {
        status: false
      }
    },
    { new: true },
    (err, notification) => {
      if (!err) {
        res.status(200).send({
          status: true,
          message: "User notification updated",
          data: notification
        });
      } else {
        res.status(401).send({
          status: false,
          message: "Unable to get update notification",
          data: {}
        });
      }
    }
  );
});

module.exports = router;
