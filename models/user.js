var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  identity_no: { type: String },
  password: { type: String, required: true },
  email: { type: String, required: true },
  profile_pic: { type: Schema.Types.Mixed },
  images: [{ type: Schema.Types.Mixed }],
  mobile_no: { type: Number, required: true },
  location: { lat: Schema.Types.Decimal128, lng: Schema.Types.Decimal128 },
  physical_address: { type: String, required: true },
  verification_code: { type: String },
  auth_key: { type: String, required: true }
});

module.exports = mongoose.model("Users", UserSchema);
