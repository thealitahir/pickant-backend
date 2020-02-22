var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String },
  identity_no: { type: String },
  identity_flag:{type:Boolean, required: true},
  password: { type: String, required: true },
  email: { type: String, required: true },
  profile_pic: { type: Schema.Types.Mixed },
  images: [{ type: Schema.Types.Mixed }],
  mobile_no: { type: String, required: true },
  location: { lat: Schema.Types.Decimal128, lng: Schema.Types.Decimal128 },
  physical_address: { type: String },
  verification_code: { type: String },
  auth_key: { type: String },
  admin:{type: Boolean, required:true}
});

module.exports = mongoose.model("Users", UserSchema);
