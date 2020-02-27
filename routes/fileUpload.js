var express = require("express");
var router = express.Router();

const upload = require('../services/fileUpload');
const singleUpload = upload.single('image');

router.post('/imageUpload', function(req, res) {
    singleUpload(req, res, function(err){
       if (err){
           return res.status(400).send({errors: {tittle: "File upload error", detail: err.message}})
       }        
        return res.json({'imageUrl': req.file.location});
    })
});

module.exports = router;
