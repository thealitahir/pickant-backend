const express = require('express');
const router = express.Router();

const upload = require('../services/file-upload');
const singleUpload = upload.single('image');

router.post('/image-upload', function(req, res) {
    singleUpload(req, res, function(err){
       if (err){
           return res.status(400).send({errors: {tittle: "File upload error", detail: err.message}})
       }        
        return res.json({'imageUrl': req.file.location});
    })
});

module.exports = router;
