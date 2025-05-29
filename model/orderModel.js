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
          isReturned: { type: Boolean, default: false },
          itemTotal:Number,
          offerDiscount:Number,
          offerId:mongoose.Schema.Types.ObjectId,
          offerApplied:Boolean
        }
        
      ],
    totalAmount:{type:Number},
    paymentMethod:{type:String},
    paymentDetails:{
      razorpayOrderId:String,
       
    razorpayPaymentId: String,
    razorpaySignature: String,
    },
    status:{type:String},
    createdAt:{type:Date},
    deliveryDate:{type:Date},
    finalAmount:{type:Number},
    coupenDiscountAmount:{type:Number},
    offerDiscountAmount:{type:Number},
    isOfferApplied:{type:Boolean,default:false},
    isCouponApplied:{type:Boolean,default:false},
    shippingCharge:Number,
    orderTotal:Number,
    couponCode:{type:String,default:''},
    useWallet:{type:Boolean,default:false},
   
    returnRequests: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        reason : String,
        date: Date,
        status:String
      }
    ]
})

module.exports=mongoose.model("Order",orderSchema)