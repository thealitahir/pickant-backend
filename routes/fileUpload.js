require('dotenv').config();
const express = require("express");
const router = express.Router();
const UserModel = require("../models/user");

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

aws.config.update({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: "us-east-2"
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == "image/jpeg" ||
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg" ||
    file.mimetype === null
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image type, only JPEG and png are allowed"), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multerS3({
    s3: s3,
    bucket: "aptake",
    acl: "public-read",
    metadata: function(req, file, cb) {
      cb(null, { fieldName: "TESTING_META_DATA" });
    },
    key: function(req, file, cb) {
      console.log(file);
      cb(
        null,
        `images/${req.params.user_id}/` + file.originalname,
        Date.now().toString()
      );
    }
  })
});

const singleUpload = upload.single("image");

router.post("/imageUpload/:user_id", function(req, res) {
  singleUpload(req, res, async function(err) {
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
  });
});

module.exports = router;
