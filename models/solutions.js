var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var SolutionSchema = new Schema({
  category: { type: String, required: true },
  sub_category: { en: Schema.Types.String, fr: Schema.Types.String },
  display_price:{type: String},
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
  delivery_street_address: { type: String },
  delivery_postal_address: { type: String },
  delivery_city: { type: String },
  delivery_region: { type: String },
  delivery_date: { type: String },
  delivery_country: { type: String },
  delivery_location: {
    lat: Schema.Types.Decimal128,
    lng: Schema.Types.Decimal128
  },
  description: { type: Schema.Types.Mixed },
  user: { type: mongoose.Schema.ObjectId, ref: "Users" },
  user_role: { type: String, required: true },
  status: { type: String, required: true, default: "Pending" },
  accepted_by: { type: mongoose.Schema.ObjectId, ref: "Users" },
  images: [{ type: Schema.Types.Mixed }]
});

module.exports = mongoose.model("Solutions", SolutionSchema);
