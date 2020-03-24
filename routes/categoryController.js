var express = require("express");
var router = express.Router();
const Category = require("../models/category");
const UserModel = require("../models/user");
const path = require("path");
const aws = require("aws-sdk");
const multer = require("multer");
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const region = process.env.REGION;
var uploadFile = require("./fileUpload");

var storage = multer.memoryStorage();
var multipleUpload = multer({ storage: storage }).array("file");

router.get("/getAllCategories/:user_id", async (req, res) => {
  var valid_user = await new Promise((resolve, reject) => {
    UserModel.findOne({ _id: req.params.user_id }, (err, user) => {
      if (!err) {
        resolve(user);
      } else {
        reject(err);
      }
    });
  });
  if (valid_user.admin) {
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
    UserModel.findOne({ _id: req.params.user_id }, (err, user) => {
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
  var new_category = JSON.parse(req.body.new_category);
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
  console.log(valid_user);
  if (valid_user && valid_user.admin) {
    console.log(">>>>>>>>>>>>>>>>>>>");
    console.log(valid_user);
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
        var category = new Category();
        category.name_en = new_category.name_en;
        category.name_fr = new_category.name_fr;
        category.status = new_category.status;
        category.image = fileUploadResponse.locations[0];
        category.created_at = new Date();
        category.created_at = new Date();
        category.status = true;
        const saved_category = await new Promise((resolve, reject) => {
          console.log(">>>>>>>>>>>>>>saving category");
          Category.create(category,(err, added_category) => {
            if (!err) {
              resolve(added_category);
            } else {
              reject(err);
            }
          });
        });
        if (saved_category) {
          res.status(200).send({
            status: true,
            message: "category saved",
            data: saved_category
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
        console.log(err);
        res.status(422).send({
          status: false,
          message: err.errors,
          data: {}
        });
      });
  } else {
    console.log(err);
    res.status(403).send({
      status: false,
      message: "Access Denied",
      data: {}
    });
  }
});

router.put("/updateCategory", multipleUpload, async (req, res) => {
  var category = JSON.parse(req.body.update_data);
  const files = req.files;
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
  if (valid_user && valid_user.admin) {
    const fileUploadResponse = await new Promise((resolve, reject) => {
      uploadFile(files, "users/", (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    })
      .then(async fileUploadResponse => {
        if(fileUploadResponse.locations){
          category.image = fileUploadResponse.locations[0];
        }
        console.log(category);
        const updated_category = await new Promise((resolve, reject) => {
          Category.findOneAndUpdate(
            { _id: req.body.category_id },
            category,
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
        if (updated_category) {
          res.status(200).send({
            status: true,
            message: "Category updated successfuly",
            data: updated_category
          });
        } else {
          res.status(401).send({
            status: false,
            message: "Unable to update category",
            data: {}
          });
        }
      })
      .catch(err => {
        console.log(err);
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

router.delete("/category", async (req, res) => {
  console.log("in delete category");
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
  if (valid_user && valid_user.admin) {
    Category.findOneAndRemove(
      { _id: req.body.category_id },
      (err, category) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "Category deleted",
            data: category
          });
        } else {
          res.status(401).send({
            status: false,
            message: "Unable to delete category",
            data: err
          });
        }
      }
    );
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
