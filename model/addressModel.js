const mongoose= require('mongoose')
const addresSchema=new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to User
    label:{type:String},
    line1:{type:String},
    line2:String,
    phone: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    isDefault: { type: Boolean, default: false }
})
module.exports=mongoose.model("Address",addresSchema)