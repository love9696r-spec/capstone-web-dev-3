const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ name: "text", description: "text" });
schema.index({ category: 1, price: 1 });
module.exports = mongoose.model("Product", schema);