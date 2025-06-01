const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  offerName: {
    type: String,
    required: true,
  },
  description: String,
  discountType: {
    type: String,
    enum: ["percentage", "amount"],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  applicableTo: {
    type: String,
    enum: ["product", "category"],
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
  },
  createdAt: Date,
});

module.exports = mongoose.model("Offer", offerSchema);
