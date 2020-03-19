var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var PaymentSchema = new Schema({
  payer_id: { type: String },
  payment_id: { type: String },
  subscription_id: { type: String },
  payment_type: { type: String, required: true },
  total_price: { type: String, required: true },
  currency: { type: String, required: true },
  user_id: { type: mongoose.Schema.ObjectId, ref: "Users" }
});

module.exports = mongoose.model("Payment", PaymentSchema);
