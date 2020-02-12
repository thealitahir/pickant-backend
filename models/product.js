var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ProductSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, required: true },
  mode: { type: String, required: true },
  user_id: { type: String, required: true },
  user_name: { type: String },
  category_name: { type: String, required: true },
  brand_name: { type: String, required: true },
  brand_id: { type: String, required: true },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
  description: { type: String, required: true },
  images: { type: Schema.Types.Mixed,}, //removed required flag for testing
  tags: { type: Schema.Types.Mixed }, //removed required flag for testing
  address: { lat:Number, long:Number ,address:String},
  title: { type: String, required: true },
  price: { type: Number, required: true },
  condition: { type: Number, required: true },
  search_count: { type: Number}  //removed required flag for testing
});

module.exports = mongoose.model('Products', ProductSchema);
