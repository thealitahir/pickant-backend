var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var SolutionSchema = new Schema({
  category: { type: String, required: true },
  sub_category: { type: String, required: true },
  pickup_street_address: { type: String, required: true },
  pickup_city: { type: String, required: true },
  pickup_region: { type: String },
  pickup_date: { type: String, required: true },
  pickup_country: { type: String, required: true },
  pickup_location: {
    lat: Schema.Types.Decimal128,
    lng: Schema.Types.Decimal128
  },
  delivery_street_address: { type: String, required: true },
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
  user_role: { type: String, required: true }
});

module.exports = mongoose.model("Solutions", SolutionSchema);
