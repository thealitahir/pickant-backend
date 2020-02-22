var express = require("express");
var router = express.Router();
const Category = require("../models/category");
const User = require("../models/user");
const aws = require("aws-sdk");
const multerS3 = require("multer-s3");
const multer = require("multer");
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
const path = require("path");

const s3Client = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  Bucket: process.env.AWS_BUCKET
});
const uploadParams = {
  Bucket: process.env.Bucket,
  // Key: '',
  Key: "pickant/:file", // pass key
  Body: null // pass file body
};
const s3 = {};
s3.s3Client = s3Client;
s3.uploadParams = uploadParams;
//single file upload
const profileImgUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET,
    acl: "public-read",
    key: function(req, file, cb) {
      cb(
        null,
        path.basename(file.originalname, path.extname(file.originalname)) +
          "-" +
          Date.now() +
          path.extname(file.originalname)
      );
    }
  }),
  limits: { fileSize: 2000000 }, // In bytes: 2000000 bytes = 2 MB
  fileFilter: function(req, file, cb) {
    console.log("in profile image upload");
    checkFileType(file, cb);
  }
}).single("profileImage");

const uploadFile = (buffer, name, type) => {
  const params = {
    ACL: "public-read",
    Body: buffer,
    Bucket: process.env.AWS_BUCKET,
    ContentType: type.mime,
    Key: `${name}.${type.ext}`
  };
  return s3.upload(params).promise();
};

//check file params
function checkFileType(file, cb) {
  console.log("in check file type");
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

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

router.post("/addCategory", async (req, res) => {
  console.log("in add category");
  const new_category = req.body;
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
    var category = new Category();
    category.name = new_category.name;
    category.name_fr = new_category.name_fr;
    category.status = new_category.status;
    category.created_at = new_category.created_at;
    category.profile_pic = new_category.profile_pic;
    category.updated_at = new_category.updated_at;
    const saved_category = await new Promise((resolve, reject) => {
      category.save((err, added_category) => {
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
      res
        .status(400)
        .send({ status: false, message: "Unable to save category", data: {} });
    }
  } else {
    res.status(403).send({
      status: false,
      message: "Access Denied",
      data: {}
    });
  }
});

router.post("/test", upload.single("file"), (req, res) => {
  console.log("in test", req.file);
  s3.uploadParams.Key = `pcikant/${req.file.originalname}`;
  // s3.uploadParams.Key = req.file.originalname
  s3.uploadParams.Body = req.file.buffer;
  s3.s3Client.upload(s3.uploadParams, (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error -> " + err });
    }
    res.json({
      message: "File uploaded successfully!",
      data: `https://s3.amazonaws.com/pickant/${req.file.originalname}`
    });
  });
  /*const form = new multiparty.Form();
    form.parse(req, async (error, fields, files) => {
      if (error) throw new Error(error);
      try {
        const path = files.file[0].path;
        const buffer = fs.readFileSync(path);
        const type = fileType(buffer);
        const timestamp = Date.now().toString();
        const fileName = `bucketFolder/${timestamp}-lg`;
        const data = await uploadFile(buffer, fileName, type);
        return res.status(200).send(data);
      } catch (error) {
        return res.status(400).send(error);
      }
    }); */
  /* profileImgUpload(req, res, (error) => {
    console.log("requestOkokok", req.file);
    console.log("error", error);
    if (error) {
      console.log("errors", error);
      res.json({ error: error });
    } else {
      // If File not found
      if (req.file === undefined) {
        console.log("Error: No File Selected!");
        res.json("Error: No File Selected");
      } else {
        console.log("success");
        // If Success
        const imageName = req.file.key;
        const imageLocation = req.file.location;
        console.log(imageLocation);
        // Save the file name into database into profile model
        res.json({
          image: imageName,
          location: imageLocation
        });
      }
    }
  }); */
});

module.exports = router;
