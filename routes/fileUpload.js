require("dotenv").config();
const express = require("express");

const aws = require("aws-sdk");
const multer = require("multer");
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const region = process.env.REGION;

const fileFilter = file => {
  console.log(file.mimetype);
  if (
    file.mimetype == "image/jpeg" ||
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg" ||
    file.mimetype === null
  ) {
    return true;
  } else {
    return false;
  }
};

var storage = multer.memoryStorage();
/* var upload = multer({
  fileFilter,
  storage: storage
}); */
var multipleUpload = multer({ storage: storage }).array("file");

module.exports = async function(files, path, cb) {
  console.log("in file upload");
  var data;
  var errors = [];
  var locations = [];
  var count = 0;
  let s3bucket = new aws.S3({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region
  });
  files.map(async item => {
    if (!fileFilter(item)) {
      console.log("invalid file");
      count++;
      errors.push("Invalid file format, must be jpeg, jpg or png");
    } else {
      console.log("valid file");
      var params = {
        Bucket: process.env.AWS_BUCKET,
        Key: path + item.originalname,
        Body: item.buffer,
        ContentType: item.mimetype,
        ACL: "public-read"
      };
      var upload = await new Promise((resolve, reject) => {
        s3bucket.upload(params, function(err, data) {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        });
      });
      if (upload) {
        locations.push(upload.Location);
        count++;
      } else {
        errors.push(upload);
        count++;
      }
    }
    if (count == files.length && errors.length < 1) {
      data = { error: false, locations };
      cb(null, data);
    } else if (count == files.length && errors.length > 0) {
      data = { error: true, errors };
      cb(data);
    }
  });
  /* var params = {
    Bucket: process.env.AWS_BUCKET,
    Key: 'test2/'+file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read"
  }; */

  /* singleUpload(req, res, async function(err) {
    if (err) {
      return res.status(400).send({
        errors: { message: "File upload error", detail: err.message }
      });
    }

    const updated_profile = await new Promise((resolve, reject) => {
      UserModel.findOneAndUpdate(
        { _id: req.params.user_id },
        {
          $set: {
            profile_pic: req.file.location
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
    if (updated_profile) {
      res.status(200).send({
        status: true,
        message: "Image uploaded successfuly",
        data: updated_profile,
        imageUrl: req.file.location
      });
    } else {
      res.status(401).send({
        status: false,
        message: "Unable to update profile picture",
        data: {}
      });
    }
  }); */
};
