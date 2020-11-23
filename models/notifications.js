var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var NotificationSchema = new Schema({
  message_en: { type: String },
  message_fr: { type: String },
  status: { type: String, required: true },
  created_at: { type: String,default: Date.now},
  user_id:{type: String, required: true}
});

module.exports = mongoose.model("Notification", NotificationSchema);
