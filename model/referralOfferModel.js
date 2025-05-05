const mongoose=require('mongoose')

const referalOfferSchema=new mongoose.Schema({
    bonusAmount:{type:Number},
    minOrderAmount:{type:Number},
    rewardType:{type:String},
    status:{type:String},
    isActive:{type:Boolean,default:false},
    createAt:{type:Date},
    updatedAt:{type:Date}
})
module.exports=mongoose.model('RefferalOffer',referalOfferSchema)