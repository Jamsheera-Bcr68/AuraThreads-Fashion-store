const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {type:String,required:true},
    price: {type:Number,required:true},
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    stock:{ type: Number, default: 0 },
    color:String,
    size:String,
    description:String,
    subCategory:String,
    images:[String],
    brand:String,
    rating:Number,
    isListed:Boolean,
    isActive:Boolean,
    isDeleted:{type:Boolean,default:false},
    createdAt:{ type: Date, default: Date.now },
    updatedAt:{ type: Date, default: Date.now }
})
module.exports = mongoose.model('Product', productSchema);
