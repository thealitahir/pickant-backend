var express = require("express");
var router = express.Router();
const Category = require("../models/category");
const SubCategory = require("../models/subCategory");
const User = require("../models/user");
const multer = require("multer");
var uploadFile = require("./fileUpload");

var storage = multer.memoryStorage();
var multipleUpload = multer({ storage: storage }).array("file");

router.get("/getAllSubCategories/:user_id", async (req, res) => {
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
    SubCategory.find({}, (error, subCategories) => {
      if (!error) {
        res.status(200).send({
          status: true,
          message: "subCategories found",
          data: subCategories
        });
      } else {
        res.status(400).send({
          status: true,
          message: "Unable to get subCategories",
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

router.get("/getCategory/:subcategory_id/:user_id", async (req, res) => {
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
    SubCategory.findOne(
      { _id: req.params.subcategory_id },
      (error, subCategory) => {
        if (!error) {
          res.status(200).send({
            status: true,
            message: "subCategory found",
            data: subCategory
          });
        } else {
          res.status(400).send({
            status: true,
            message: "Unable to get subCategory",
            data: {}
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

router.post("/addSubCategory", multipleUpload, async (req, res) => {
  console.log("in add subCategory");
  const files = req.files;
  var new_subcategory = new SubCategory();
  new_subcategory = JSON.parse(req.body.new_category);
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
        /* var subCategory = new SubCategory();
        subCategory.name = new_subCategory.name;
        subCategory.name_fr = new_subCategory.name_fr;
        subCategory.status = new_subCategory.status; */
        new_subcategory.created_at = new Date.now();
        new_subcategory.image = fileUploadResponse.locations[0];
        new_subcategory.updated_at = new Date.now();
        const saved_category = await new Promise((resolve, reject) => {
          new_subcategory.save((err, added_subcategory) => {
            if (!err) {
              resolve(added_subcategory);
            } else {
              reject(err);
            }
          });
        });
        if (saved_category) { 
          res.status(200).send({
            status: true,
            message: "subcategory saved",
            data: added_subcategory
          });
        } else {
          res.status(400).send({
            status: false,
            message: "Unable to save subcategory",
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

router.put("/updateSubCategory", multipleUpload, async (req, res) => {
  var sub_category = JSON.parse(req.body.update_data);
  const files = req.files;
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
      uploadFile(files, "users/", (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    })
      .then(async fileUploadResponse => {
        sub_category.image = fileUploadResponse.locations[0];
        console.log(sub_category);
        const updated_sub_category = await new Promise((resolve, reject) => {
          SubCategory.findOneAndUpdate(
            { _id: req.body.sub_category_id },
            sub_category,
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
        if (updated_sub_category) {
          res.status(200).send({
            status: true,
            message: "Category updated successfuly",
            data: updated_sub_category
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
        res.status(422).send({
          status: false,
          message: err.errors[0],
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

router.delete("/subCategory", async (req, res) => {
  console.log("in delete subCategory");
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
    SubCategory.findOneAndRemove(
      { _id: req.body.subCategory_id },
      (err, subCategory) => {
        if (!err) {
          res.status(200).send({
            status: true,
            message: "SubCategory deleted",
            data: subCategory
          });
        } else {
          res.status(401).send({
            status: false,
            message: "Unable to delete SubCategory",
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

router.post("/test", (req, res) => {
  console.log("in test");
});

module.exports = router;
