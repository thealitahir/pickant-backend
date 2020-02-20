var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var CategorySchema = new Schema({
  name: { type: String, required: true },
  name_fr: { type: String, required: true },
  image: { type: String },
  status: { type: String, required: true },
  created_at: { type: String, required: true },
  profile_pic: { type: Schema.Types.Mixed },
  updated_at: { type: Schema.Types.Mixed }
});

module.exports = mongoose.model("Category", CategorySchema);
