// controllers/adminController.js
const Admin = require("../model/adminModel");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const router = require("../routes/product");
const Order = require("../model/orderModel");
const Coupen = require("../model/coupenModel");
const Offer = require("../model/offerModel");
const RefferalOffer = require("../model/referralOfferModel");
const Category = require("../model/categoryModel");
const { default: mongoose } = require("mongoose");
const Wallet = require("../model/walletModel");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const puppeteer = require('puppeteer')
const ExcelJS = require("exceljs");
const Variant=require('../model/variantModel')

const Razorpay = require("razorpay");
const StatusCodes = require("../utils/statusCodes");
const statusMessages = require("../utils/statusMessages");
// get login
const getLogin = async (req, res) => {
  res.render("admin/login", { errorMessage: null });
};

// Post login
const postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.render("admin/login", {
        errorMessage: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("admin/login", {
        errorMessage: "Invalid email or password",
      });
    }

    // Store admin session and redirect to dashboard
    req.session.admin = admin;

    res.redirect("/admin/dashboard");
  } catch (error) {
    res.render("admin/login", { errorMessage: "Something went wrong" });
  }
};


//get users
const getUsers = async (req, res) => {
  res.render("admin/user", { errorMessage: null });
};

//searchProducts

const searchProducts = async (req, res) => {
  console.log("from admin searchproducts route");

  try {
    const { query, type } = req.query;

    console.log(`Search Query: ${query}, Type: ${type}`);

    ////
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    console.log(`page is ${page} and limt is ${limit}`);

    ///

    let searchQuery = {};
    if (type == "category") {
      searchQuery = {
        categoryName: { $regex: query, $options: "i" },
      };
    } else if (type == "users") {
      searchQuery = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      };
    } else {
      return res.status(400).json({ error: "Invalid search type" });
    }

    //finding results
    if (type === "products") {
      let products = await Product.find(searchQuery)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

      const totalProducts = await Product.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalProducts / limit);

      res.render("admin/productManagement", {
        title: "Product Management",
        currentPage: page || 1,
        totalPages,
        products,
        successMessage: res.locals.successMessage || "",
        errorMessage: res.locals.errorMessage || "",
      });
    } else if (type === "categories") {
      const totalCategory = await Category.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalCategory / limit);

      let categories = await Category.find(searchQuery);
      res.render("../views/admin/categoryManagement", {
        categories,
        totalCategory,
        currentPage: page || 1,
        totalPages,
        title: "Category Manamgement",
        successMessage: res.locals.successMessage[0] || "",
        errorMessage: res.locals.errorMessage[0] || "",
      });
    } else if (type === "users") {
      let users = await User.find(searchQuery).skip(skip).limit(limit);
      const totalUsers = await User.countDocuments(searchQuery);
      const totalPages = totalUsers / limit;

      res.render("../views/admin/userManagement", {
        users,
        title: "User Management",
        totalPages,
        currentPage: page || 1,

        successMessage: res.locals.successMessage || "",
        errorMessage: res.locals.errorMessage || "",
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
    console.log(error + "error");
  }
};

//admin get order page

// const getOrder = async (req, res) => {
//   console.log("from admin get order page");
//   try {


//     //dummy datas
//     const adminUser = {
//       name: "Admin User",
//       role: "Administrator",
//       profileImage: "/images/admin-avatar.jpg",
//     };
//     const filter = {
//       status: "all",
//       date: "",
//       search: '',
//     };
//     let page = parseInt(req.query.page) || 1;
//     limit = parseInt(req.query.limit) || 5;
//     let skip = (page - 1) * limit;
//     console.log(`page is ${page} and limt is ${limit}`);

//     const totalOrders = await Order.countDocuments();
//     const totalPages = Math.ceil(totalOrders / limit);

//     const orders = await Order.find()
//       .populate("userId")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);


//     const activeOrders = await Order.find({
//       status: { $nin: ["cancelled", "returned"] },
//     });
//     for (const order of activeOrders) {
//       if (order.deliveryDate <= new Date()) {
//         order.status = "Delivered";
//         await order.save();
//       }
//     }

//     //console.log("activeOrders ", activeOrders);

//     console.log("orders are ", orders);
//     return res.render("admin/orders", {
//       title: "Admin Orders",
//       adminUser,
//       filter,
//       orders,
//       currentPage: page,
//       thisPage: 'orders',
//       totalPages,
//     });
//   } catch (error) {
//     console.log("error in fetching orders", error);
//     res.json({ success: false, message: "Order fetching failed" });
//   }
// };

//get order details

// const getOrderDetails = async (req, res) => {
//   console.log("from admin get order details");
//   const orderId = req.params.orderId;
//   const order = await Order.findOne({ _id: orderId }).populate(
//     "items.productId",
//   );
//   if (!order) {
//     console.log("order not found");
//     res.json({ success: false, message: "Order not found" });
//   }
//   const userId = order.userId;
//   console.log("user Id is ", userId);

//   const user = await User.findOne({ _id: userId });
//   if (!user) {
//     console.log("user not found");
//     res.json({ success: false, message: "User not found" });
//   }
//   res.render("admin/adminViewOrder", {
//     user,
//     order,
//     title:"Order details",
//     thisPage:'orders'
//   });
// };

// //get ipdate order
// const getUpdateOrder = async (req, res) => {
//   console.log("from admin order update route");
//   try {
//     const orderId = req.params.orderId;
//     const order = await Order.findOne({ _id: orderId }).populate(
//       "items.productId",
//     );
//     if (!order) {
//       console.log("order not found");
//       res.json({ success: false, message: "Order not found" });
//     }

//     res.render("admin/adminEditOrder", {
//       order,
//       title:"Edit Order",
//       thisPage:"orders"
//     });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: "Order not found" });
//   }
// };

//post update user
// const postUpdateOrder = async (req, res) => {
//   console.log("from post update order");
//   const formObject = req.body;
//   const orderId = formObject.orderId;
//   const order = await Order.findOne({ _id: orderId });
//   if (!order) {
//     console.log("order not found");
//     return res.json({ success: false, message: "Order not found" });
//   }
//   order.status = formObject.status;
//   let activeitems = order.items.filter(item => item.status === 'active')
//   activeitems.forEach(item => item.status = order.status)
//   await order.save();
//   console.log("order staus updated succesfully");
//   return res.json({
//     success: true,
//     message: "order status updated succesfully",
//     orderStatus: order.status
//   });
// };

//admin delete order
// const cancelOrder = async (req, res) => {
//   console.log("from admin order Cancel route");

//   try {
//     const orderId = req.params.orderId;
//     if (!orderId) {
//       console.log("Order id is not found");

//       return res.json({ success: false, message: "Order id is not found" });
//     }
//     const order = await Order.findOne({ _id: orderId }).populate(
//       "items.productId",
//     );

//     if (!order) {
//       console.log("order not found");

//       return res.json({ success: false, message: "order not found" });
//     }
//     if (order.status == "cancelled") {
//       console.log("order already cancelled");

//       return res.json({ success: false, message: "order already cancelled" });
//     }
//     order.status = "cancelled";
//     await order.save();


//     console.log("order cancelled successfully");

//     //restore the stock

//     for (item of order.items) {
//       const product = await Product.findById(item.productId);
//       console.log(
//         `before restoring ${product.productName} is ${product.stock}`,
//       );

//       product.stock = product.stock + item.quantity;
//       await product.save();
//       console.log(`after restoring ${product.productName} is ${product.stock}`);
//     }



//     return res.json({ success: true, message: "Order cancelled successfully" });
//   } catch (error) {
//     console.log("error in fetching order");
//     return res.json({ success: false, message: "error in fetching order" });
//   }
// };

//admin logout
const postLogout = async (req, res) => {
  console.log("from admin logout route");
  req.session.admin = null;
  console.log("admin in session is ", req.session.admin);
  return res.json({ success: true, message: "Admin logouted successfully" });
};


const getPendings = async (req, res, next) => {
  try {
    const limit=parseInt(req.query.limit)||5
    const page=parseInt(req.query.page) ||1
    const skip=parseInt( page-1)*limit
    const orders = await Order.find({
      returnRequests: { $exists: true, $ne: [] },
    });

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

 const totalRequests = orders.reduce((count, order) => {
  const requests = Array.isArray(order.returnRequests) ? order.returnRequests : [];
  return count + requests.length;
}, 0);

 const totalPages=Math.ceil(totalRequests/limit)
    // console.log('requestedItems ', returnRequests);

    res.render("admin/aprovalPage", {
      title: "Approvals Management",
      returnRequests,
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

const getSalesReport = async (req, res, next) => {
  try {
    console.log("from sales report page");

    const reportType = req.query.reportType || "";
    console.log("reportType", reportType);

    let matchStage = { $match: { status: { $eq: "Delivered" } } };
    let groupStage, sortStage;

    if (reportType === "weekly") {
      groupStage = {
        $group: {
          _id: { $isoWeek: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "monthly") {
      groupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "yearly") {
      groupStage = {
        $group: {
          _id: { $year: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "custom") {
      const { startDate, endDate } = req.query;
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: { $ne: "cancelled" },
        },
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$finalAmount" },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    }

    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage,
    ]);

    console.log("salesData", salesData);
    const totalSales = await salesData.map((s) => s.totalSales);
    console.log("totalSales", totalSales);

    //salesdates
    const year = 2025;
    const month = 4;
    const salesDates = salesData.map((item) => {
      const id = item._id;

      if (reportType === "weekly") {
        return `Week ${id}`;
      } else if (reportType === "monthly") {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        return monthNames[id - 1]; // since $month returns 1 for Jan
      } else if (reportType === "yearly") {
        return id.toString(); // id is the year
      } else if (reportType === "custom") {
        return id; // it's already a formatted date string like "2025-05-12"
      } else {
        // default: daily by day of month
        const date = new Date(year, month, id);
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return days[date.getDay()];
      }
    });

    console.log("salesDates", salesDates);

    //total discounts
    let discountMatchStage = { $match: { status: { $ne: "cancelled" } } };
    let discountGroupStage, discountSortStage;

    if (reportType === "weekly") {
      discountGroupStage = {
        $group: {
          _id: { $isoWeek: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else if (reportType === "monthly") {
      discountGroupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else if (reportType === "yearly") {
      discountGroupStage = {
        $group: {
          _id: { $year: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else if (reportType === "custom") {
      const { startDate, endDate } = req.query;
      discountMatchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: { $ne: "cancelled" },
        },
      };
      discountGroupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else {
      // default: daily (per day)
      discountGroupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    }

    const totalDiscount = await Order.aggregate([
      discountMatchStage,
      discountGroupStage,
      discountSortStage,
    ]);

    console.log("total discont", totalDiscount);

    //top products
    let topProductMatchStage = { status: { $eq: "Delivered" } };

    const topProducts = await Order.aggregate([
      { $match: topProductMatchStage },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          productName: { $first: "$productDetails.productName" },
          images: { $first: "$productDetails.images" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 3 },
    ]);
    // console.log('top products ', topProducts);

    //recent orders
    const recentOrders = await Order.find({
      status: { $nin: ["cancelled", "returned"] },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const salesDatas = [

    ];

    const orders = await Order.find({ status: "Delivered" });
    let summary = {
      offerDiscountAmount: totalDiscount.reduce(
        (acc, val) => acc + val.totalDiscountAmount,
        0,
      ),
      couponDiscount: totalDiscount.reduce(
        (acc, val) => acc + val.couponDiscount,
        0,
      ),
      totalOrders: orders.length,
      totalRevenue: totalSales.reduce((acc, val) => acc + val, 0),
    };
    res.render("admin/report", {
      title: "Sales Report",
      salesData,
      recentOrders,
      summary,
      topProducts,
      totalSales: totalSales || 0,
      reportType,
      salesDates,
      thisPage: 'reports',
      salesDatas,
    });
  } catch (error) {
    console.error("Error generating sales report:", error);
    next(error);
  }
};

const updateSaleReport = async (req, res, next) => {
  console.log("updateSaleReport");
  try {
    const reportType = req.query.reportType || "";
    console.log("reportType", reportType);
    //////
    let matchStage = { $match: { status: { $eq: "Delivered" } } };
    let groupStage, sortStage;

    if (reportType === "weekly") {
      groupStage = {
        $group: {
          _id: { $isoWeek: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "monthly") {
      groupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "yearly") {
      groupStage = {
        $group: {
          _id: { $year: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "custom") {
      const { startDate, endDate } = req.query;
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: { $ne: "cancelled" },
        },
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    }

    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage,
    ]);

    console.log("salesData from updates", salesData);
    const totalSales = await salesData.map((s) => s.totalSales);
    console.log("totalSales", totalSales);

    //salesdates
    const year = 2025;
    const month = 4;
    const salesDates = salesData.map((item) => {
      const id = item._id;

      if (reportType === "weekly") {
        return `Week ${id}`;
      } else if (reportType === "monthly") {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        return monthNames[id - 1]; // since $month returns 1 for Jan
      } else if (reportType === "yearly") {
        return id.toString(); // id is the year
      } else if (reportType === "custom") {
        return id; // it's already a formatted date string like "2025-05-12"
      } else {
        // default: daily by day of month
        const date = new Date(year, month, id);
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return days[date.getDay()];
      }
    });

    console.log("salesDates", salesDates);

    //total discounts
    let discountMatchStage = { $match: { status: { $ne: "cancelled" } } };
    let discountGroupStage, discountSortStage;

    if (reportType === "weekly") {
      discountGroupStage = {
        $group: {
          _id: { $isoWeek: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else if (reportType === "monthly") {
      discountGroupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else if (reportType === "yearly") {
      discountGroupStage = {
        $group: {
          _id: { $year: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else if (reportType === "custom") {
      const { startDate, endDate } = req.query;
      discountMatchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: { $ne: "cancelled" },
        },
      };
      discountGroupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    } else {
      // default: daily (per day)
      discountGroupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          totalDiscountAmount: { $sum: "$offerDiscountAmount" },
          couponDiscount: { $sum: "$coupenDiscountAmount" },
        },
      };
      discountSortStage = { $sort: { _id: 1 } };
    }

    const totalDiscount = await Order.aggregate([
      discountMatchStage,
      discountGroupStage,
      discountSortStage,
    ]);

    console.log("total discont", totalDiscount);

    //top products
    let topProductMatchStage = { status: { $ne: "cancelled" } };

    if (reportType == "weekly") {
      const today = new Date();
      const firstDayOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay()),
      );
      const lastDayOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay() + 6),
      );
      topProductMatchStage.createdAt = {
        $gte: firstDayOfWeek,
        $lte: lastDayOfWeek,
      };
    } else if (reportType == "monthly") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      topProductMatchStage.createdAt = { $gte: firstDay, $lte: lastDay };
    } else if (reportType == "yearly") {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      topProductMatchStage.createdAt = { $gte: start, $lte: end };
    } else if (reportType == "custom") {
      const { startDate, endDate } = req.query;
      topProductMatchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0));
      const end = new Date(today.setHours(23, 59, 59, 999));
      topProductMatchStage.createdAt = { $gte: start, $lte: end };
    }

    // const topProducts = await Order.aggregate([
    //   { $match: topProductMatchStage },
    //   { $unwind: '$items' },
    //   {
    //     $lookup: {
    //       from: 'products',
    //       localField: 'items.productId',
    //       foreignField: '_id',
    //       as: 'productDetails'
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: '$items.productId',
    //       sold: { $sum: '$items.quantity' },
    //       totalAmount: {
    //         $sum: {
    //           $multiply: [
    //             '$items.quantity',
    //             { $arrayElemAt: ['$productDetails.price', 0] }
    //           ]
    //         }
    //       },
    //       productName: { $first: { $arrayElemAt: ['$productDetails.productName', 0] } },
    //       images: { $first: { $arrayElemAt: ['$productDetails.images', 0] } }
    //     }
    //   },
    //   { $project: { sold: 1, totalAmount: 1, productName: 1, images: 1 } },
    //   { $sort: { sold: -1 } },
    //   { $limit: 3 }
    // ]);

    //recent orders
    const recentOrders = await Order.find({ status: { $ne: "cancelled" } })
      .sort({ createdAt: -1 })
      .limit(3);

    //summary

    // let summary = {
    //   offerDiscountAmount: totalDiscount.reduce((acc, val) => acc + val.totalDiscountAmount, 0),
    //   couponDiscount: totalDiscount.reduce((acc, val) => acc + val.couponDiscount, 0),
    //   totalOrders: salesData.length,
    //   totalRevenue: totalSales.reduce((acc, val) => acc + val, 0),
    // }
    console.log("salesDates,totalsales", salesDates, totalSales);

    res.json({
      success: true,
      message: "Data got successfully",
      totalSales,
      salesDates,
      salesData,
    });
    /////
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const downloadSaleReportpdf = async (req, res, next) => {
  console.log("downloadSaleReportpdf");
  try {
    const { chartImage, startDate, endDate, reportType } = req.body;

    //getiing salesdata
    console.log("reportType", reportType);
    //////
    let matchStage = { $match: { status: { $eq: "Delivered" } } };
    let groupStage, sortStage;

    if (reportType === "weekly") {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%G-W%V", date: "$createdAt" }, // ISO week year and week
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "monthly") {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%B %Y", date: "$createdAt" }, // e.g., "May 2025"
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };

      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "yearly") {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%Y", date: "$createdAt" },
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };

      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "custom") {
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: { $ne: "cancelled" },
        },
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%d %b %G", date: "$createdAt" },
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    }

    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage,
    ]);

    console.log("sale Dta", salesData);
    console.log("sales data", salesData);

    const htmlContent = await ejs.renderFile(
      path.join(__dirname, "..", "views", "admin", "salesReportpdf.ejs"),
      {
        chartImage,
        salesData,
        reportType,
        startDate: startDate || null,
        endDate: endDate || null,
      },
    );

    const downloadsDir = path.join(__dirname, "..", "public", "downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
   

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=SalesReport.pdf");
    res.setHeader("Content-Length", pdfBuffer.length); 
    console.log('length',pdfBuffer.length);
   
    res.end(pdfBuffer);
   

  } catch (error) {
    console.error(error);
    next(error);
  }
};

const downloadSaleReportExcel = async (req, res, next) => {
  console.log("downloadSaleReportExcel");
  try {
    const { startDate } = req.query || null;
    const { endDate } = req.query || null;
    const { reportType } = req.query;
    console.log("startDate,endDate,reportType", startDate, endDate, reportType);
    //geting salesdata
    console.log("reportType", reportType);
    //////
    let matchStage = { $match: { status: { $eq: "Delivered" } } };
    let groupStage, sortStage;

    if (reportType === "weekly") {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%G-W%V", date: "$createdAt" }, // ISO week year and week
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "monthly") {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%B %Y", date: "$createdAt" }, // e.g., "May 2025"
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };

      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "yearly") {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%Y", date: "$createdAt" },
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };

      sortStage = { $sort: { _id: 1 } };
    } else if (reportType === "custom") {
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: { $ne: "cancelled" },
        },
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    } else {
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%d %b %G", date: "$createdAt" },
          },
          totalSales: { $sum: "$finalAmount" },
          offerDeduction: { $sum: "$offerDiscountAmount" },
          couponDeduction: { $sum: "$coupenDiscountAmount" },
          orderCount: { $sum: 1 },
        },
      };
      sortStage = { $sort: { _id: 1 } };
    }

    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage,
    ]);

    console.log("sale Dta", salesData);
    console.log("sales data", salesData);

    console.log("sale Data from excel", salesData);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      {
        header:
          reportType === "daily" || reportType === "custom"
            ? "Date"
            : reportType === "weekly"
              ? "Week"
              : reportType === "monthly"
                ? "Month"
                : "Year",
        key: "date",
        width: 20,
      },
      { header: "Total Discount", key: "totalDiscount", width: 15 },
      { header: "Order Count", key: "orderCount", width: 15 },
      { header: "Total Sales", key: "total", width: 15 },
    ];

    let grandTotal = 0;
    let grandDiscount = 0;
    let grandOrderCount = 0;

    salesData.forEach((entry) => {
      const discount =
        Number(entry.offerDeduction || 0) + Number(entry.couponDeduction || 0);
      const total = Number(entry.totalSales || 0);
      const orders = Number(entry.orderCount || 0);

      grandDiscount += discount;
      grandTotal += total;
      grandOrderCount += orders;

      worksheet.addRow({
        date: entry._id,
        totalDiscount: discount.toFixed(2),
        orderCount: orders,
        total: total.toFixed(2),
      });
    });

    worksheet.addRow({}); // empty row for spacing

    worksheet.addRow({
      date: 'TOTAL',
      totalDiscount: grandDiscount.toFixed(2),
      orderCount: grandOrderCount,
      total: grandTotal.toFixed(2),
    });

    const totalRowIndex = worksheet.lastRow.number;
    const totalRow = worksheet.getRow(totalRowIndex);
    totalRow.font = { bold: true };
    totalRow.commit();

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=SalesReport.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    next(error);
  }
};
module.exports = {
  getLogin,
  postLogin,
  getUsers,
  
  searchProducts,
  postLogout,

  getPendings,
  approveReturn,
  rejectReturn,
  getSalesReport,
  updateSaleReport,
  downloadSaleReportpdf,
  downloadSaleReportExcel,
};
