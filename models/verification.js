var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var VerificationSchema = new Schema({
  mobile_no: { type: String, required:true},
  verification_code: { type: String, required:true }
});

module.exports = mongoose.model("Verification", VerificationSchema);