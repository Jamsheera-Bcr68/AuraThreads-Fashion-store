const mongoose=require('mongoose')

const orderSchema=mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    address:{type:Object},
    items: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
          },
          quantity: Number
        }
      ],
    totalAmount:{type:Number},
    paymentMethod:{type:String},
    paymentDetails:{type:Object},
    status:{type:String},
    createdAt:{type:Date},
    deliveryDate:{type:Date}
})

module.exports=mongoose.model("Order",orderSchema)