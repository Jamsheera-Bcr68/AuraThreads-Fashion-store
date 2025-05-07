const mongoose=require('mongoose')
const userShema=mongoose.Schema({
    email:{
        type:String,
        required:true,
        uneque:true
    },
    hashedPassword:{
        type:String,
        required:false                          
    },userName:{type:String},
    fullName:{type:String},
    phone:{type:String,sparce:true,default:null},
    googleId:{type:String,uneque:true},
    isVerified:{type:Boolean},
    updatedAt:{type: Date, default: Date.now},
    createdAt:{type: Date, default: Date.now},
    role:{type:String},
    dob:{type:String},
    isActive:{type:Boolean,default:true},
    otp: { type: String }, // OTP for verification
    otpExpiry: { type: Date },
    profilePicture:{type:String},
   refferalCode:{type:String,unique: true},
   referredBy:{type:String},

})
module.exports=mongoose.model('User',userShema)