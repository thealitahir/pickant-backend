var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var SubCategorySchema = new Schema({
  name_en: { type: String, required: true },
  name_fr: { type: String, required: true },
  image: { type: String },
  price: { type: String, required: true },
  price_eur: { type: String, required: true },
  price_cfa: { type: String, required: true },
  desc: { en: { type: String }, fr: { type: String } },
  status: { type: String, required: true },
  created_at: { type: String, required: true },
  updated_at: { type: Schema.Types.Mixed },
  category: { type: mongoose.Schema.ObjectId, ref: "Category" }
});

module.exports = mongoose.model("SubCategory", SubCategorySchema);
