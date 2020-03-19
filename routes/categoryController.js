var express = require("express");
var router = express.Router();
const Category = require("../models/category");
const User = require("../models/user");
const path = require("path");
const aws = require("aws-sdk");
const multer = require("multer");
var UserModel = require("../models/user");

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const region = process.env.REGION;
var uploadFile = require("./fileUpload");

var storage = multer.memoryStorage();
var multipleUpload = multer({ storage: storage }).array("file");

router.get("/getAllCategories/:user_id", async (req, res) => {
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.find({ _id: req.params.user_id }, (err, user) => {
      if (!err) {
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user[0].admin) {
    Category.find({}, (error, categories) => {
      if (!error) {
        res.status(200).send({
          status: true,
          message: "categories found",
          data: categories
        });
      } else {
        res.status(400).send({
          status: true,
          message: "Unable to get categories",
          data: []
        });
      }
    });
  } else {
    res.status(403).send({
      status: false,
      message: "Access Denied",
      data: []
    });
  }
});

router.get("/getCategory/:category_id/:user_id", async (req, res) => {
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.find({ _id: req.params.user_id }, (err, user) => {
      if (!err) {
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user.admin) {
    Category.findOne({ _id: req.params.category_id }, (error, category) => {
      if (!error) {
        res.status(200).send({
          status: true,
          message: "categories found",
          data: category
        });
      } else {
        res.status(400).send({
          status: true,
          message: "Unable to get categoies",
          data: {}
        });
      }
    });
  } else {
    res.status(403).send({
      status: false,
      message: "Access Denied",
      data: {}
    });
  }
});

router.post("/addCategory", multipleUpload, async (req, res) => {
  console.log("in add category");
  const files = req.files;
  var new_category = new Category();
  new_category = JSON.parse(req.body.new_category);
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.find(
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
  if (valid_user && valid_user.admin) {
    const fileUploadResponse = await new Promise((resolve, reject) => {
      uploadFile(files, "categories/", (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    })
      .then(async fileUploadResponse => {
        /* var category = new Category();
        category.name_en = new_category.name_en;
        category.name_fr = new_category.name_fr;
        category.status = new_category.status;
        category.created_at = new Date.now();
        category.image = fileUploadResponse.locations[0];
        category.updated_at = new Date.now(); */
        new_category.image = fileUploadResponse.locations[0];
        new_category.created_at = new Date.now();
        new_category.updated_at = new Date.now();
        const saved_category = await new Promise((resolve, reject) => {
          new_category.save((err, added_category) => {
            if (!err) {
              resolve(added_category);
            } else {
              reject(err);
            }
          });
        });
        if (added_category) {
          res.status(200).send({
            status: true,
            message: "category saved",
            data: saved_solution
          });
        } else {
          res.status(400).send({
            status: false,
            message: "Unable to save category",
            data: {}
          });
        }
      })
      .catch(err => {
        res.status(422).send({
          status: false,
          message: err.errors,
          data: {}
        });
      });
  } else {
    res.status(403).send({
      status: false,
      message: "Access Denied",
      data: {}
    });
  }
});

router.post("/test", (req, res) => {});

module.exports = router;
