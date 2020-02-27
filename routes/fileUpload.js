const express = require("express");
const router = express.Router();

const UserModel = require('../models/user');

const aws = require('aws-sdk')
const multer = require('multer');
const multerS3 = require('multer-s3');

aws.config.update({
    accessKeyId: 'AKIAJBJ57PPJ54T2BREA',
    secretAccessKey: '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',
    region: 'us-east-2'
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype === null){
      cb(null, true)
    } else{
      cb(new Error('Invalid image type, only JPEG and png are allowed' ), false);
    }
}

const upload = multer({
    fileFilter,
    storage: multerS3({
    s3: s3,
    bucket: 'aptake',
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: "TESTING_META_DATA"});
    },
    key: function (req, file, cb) {
      console.log(req.params.user_id);
      cb(null,"images/user_id/" + file.originalname, Date.now().toString())
    }
  })
});

const singleUpload = upload.single('image');

router.post('/imageUpload/:user_id', function(req, res) {
    
    var user = req.params;
    singleUpload(req, res, function(err){
        console.log("Salman Saleem " + req.file.location)
       if (err){
           return res.status(400).send({errors: {tittle: "File upload error", detail: err.message}})
       } 
       UserModel.update({profile_pic: req.file.location}, {
           where: {
            identity_no: user.user_id
           }
       })
        return res.json({'imageUrl': req.file.location});
    })
});

module.exports = router;
