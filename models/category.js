var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var CategorySchema = new Schema({
  name_en: { type: String, required: true },
  name_fr: { type: String, required: true },
  image: { type: String },
  status: { type: String, required: true },
  created_at: { type: String},
  updated_at: { type: String }
});

module.exports = mongoose.model("Category", CategorySchema);
