
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

const getPendings = async (req, res, next) => {
  try {
    const limit=parseInt(req.query.limit)||5
    const page=parseInt(req.query.page) ||1
    const skip=parseInt( page-1)*limit
    const orders = await Order.find({
      returnRequests: { $exists: true, $ne: [] },
    });

    console.log('page ',page,'limit',limit,'skip',skip);
    
    //fetching return requests

    const returnRequests = [];
    const variants = await Variant.find();
    const products=await Product.find()
    const users = await User.find();
    orders.forEach((order) => {
      order.returnRequests.forEach((request) => {
        const variant = variants.find(
          (variant) => variant._id.toString() == request.variantId?.toString(),
        );
        const product=products.find(p=>p._id?.toString()==variant.productId?.toString())
        const user = users.find(
          (user) => user._id.toString() == order.userId?.toString(),
        );
        returnRequests.push({
          userId: order.userId,
          variantId: request.variantId,
          reason: request.reason,
          requestedDate: request.date,
          orderId: order._id,
          status: request.status,
          productName: product?.productName || "",
          userEmail: user.email,
        });
      });
    });

    const allRequests = [...returnRequests];
    const paginatedRequests = allRequests.slice(skip, skip + limit);
 const totalRequests = orders.reduce((count, order) => {
  const requests = Array.isArray(order.returnRequests) ? order.returnRequests : [];
  return count + requests.length;
}, 0);

 const totalPages=Math.ceil(totalRequests/limit)
    // console.log('requestedItems ', returnRequests);

    res.render("admin/aprovalPage", {
      title: "Approvals Management",
      returnRequests:paginatedRequests,
      thisPage: 'pendings',
      totalPages,
      currentPage:page||1,
      skip,
      limit,
      limit
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const approveReturn = async (req, res) => {
  try {
    console.log("From approveReturn");
    const { orderId, variantId } = req.body;
    console.log("orderId, variantId", orderId, variantId);

    if (!orderId || !variantId) {
      throw new Error("Order ID or Variant ID not found");
    }

    const order = await Order.findOne({ _id: orderId });
    if (!order) throw new Error("Order not found");

    const variant = order.items.find(
      (item) => item.variantId.toString() === variantId.toString(),
    );
    if (!variant) throw new Error("Product not found in order items");

    console.log("returning variant is ", variant);

    // Update product status
    variant.status = "returned";
    variant.isreturned = true;
    order.markModified("items");

    // If all products are returned, mark the whole order as returned
    if (order.items.every((item) => item.status === "returned")) {
      order.status = "returned";
    }

    // Approve the return request
    const returnRequest = order.returnRequests.find(
      (req) => req.variantId?.toString() === variantId.toString(),
    );
    if (!returnRequest)
      throw new Error("Return request not found for this product");

    //console.log('returnrequest before save',returnRequest);

    returnRequest.status = "approved";
    order.markModified("returnRequests");
    console.log("Return approved");

    await order.save();

    console.log("returnrequest after save", order.returnRequests);
    // Restock product
    const quantity = variant.quantity;
    const item = await Variant.findOne({ _id: variantId }).populate('productId');
    if (!item) throw new Error("Product not found in database");
    item.stock += quantity;
    await item.save();
    console.log("variant restocked");

    console.log('quantity,item.productId.price',quantity,item.productId.price);
    
    // calculating refund amount
    let refundAmount = quantity * item.productId.price;
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
      const productId=variant.productId
      //if offerapplied
      if (order.isOfferApplied) {
        let returnlItem = order.items.find(
          (item) => item.productId.toString() == productId.toString(),
        );
        console.log("returning item ", returnlItem);

        if (returnlItem.offerApplied) {
          order.offerDiscountAmount = Math.max(
            0,
            order.offerDiscountAmount - returnlItem.offerDiscount,
          );
          if (order.offerDiscountAmount == 0) {
            order.isOfferApplied = false;
          }
          refundAmount -= returnlItem.offerDiscount;
        }
      }
      // More than one item in the order
      if (order.isCouponApplied) {
        const code = order.couponCode;
        const coupon = await Coupen.findOne({ coupenCode: code });

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

    if (order.finalAmount < 0) {
      order.finalAmount = 0;
    }

    // if(order.items.length==1 && order.isOfferApplied){
    //   refundAmount-=order.offerDiscountAmount

    // }
    //  if(order.items.length==1 && order.isCouponApplied){
    //   refundAmount=refundAmount-order.coupenDiscountAmount
    // }

    const userId = order.userId;
    if (!userId) throw new Error("User ID is not found");
    // Wallet refund

  
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) throw new Error("Wallet not found");
      wallet.balance += refundAmount;

      // UPDATE TRANSACTIONS
      wallet.transactions.push({
        amount: refundAmount,
        type: "credit",
        date: new Date(),
        description: "Product returned",
      });

      await wallet.save();
    

    console.log("Wallet refunded with:", refundAmount);

    await order.save();

    return res.json({
      success: true,
      message: "Return approved successfully",
    });
  } catch (error) {
    console.error("Error in approveReturn:", error.message, error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

const rejectReturn = async (req, res) => {
  try {
    console.log("From rejectReturn");

    const { orderId, variantId } = req.body;
    console.log(orderId, variantId, "orderId, variantid");

    // Validate inputs
    if (!orderId) throw new Error("Order ID not found");
    if (!variantId) throw new Error("Product ID not found");

    // Find the order
    const order = await Order.findOne({ _id: orderId });
    if (!order) throw new Error("Order not found");

    // Find the product in order items
    const product = order.items.find(
      (item) => item.variantId.toString() === variantId.toString(),
    );
    if (!product) throw new Error("Product not found in order items");

    // Revert status back to delivered (or keep original if needed)
    product.status = "delivered";
    order.markModified("items");

    // Find and reject the return request
    const returnRequest = order.returnRequests.find(
      (req) => req.variantId?.toString() === variantId.toString(),
    );
    if (!returnRequest)
      throw new Error("Return request not found for this product");
    console.log("returnRequest", returnRequest);

    returnRequest.status = "rejected";

    // Save changes
    await order.save();

    return res.json({ success: true, message: "Return rejected successfully" });
  } catch (error) {
    console.error("Error in rejectReturn:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports={
    getAdminOrders,
    adminOrderDetails,
    getUpdateOrder,
    postUpdateOrder,
    adminCancelOrder,
    getPendings,
    approveReturn,
    rejectReturn
}