var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var SolutionSchema = new Schema({
  category: { type: String, required: true },
  sub_category: { en: Schema.Types.String, fr: Schema.Types.String },
  sub_category_price_dollar: { type: String, required: true },
  sub_category_price_euro: { type: String, required: true },
  sub_category_price_fr: { type: String, required: true },
  pickup_street_address: { type: String, required: true },
  pickup_postal_address: { type: String, required: true },
  pickup_city: { type: String, required: true },
  pickup_region: { type: String },
  pickup_date: { type: String, required: true },
  pickup_country: { type: String, required: true },
  pickup_location: {
    lat: Schema.Types.Decimal128,
    lng: Schema.Types.Decimal128
  },
  delivery_street_address: { type: String, required: true },
  delivery_postal_address: { type: String, required: true },
  delivery_city: { type: String, required: true },
  delivery_region: { type: String },
  delivery_date: { type: String, required: true },
  delivery_country: { type: String, required: true },
  delivery_location: {
    lat: Schema.Types.Decimal128,
    lng: Schema.Types.Decimal128
  },
  description: { type: String },
  user: { type: mongoose.Schema.ObjectId, ref: "Users" },
  user_role: { type: String, required: true },
  status: { type: String, required: true, default: "Pending" },
  accepted_by: { type: mongoose.Schema.ObjectId, ref: "Users" }
});

module.exports = mongoose.model("Solutions", SolutionSchema);
