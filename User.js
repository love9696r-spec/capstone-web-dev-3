const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
  refreshTokenHash: { type: String, select: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ email: 1 }, { unique: true });
schema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
schema.methods.comparePassword = function(candidate) { return bcrypt.compare(candidate, this.password); };
module.exports = mongoose.model("User", schema);