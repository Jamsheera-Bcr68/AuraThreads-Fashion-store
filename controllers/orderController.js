
const Cart=require('../model/cartModel')
const Address=require('../model/addressModel')
const Product=require('../model/productModel')
const Order=require('../model/orderModel')
const Variant=require('../model/variantModel')
const statusCodes = require('../utils/statusCodes')
const statusMessages = require('../utils/statusMessages')
const Offer=require('../model/offerModel')
const Wallet=require('../model/walletModel')
const razorpay = require("../config/razorPay");
const crypto = require("crypto");


const placeOrder = async (req, res) => {
  console.log("from place order");

  try {
    let { paymentMethod, paymentDetails } = req.body;
   let totalAmount=Number(req.body.totalAmount)
    
    console.log("total amount ", totalAmount);

    let addressId = req.body.addressId?.trim();
    //validatiing essential fields
    const useWallet = req.body.useWallet;
    console.log("useWallet ", useWallet);
    if (useWallet) {
      paymentMethod = 'wallet'
    }

    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId });

        if (!cart) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND('Cart') });
    }

    if (cart.items.length < 1) {
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "No items found" });
    }
    //console.log('Cart items are ', cart.items);

    

    if (addressId == "" || paymentMethod == "" || totalAmount == "") {
      console.log('missing reuired fileds', addressId, paymentMethod, paymentDetails, totalAmount);

      return res.status(statusCodes.BAD_REQUEST).send("Missing required fields");
    }
    console.log(' reuired fileds  addressId, paymentMethod, paymentDetails, totalAmount', addressId, paymentMethod, paymentDetails, totalAmount);
    
    
    
    let { upiId, cardNumber, expiry, cvv, cardName } = paymentDetails;
    if (paymentMethod == "Credit Card") {
      if (cardNumber == "" || expiry == "" || cvv == "" || cardName == "") {
        return res.status(statusCodes.BAD_REQUEST).json({
          success: false,
          message: "Payment details are missing",
        });
      }
    } else if (paymentMethod == "UPI") {
      upiId = paymentDetails?.upiId;
      if (!upiId) {
        return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "UPI id is missing" });
      }
      console.log(upiId);
    } else {
    }

    //fetching full address from database

    const address = await Address.findById(addressId);
    if (!address) {
      console.log("address is not found");
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: statusMessages.NOT_FOUND('Selected address'),
      });
    }

    //checking product availability
    let items = cart.items;

    for (let item of items) {
      const variant = await Variant.findById(item.variantId).populate('productId')

      if (!variant) {
        return res
          .status(statusCodes.NOT_FOUND)
          .json({ success: false, message:statusCodes.NOT_FOUND('Variant') });
      }

      if (variant.stock < item.quantity) {
        console.log("the product is out of stock from route");

        return res.status(statusCodes.BAD_REQUEST).json({
          success: false,
          message: ` ${variant.productId.productName} is out of stock`,
        });
      }
    }

    const createdAt = new Date();
    const deliveryDate = new Date(
      createdAt.getTime() + 5 * 24 * 60 * 60 * 1000,
    ); // Add 5 days

    const coupenDiscountAmount = req.session.discountAmount || 0;
    console.log("coupenDiscountAmount", coupenDiscountAmount);

    const offerDiscountAmount = req.session.totalDiscount || 0;
    console.log("offerDiscountAmount ", offerDiscountAmount);

    const finalAmount =
      totalAmount - coupenDiscountAmount - offerDiscountAmount;
    console.log("final amount discount amount ", finalAmount);

    const shippingCharge = 50.0;
    const orderTotal = finalAmount + shippingCharge;
    console.log("orderTotal ", orderTotal);

    const isCouponApplied = req.session.code ? true : false;
    const couponCode = req.session.code || "";

    const isOfferApplied = req.session.offer ? true : false;

    //order above 1000 not allow to py COD
    if (finalAmount > 1000 && paymentMethod == "COD") {
      console.log("Order above 1000 cannot use COD");

      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Order above 1000 cannot use COD",
      });
    }
    
    let orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const variant = await Variant.findById(item.variantId).populate('productId')
        console.log("variant is ", variant);

        const offers = await Offer.find({ status: "active" });
        // Simulate logic for getting final offer (you should already have this logic)
        let finalOffer = null;
        let offerDiscount = 0;

        const productOffer = offers.find(
          (offer) =>
            offer.applicableTo == "product" &&
            offer.productId?.toString() == variant.productId._id?.toString(),
        );
        const categoryOffer = offers.find(
          (offer) =>
            offer.applicableTo == "category" &&
            offer.categoryId?.toString() == variant.categoryId.toString(),
        );

        console.log("categoryOffer", categoryOffer);

        // const productOffer = await Offer.findOne({ productId: product._id, isActive: true });
        console.log("productOffer", productOffer);

        if (productOffer && categoryOffer) {
          let productDiscountAmount = 0;
          let categoryDiscountAmount = 0;
          if (productOffer.discountType == "amount") {
            productDiscountAmount = productOffer.discountValue;
            console.log("productDiscountAmount amount ", productDiscountAmount);
          } else if (productOffer.discountType == "percentage") {
            productDiscountAmount =
              (variant.productId.price * productOffer.discountValue) / 100;
            console.log(
              "productDiscountAmount percentage ",
              productDiscountAmount,
            );
          }

          //category
          if (categoryOffer.discountType == "amount") {
            categoryDiscountAmount = categoryOffer.discountValue;
            console.log(
              "categoryDiscountAmount amount ",
              categoryDiscountAmount,
            );
          } else if (categoryOffer.discountType == "percentage") {
            categoryDiscountAmount =
              (variant.productId.price * categoryOffer.discountValue) / 100;
            console.log(
              "categoryDiscountAmount percentage ",
              categoryDiscountAmount,
            );
          }

          finalOffer =
            productDiscountAmount > categoryDiscountAmount
              ? productOffer
              : categoryOffer;
          console.log("finalOffer", finalOffer);
        } else if (productOffer) {
          finalOffer = productOffer;
          console.log("only product offer exist");
        } else if (categoryOffer) {
          finalOffer = categoryOffer;
          console.log("only category offer exist");
        }

        if (finalOffer) {
          if (finalOffer.discountType == "amount") {
            offerDiscount = item.quantity * finalOffer.discountValue;
          } else if (finalOffer.discountType == "percentage") {
            offerDiscount =
              (item.quantity * variant.productId?.price * finalOffer.discountValue) / 100;
          }
          console.log("final discount amount for this item is ", offerDiscount);
        }
        console.log('Item is ',item);
        
        return {
          variantId: item.variantId,
          productId:item.productId._id,
          quantity: item.quantity,
          offerId: finalOffer ? finalOffer._id : null,
          offerApplied: finalOffer ? true : false,
          offerDiscount: offerDiscount || 0,
        };
      }),
    );

    // if payment method is COD
    if (paymentMethod == "COD") {
      const newOrder = new Order({
        userId: req.session.user._id,
        address,
        coupenDiscountAmount,
        offerDiscountAmount,
        isCouponApplied,
        isOfferApplied,
        couponCode,
        finalAmount,
        paymentMethod,
        totalAmount,
        status: "Pending",
        items: orderItems,
        createdAt,
        deliveryDate,
        orderTotal,
        shippingCharge,
        useWallet,
      });
      await newOrder.save();

      //update stock
      for (let item of cart.items) {
        await Variant.findByIdAndUpdate(item.variantId, {
          $inc: { stock: -item.quantity },
        });
      }

      //making cart empty

      // making cart empty
      await Cart.updateOne({ userId }, { $set: { items: [] } });
      req.session.discountAmount = 0;
      req.session.finalAmount = 0;
      req.session.code = "";
      req.session.appliedCoupon = null;
      req.session.offer = null;
      req.session.cartTotal = 0;
      req.session.netAmount = 0;
      req.session.totalDiscount = 0;

      let orderId = newOrder._id;

      return res.status(statusCodes.OK).json({
        success: true,
        message: "Order Placed Succesfully",
        paymentMethod,
        orderId,
      });
    } else {
      console.log('payment method is ',paymentMethod);
      
      const options = {
        amount: orderTotal * 100,
        currency: "INR",
        receipt: "receipt_" + Date.now(),
      };
      const razorpayOrder = await razorpay.orders.create(options);

      // check for wallet
      const wallet = await Wallet.findOne({ userId });
      if (useWallet == true) {
        if (!wallet) {
          return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND('Wallet')});
        }
        if (wallet.balance < orderTotal) {
          console.log("insufficient balance");
          return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Insufficient balance" });
        }
        paymentMethod = "wallet";
      }
      //creating new order document
      req.session.tempOrder = {
        userId: req.session.user._id,
        address,
        coupenDiscountAmount,
        offerDiscountAmount,
        isCouponApplied,
        isOfferApplied,
        couponCode,
        finalAmount,
        shippingCharge,
        orderTotal,
        paymentMethod,
        totalAmount,

        status: paymentMethod === "COD" ? "Pending" : "Processing",
        paymentDetails:
          paymentMethod == "Credit Card"
            ? {
              cardNumber,
              expiry,
              cvv,
              cardName,
            }
            : paymentMethod == "UPI"
              ? {
                upiId,
              }
              : paymentMethod == "wallet"
                ? {
                  razorpayOrderId: razorpayOrder.id,
                }
                : null,

        items: orderItems,
        createdAt,
        deliveryDate,
        useWallet,
      };
      return res.status(statusCodes.OK).json({
        success: true,
        message: "Order completed successfully",

        paymentMethod,
        razorpayOrderId: razorpayOrder.id, // sending razor pay datas to front end
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,

        key_id: process.env.RAZORPAY_KEY_ID,
        user: req.session.user,
      });
    }

   
  } catch (error) {
    console.log("error in placing order", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};


const varifyPayment = async (req, res, next) => {
  console.log("varifyPayment");
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;
    console.log(
      "razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    );

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    console.log("body ", body);

    const expectedSgnature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSgnature == razorpay_signature) {
      console.log("payment verified");
      const newOrder = new Order(req.session.tempOrder);
      console.log(newOrder);
      await newOrder.save();

      //update wallet
      const userId = req.session.user._id;
      const wallet = await Wallet.findOne({ userId });

      if (newOrder.useWallet == true) {
        wallet.balance = wallet.balance - newOrder.finalAmount;
        wallet.transactions.push({
          amount: newOrder.finalAmount,
          type: "debit",
          date: new Date(),
          description: "Orer placed using wallet",
        });

        await wallet.save();
      }

      let cart = await Cart.findOne({ userId });
      for (let item of cart.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      // making cart empty
      await Cart.updateOne({ userId }, { $set: { items: [] } });
      req.session.discountAmount = 0;
      req.session.finalAmount = 0;
      req.session.code = "";
      req.session.appliedCoupon = null;
      req.session.offer = null;
      req.session.cartTotal = 0;
      req.session.netAmount = 0;
      req.session.totalDiscount = 0;

      let orderId = newOrder._id;

     return res.status(statusCodes.OK).json({
        success: true,
        message: "Payment verified successfully",
        orderId,
      });
    } else {
      console.log("signature is not matching");
      
      //throw new Error("Signature is not matching");
      return res.status(statusCodes.BAD_REQUEST).json({success:false,message:"Signature is not matching"})
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
const getPaymentFailure = async (req, res, next) => {
  console.log("getPaymentFailure");
  try {
    res.render("user/orderFailure", {
      title: "Order Failure",
      order: req.session.tempOrder,
      query:'',
      priceRange:'',
      sort:'',
      categoryId:'',
      user:req.session.user||'',
      cartCount:0
    });
  } catch (error) {
    console.log(error);
    next();
  }
};

const getOrderSuccess = async (req, res) => {
  try {
    console.log("from order success page");
    const orderId = req.query.orderId;
    console.log("order id is ", orderId);
    console.log("type of order id ", typeof orderId);

    const order = await Order.findOne({ _id: orderId }).populate(
      "items.productId",
    );
    console.log("order.items", order.items);
    

    res.render("user/orderSuccess", { title: "Order Success", order,categoryId:'',
      query:'',
      priceRange:'',
      sort:'',
      user:req.session.user||'',
      cartCount:0
     });
  } catch (error) {
    console.log(error);
    res.status(statusCodes.INTERNAL_SERVER_ERROR).send(statusMessages.SERVER_ERROR);
  }
};


module.exports={
    placeOrder,
    varifyPayment,
    getOrderSuccess,
    getPaymentFailure
}