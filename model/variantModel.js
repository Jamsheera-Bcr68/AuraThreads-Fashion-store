const mongoose=require('mongoose')

variantSchema=new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product",required:true },
    size:{type:String,required:true},
    color:{type:String,required:true},
    stock:{type:Number,required:true},
    images:[{type:String}],
    isActive:{type:Boolean,default:false},
    isListed:{type:Boolean,default:false},
    isDeleted:{type:Boolean,default:false},
    categoryId:{type:mongoose.Schema.Types.ObjectId,ref:'Category'},
    createdAt:{type:Date}
})

module.exports=mongoose.model('Variant',variantSchema)