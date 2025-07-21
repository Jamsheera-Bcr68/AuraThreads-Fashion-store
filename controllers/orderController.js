
const Cart = require('../model/cartModel')
const Address = require('../model/addressModel')
const Product = require('../model/productModel')
const Order = require('../model/orderModel')
const Variant = require('../model/variantModel')
const statusCodes = require('../utils/statusCodes')
const statusMessages = require('../utils/statusMessages')
const Offer = require('../model/offerModel')
const Wallet = require('../model/walletModel')
const razorpay = require("../config/razorPay");
const crypto = require("crypto");
const path = require('path')
const mongoose = require('mongoose')
const Coupon=require('../model/coupenModel')
const User=require('../model/userModel')


const placeOrder = async (req, res) => {
  console.log("from place order");

  try {
    let { paymentMethod, paymentDetails } = req.body;
    let totalAmount = Number(req.body.totalAmount)

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
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Cart') });
    }

    if (cart.items.length < 1) {
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "No items found" });
    }
   ;



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
          .json({ success: false, message: statusCodes.NOT_FOUND('Variant') });
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
        console.log('Item is ', item);

        return {
          variantId: item.variantId,
          productId: item.productId._id,
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
      console.log('payment method is ', paymentMethod);

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
          return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Wallet') });
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
        wallet.balance = wallet.balance - newOrder.orderTotal;
        wallet.transactions.push({
          amount: newOrder.orderTotal,
          type: "debit",
          date: new Date(),
          description: "Orer placed using wallet",
        });

        await wallet.save();
      }

      let cart = await Cart.findOne({ userId });
      for (let item of cart.items) {
        await Variant.findByIdAndUpdate(item.variantId, {
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
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Signature is not matching" })
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
      query: '',
      priceRange: '',
      sort: '',
      categoryId: '',
      user: req.session.user || '',
      cartCount: 0
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


    res.render("user/orderSuccess", {
      title: "Order Success", order, categoryId: '',
      query: '',
      priceRange: '',
      sort: '',
      user: req.session.user || '',
      cartCount: 0
    });
  } catch (error) {
    console.log(error);
    res.status(statusCodes.INTERNAL_SERVER_ERROR).send(statusMessages.SERVER_ERROR);
  }
};

const getOrders = async (req, res) => {
  console.log("from user all orders page");
  try {
    const userId = req.session.user._id;
    if (!userId) {
      console.log("user not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: 'Please login' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
      .populate("items.variantId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (!orders) {
      console.log("orders are not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Orders are") });
    }
    console.log('your orders are ', orders);

    const totalOrders = await Order.countDocuments({ userId });
    console.log('total orders', totalOrders);

    const totalPages = Math.ceil(totalOrders / limit);
    console.log('totalPages ', totalPages);

    //get cart count
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    let cartCount = 0;
    if (cart) {
      cartCount = cart.items.length;
      //  console.log('cart count is ', cartCount);
    } else {
      console.log("cart not fount");
    }
    // order status updating
    const activeOrders = await Order.find({
      status: { $nin: ["cancelled", "returned"] },
    });
    for (const order of activeOrders) {
      if (order.deliveryDate <= new Date()) {
        order.status = "Delivered";
        await order.save();
      }
    }

    res.render("user/userOrders", {
      title: "See Your All-Orders",
      orders,
      totalPages,
      currentPage: page || 1,
      skip,
      limit,
      categoryId: null,
      priceRange: null,
      cartCount: cartCount || "",
      user: req.session.user || "",
      sort: null,
      query: null,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "error in fetching orders" });
  }
};
//get order details page
const getOrderDetails = async (req, res) => {
  console.log("from user order details page");
  try {
    const orderId = req.params.orderId;
    console.log(" orderId ", orderId);

    //fetching orders
    const order = await Order.findOne({ _id: orderId }).populate(
      { path: "items.variantId", from: "Variant", select: 'images color size' }

    ).populate({ path: 'items.productId', from: "Product", select: 'productName price' })
    if (!order) {
      res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order') });
    }
    console.log('order ', order);

    let cartCount = 0
    const cart = await Cart.findOne({ userId: req.session.user._id })
    if (cart) {
      cartCount = cart.items.length
    }
    res.render("user/orderDetails", {
      title: "order details page",
      order,
      query: '',
      priceRange: '', categoryId: '',
      sort: '',
      user: req.session.user || '',
      cartCount: 0
    });
  } catch (error) {
    console.log("error:", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};
const cancelOrder = async (req, res) => {
  console.log("form order cancel route");
  try {
    let orderId = req.params.orderId;
    console.log("order id ", orderId);
    if (!orderId) {
      console.log("order id is not fount");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order id') });
    }

    // orderId = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    if (!order) {
      console.log("order  is not fount");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order') });
    }
    console.log('order', order);


    order.status = "cancelled";
    order.items.forEach((item) => (item.status = "cancelled"));
    order.save();
    const finalAmount = order.finalAmount;
    const shippingCharge=order.shippingCharge

    // restoring wallet
    if(order.paymentMethod!=='COD'){
        const wallet = await Wallet.findOne({ userId: req.session.user._id });
      wallet.balance = wallet.balance + finalAmount+shippingCharge;
      wallet.transactions.push({
        type: "credit",
        amount: (finalAmount+shippingCharge),
        date: new Date(),
        description: "Order Cancelled,Amount refunded",
      });
      await wallet.save();
    }
    
    

    // restoring stock

    for (item of order.items) {
      const variant = await Variant.findById(item.variantId);
      console.log('variant',variant);
      
      console.log(
        `user cancelling before restoring  is ${variant.stock}`,
      );
      variant.stock = variant.stock + item.quantity;
      await variant.save();
      console.log(`after restoring is ${variant.stock}`);
    }

    console.log("order cancelled succeccfully");
    return res.status(statusCodes.OK).json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

//user side
const cancelSingleProduct = async (req, res) => {
  console.log("cancelSingleProduct");

  try {
    const { variantId, orderId } = req.body;
    console.log("variantid,orderId ", variantId, orderId);

    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      console.log("order not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order') });
    }

    let itemQuantity = 0;
    let itemPrice = 0;
    order.items.forEach((item) => {
      if (
        item.variantId.toString() === variantId &&
        item.status !== "cancelled"
      ) {
        item.status = "cancelled";
        console.log("deleting item", item);
        itemQuantity = item.quantity;
      }
    });

    console.log("one product cancelled");
    console.log("quantity ", itemQuantity);

    //stock restock
    const variant = await Variant.findOne({ _id: variantId });
    if (!variant) {
      console.log("Variant not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Variant") });
    }
    variant.stock += itemQuantity;
    await variant.save();
    console.log("stock restocked ", itemQuantity);

    const product=await Product.findOne({_id:variant.productId})

    if(!product){
      console.log("product not found");
      return res.status(statusCodes.NOT_FOUND).json({success:false,message:statusMessages.NOT_FOUND('Product')})
    }

        itemPrice = product.price;
    console.log("price ", itemPrice);

    // amount refund
    let refundAmount = itemPrice * itemQuantity;
    let actualRefundAmount = refundAmount;

    if (order.items.length === 1) {
      console.log("Only one item in order.");

      if (order.isOfferApplied) {
        refundAmount -= order.offerDiscountAmount;
      }

      if (order.isCouponApplied) {
        refundAmount -= order.coupenDiscountAmount;
      }

      // Entire order is cancelled
      order.totalAmount = 0;
      order.finalAmount = 0;
      order.coupenDiscountAmount = 0;
      order.isCouponApplied = false;
    } else {
      //if offerapplied
      if (order.isOfferApplied) {
        let cancelItem = order.items.find(
          (item) => item.productId.toString() == product._id.toString(),
        );
        if (cancelItem.offerApplied) {
          order.offerDiscountAmount = Math.max(
            0,
            order.offerDiscountAmount - cancelItem.offerDiscount,
          );
          if (order.offerDiscountAmount == 0) {
            order.isOfferApplied = false;
          }
          refundAmount -= cancelItem.offerDiscount;
        }
      }
      // More than one item in the order
      if (order.isCouponApplied) {
        const code = order.couponCode;
        const coupon = await Coupon.findOne({ coupenCode: code });

        if (coupon.minPurchase > order.totalAmount - actualRefundAmount) {
          // Coupon no longer valid after refund
          order.totalAmount -= actualRefundAmount;
          console.log("now total amount is ", order.totalAmount);

          refundAmount -= order.coupenDiscountAmount; // Reduce refund
          order.finalAmount -= refundAmount;
          console.log("now final amount is ", order.finalAmount);
          // Remove coupon

          console.log("now final amount is ", order.finalAmount);
          order.coupenDiscountAmount = 0;
          order.isCouponApplied = false;
        } else {
          order.totalAmount -= actualRefundAmount;
          order.finalAmount -= refundAmount;
        }
      } else {
        // No coupon applied, normal refund
        order.totalAmount -= actualRefundAmount;
        order.finalAmount -= refundAmount;
      }
    }

    // Final checks
    if (order.finalAmount < 0) {
      order.finalAmount = 0;
    }

    // Check if all items cancelled
    const allItemsCancelled = order.items.every(
      (item) => item.status === "cancelled",
    );
    if (allItemsCancelled) {
      order.status = "cancelled";
    }

    if(order.items.length==1){
      refundAmount=refundAmount+order.shippingCharge
      order.shippingCharge=0
    }else{
      if(order.items.every(item=>item.status=='cancelled')){
        refundAmount=refundAmount+order.shippingCharge
      }
    }

    await order.save();

    const userId = req.session.user._id;
    if (!userId) {
      console.log("User not registered");
      return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: "User not registered" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.log("wallet not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Wallet")});
    }

    if(order.paymentMethod!=="COD"){
       wallet.balance += refundAmount;

      wallet.transactions.push({
        amount: refundAmount,
        type: "credit",
        date: new Date(),
        description: "Product Cancelled",
      });
      await wallet.save();

      console.log(refundAmount, "refunded to wallet");
    }
     
    
    return res.status(statusCodes.OK).json({ success: true, message: "Product order cancelled" });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR});
  }
};

const returnProduct = async (req, res) => {
  console.log("from user return product");
  try {
    const { variantId, orderId, reason } = req.body;
    if (!variantId) {
      console.log("variant id is not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Variant Id') });
    } else if (!reason) {
      console.log("reson not found");

      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Enter reason for returning",
      });
    } else if (!orderId) {
      console.log("OrderId not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Order Id") });
    }

    // fetching order
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      console.log("Order not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Order")});
    }
    if (order.status !== "Delivered") {
      console.log("the order is not delvered");
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "YOu can return after delivered",
      });
    }
    const productInOrder = order.items.find(
      (item) => item.variantId.toString() === variantId,
    );

    if (productInOrder.isReturned == true) {
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Already Returned" });
    }
    //fetching product
    const variant = await Variant.findOne({ _id: variantId });
    if (!variant) {
      console.log("Variant  not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Variant") });
    }
    const existReturn = order.returnRequests.find(
      (req) => req.variantId.toString() == variantId.toString(),
    );
    if (existReturn) {
      console.log("already requested");
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Already requested" });
    }

    productInOrder.status = "returnRequested";
    // saving reason in order
    order.returnRequests = order.returnRequests || [];
    order.returnRequests.push({
      variantId:variantId,
      productId: variant.productId,
      reason: reason,
      status: "pending",
      date: new Date(),
    });

    productInOrder.status = "return-requested";
    await order.save();

    console.log("Return request saved successfully");
    return res.status(statusCodes.OK).json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

const getAdminOrders = async (req, res) => {
  console.log("from admin get order page");
  try {


    //dummy datas
    const adminUser = {
      name: "Admin User",
      role: "Administrator",
      profileImage: "/images/admin-avatar.jpg",
    };
    const filter = {
      status: "all",
      date: "",
      search: '',
    };
    let page = parseInt(req.query.page) || 1;
    limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;
    console.log(`page is ${page} and limt is ${limit}`);

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find()
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);


    const activeOrders = await Order.find({
      status: { $nin: ["cancelled", "returned"] },
    });
    for (const order of activeOrders) {
      if (order.deliveryDate <= new Date()) {
        order.status = "Delivered";
        await order.save();
      }
    }

    //console.log("activeOrders ", activeOrders);

    console.log("orders are ", orders);
    return res.render("admin/orders", {
      title: "Admin Orders",
      adminUser,
      filter,
      orders,
      currentPage: page,
      thisPage: 'orders',
      totalPages,
    });
  } catch (error) {
    console.log("error in fetching orders", error);
  return  res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

const adminOrderDetails = async (req, res) => {
  console.log("from admin get order details");
  const orderId = req.params.orderId;
  const order = await Order.findOne({ _id: orderId }).populate(
    "items.productId",
  );
  if (!order) {
    console.log("order not found");
    return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order') });
  }
  const userId = order.userId;
  console.log("user Id is ", userId);

  const user = await User.findOne({ _id: userId });
  if (!user) {
    console.log("user not found");
    return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND('User') });
  }
  res.render("admin/adminViewOrder", {
    user,
    order,
    title:"Order details",
    thisPage:'orders'
  });
};

const getUpdateOrder = async (req, res) => {
  console.log("from admin order update route");
  try {
    const orderId = req.params.orderId;
    const order = await Order.findOne({ _id: orderId }).populate(
      "items.productId",
    );
    if (!order) {
      console.log("order not found");
    return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND('Order') });
    }

    res.render("admin/adminEditOrder", {
      order,
      title:"Edit Order",
      thisPage:"orders"
    });
  } catch (error) {
    console.log(error);
   return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

//post update user
const postUpdateOrder = async (req, res) => {
  console.log("from post update order");
  const formObject = req.body;
  const orderId = formObject.orderId;
  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    console.log("order not found");
    return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND('Order') });
  }
  order.status = formObject.status;
  let activeitems = order.items.filter(item => item.status === 'active')
  activeitems.forEach(item => item.status = order.status)
  await order.save();
 if(order.status=='cancelled'){
  for (item of order.items) {
      const variant = await Variant.findById(item.variantId);
      const product=await Product.findOne({_id:variant.productId})

      variant.stock = variant.stock + item.quantity;
      await variant.save();
      console.log(`after restoring ${product.productName} is ${product.stock}`);
    }

    
    if(order.paymentMethod!=="COD"){
      const userId=order.userId
      const wallet=await Wallet.findOne({userId})
      if(!wallet){
        return res.status(statusCodes.NOT_FOUND).json({success:false,message:statusMessages.NOT_FOUND('Wallet')})
      }
      const refundAmount=order.finalAmount+order.shippingCharge
      console.log('refundAmount',refundAmount);
      wallet.balance+=refundAmount
      wallet.transactions.push({
        amount:refundAmount,
        type:'credit',
        description:'Order Cancelled',
        date:new Date()

      })
      wallet.save()
    }

 }
  console.log("order staus updated succesfully");
  return res.status(statusCodes.OK).json({
    success: true,
    message: "order status updated succesfully",
    orderStatus: order.status
  });
};

const adminCancelOrder = async (req, res) => {
  console.log("from admin order Cancel route");

  try {
    const orderId = req.params.orderId;
    if (!orderId) {
      console.log("Order id is not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order Id') });
    }
    const order = await Order.findOne({ _id: orderId }).populate(
      "items.productId",
    );

    if (!order) {
      console.log("order not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Order') });
    }
    if (order.status == "cancelled") {
      console.log("order already cancelled");

      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "order already cancelled" });
    }
    order.status = "cancelled";
    await order.save();


    console.log("order cancelled successfully");

    //restore the stock

    for (item of order.items) {
      const variant = await Variant.findById(item.variantId);
      const product=await Product.findOne({_id:variant.productId})

      variant.stock = variant.stock + item.quantity;
      await variant.save();
      console.log(`after restoring ${product.productName} is ${product.stock}`);
    }

    if(order.paymentMethod!=="COD"){
      const userId=order.userId
      const wallet=await Wallet.findOne({userId})
      if(!wallet){
        return res.status(statusCodes.NOT_FOUND).json({success:false,message:statusMessages.NOT_FOUND('Wallet')})
      }
      const refundAmount=order.finalAmount+order.shippingCharge
      console.log('refundAmount',refundAmount);
      wallet.balance+=refundAmount
      wallet.transactions.push({
        amount:refundAmount,
        type:'credit',
        description:'Order Cancelled',
        date:new Date()

      })
      wallet.save()
    }


    return res.status(statusCodes.OK).json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.log("error in fetching order");
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};
module.exports = {
  placeOrder,
  varifyPayment,
  getOrderSuccess,
  getPaymentFailure,
  getOrderDetails,
  getOrders,
  cancelOrder,
  cancelSingleProduct,
  returnProduct,

  //admin
  getAdminOrders,
  adminOrderDetails,
  getUpdateOrder,
  postUpdateOrder,
  adminCancelOrder

}