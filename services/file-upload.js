const aws = require('aws-sdk')
const multer = require('multer');
const multerS3 = require('multer-s3');

aws.config.update({
    accessKeyId: 'AKIAJBJ57PPJ54T2BREA',
    secretAccessKey: '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',
    region: 'us-east-2'
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype == "image/jpeg" || file.mimetype == "image/png" || file.mimetype == "image/jpg"){
    cb(null, true)
  } else{
    cb(new Error('Invalid image type, only JPEG and png are allowed' ), false);
  }
}

const s3 = new aws.S3();

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
      cb(null,"images/user_id/" + file.originalname, Date.now().toString())
    }
  })
});

module.exports = upload;
