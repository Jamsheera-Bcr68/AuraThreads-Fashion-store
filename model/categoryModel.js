const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true },
    description: { type: String },
    isListed: { type: String },
    images: { type: Array },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", categorySchema);
