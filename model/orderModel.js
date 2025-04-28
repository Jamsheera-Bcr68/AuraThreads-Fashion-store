const mongoose=require('mongoose')
const { bool } = require('sharp')

const orderSchema=mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    address:{type:Object},
    items: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
          },
          quantity: Number,
          status:{type:String,default:"active"},
          isReturned: { type: Boolean, default: false }
        }
        
      ],
    totalAmount:{type:Number},
    paymentMethod:{type:String},
    paymentDetails:{type:Object},
    status:{type:String},
    createdAt:{type:Date},
    deliveryDate:{type:Date},
    finalAmount:{type:Number},
    discountAmount:{type:Number},
    isCouponApplied:{type:Boolean,default:false},
    couponCode:{type:String,default:''},
    useWallet:{type:Boolean,default:false},
    returnRequests: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        reason : String,
        date: Date
      }
    ]
})

module.exports=mongoose.model("Order",orderSchema)