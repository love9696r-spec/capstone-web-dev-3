const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  deliveryAddress: { type: String, required: true, trim: true },
  status: { type: String, enum: ["placed", "processing", "shipped", "delivered", "cancelled"], default: "placed", index: true },
  payment: { type: String, enum: ["simulated_pending", "simulated_paid", "simulated_refunded"], default: "simulated_pending" }
}, { timestamps: true });
schema.index({ customer: 1, createdAt: -1 });
schema.index({ "items.seller": 1, status: 1 });
module.exports = mongoose.model("Order", schema);