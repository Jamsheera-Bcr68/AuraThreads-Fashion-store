const mongoose = require('mongoose')

const coupenSchema = new mongoose.Schema({
  coupenCode: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  minPurchase: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date },
  description: { type: String },
  startDate: { type: Date },
  usageLimit: { type: Number },
  updatedAt: { type: Date },
  used: { type: Number },
  
})

module.exports = mongoose.model('Coupen', coupenSchema)








