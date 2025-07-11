// routes/admin.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuth = require("../middleweres/adminAuth");
const product = require("../model/productModel");
const category = require("../model/categoryModel");
const user = require("../model/userModel");
const multer = require("multer");
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const { route } = require("./product");
const Order = require("../model/orderModel");
const categoryController=require('../controllers/categoryController')
const userController=require('../controllers/userController')
const couponController=require('../controllers/couponController')

// Display Login Page
router.get("/login", adminController.getLogin);

// Handle Login Submission
router.post("/login", adminController.postLogin);

//get dashboard
router.get("/dashboard",adminAuth, async (req, res) => {
  const userCount = await user.countDocuments();
  const productCount = await product.countDocuments({ isDeleted: false });
  const categoryCount = await category.countDocuments({ isDeleted: false });
  const orderCount = await Order.countDocuments({});
  const orders = await Order.find({ status: "Delivered" });
  //console.log(orders);
  const totalSalesAmount = orders.reduce(
    (acc, order) => acc + order.finalAmount,
    0,
  );
  totalDiscount = orders.reduce(
    (acc, order) =>
      acc + (order.offerDiscountAmount + order.coupenDiscountAmount),
    0,
  );
  // console.log('total discount ', totalDiscount);

  let matchStage = {
    $match: { status: { $eq: "Delivered" }, createdAt: { $lte: new Date() } },
  };

  let groupStage = {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      totalSales: { $sum: "$finalAmount" },
      offerDeduction: { $sum: "$offerDiscountAmount" },
      couponDeduction: { $sum: "$coupenDiscountAmount" },
      orderCount: { $sum: 1 },
    },
  };
  let sortStage = { $sort: { _id: 1 } };

  const salesData = await Order.aggregate([matchStage, groupStage, sortStage]);

  let salesDates = salesData.map((data) => data._id);
  //console.log('salesData',salesData);
  //console.log('salesDates ',salesDates);

  const topProducts = await Order.aggregate([
    matchStage,
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
    { $limit: 5 },
  ]);
  //    console.log('topProduct ',topProducts);

  const topCategories = await Order.aggregate([
    matchStage,

    { $unwind: "$items" },

    // Step 1: Lookup product details based on items.productId
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "productDetails",
      },
    },

    { $unwind: "$productDetails" },

    // Step 2: Lookup category using productDetails.categoryId
    {
      $lookup: {
        from: "categories",
        localField: "productDetails.categoryId",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },

    { $unwind: "$categoryDetails" },

    // Step 3: Group by category
    {
      $group: {
        _id: "$productDetails.categoryId",
        totalSold: { $sum: "$items.quantity" },
        name: { $first: "$categoryDetails.categoryName" },
      },
    },

    // Step 4: Sort and limit
    { $sort: { totalSold: -1 } },
    { $limit: 5 },

    // Optional: Clean output
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        name: 1,
        totalSold: 1,
      },
    },
  ]);

  // console.log('topCategory ', topCategory);
  const topBrands = await Order.aggregate([
    matchStage, // optional date filter

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
        _id: "$productDetails.brand", // group by brand name
        totalSold: { $sum: "$items.quantity" },
      },
    },

    { $sort: { totalSold: -1 } },
    { $limit: 5 },

    {
      $project: {
        _id: 0,
        name: "$_id",
        totalSold: 1,
      },
    },
  ]);

  //console.log('topBrands ',topBrands);

  //recent orders
  const recentOrders = await Order.find({
    status: { $nin: ["cancelled", "returned"] },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  res.render("../views/admin/dashboard", {
    title: "Dashboard",
    userCount,
    productCount,
    totalDiscount,
    totalSalesAmount,
    orderCount,
    topProducts,
    topCategories,
    topBrands,
    salesData,
    salesDates,
    recentOrders,
    thisPage:'dashboard'
  });
});
// Multer storage setup (for storing images in "uploads" folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save in "uploads" directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage: storage });
//get categoryManagement

router.get("/category",adminAuth,categoryController.getCategory)
router.post('/category/add',upload.none(),categoryController.addCategory)
router.post('/upload',upload.single('image'),categoryController.uploadImage)
router.put('/category/edit/:id',adminAuth,categoryController.editCategory)
router.delete('/category/delete/:id',adminAuth,categoryController.deleteCategory)


//get usermangement
router.get("/users",adminAuth,userController.getUsers)

//block user
router.patch("/block-user/:userId",adminAuth,userController.blockUser)

router.get("/orders",adminAuth, adminController.getOrder);
router.get("/orderDetails/:orderId",adminAuth, adminController.getOrderDetails);
router.get("/updateOrder/:orderId",adminAuth, adminController.getUpdateOrder);
router.post("/updateOrder", adminController.postUpdateOrder);
router.delete("/cancelOrder/:orderId",adminAuth, adminController.cancelOrder);
router.post("/logout",adminAuth, adminController.postLogout);

//admin couponMangement
router.get("/coupens",adminAuth, couponController.getCouponPage);

//admin add coupon
router.post("/addCoupon",adminAuth, couponController.addCoupon);

//admin edit coupon
router.put("/editCoupon/:couponId",adminAuth, couponController.editCoupon);

//get coupon data
router.get("/getCouponData/:coupenId",adminAuth, couponController.getCouponData);

//remove coupon
router.delete("/removeCoupon/:couponId",adminAuth, couponController.removeCoupon);

//applyCoupon
router.put("/applyCoupon/:couponId",adminAuth, couponController.applyCoupon);

//get offer mangement
router.get("/offers",adminAuth, adminController.getOffers);

//add offer
router.post("/addOffer",adminAuth, adminController.addOffer);

//delte Offer
router.delete("/offer/delete/:offerId",adminAuth, adminController.deleteOffer);

//edit offer
router.get("/getSingleOffer/:offerId",adminAuth, adminController.getSingleOffer);

//edit offer
router.put("/editOffer/:offerId",adminAuth, adminController.editOffer);

//add refferal offer
router.post("/addrefferalOffer",adminAuth, adminController.addrefferalOffer);


// get approval page
router.get("/pendings", adminAuth, adminController.getPendings);

//admin return approval
router.post("/returns/approve",adminAuth, adminController.approveReturn);

//admin reject return
router.post("/returns/reject",adminAuth, adminController.rejectReturn);

//admin report get
router.get("/reports", adminController.getSalesReport);

router.get("/updateReport",adminAuth, adminController.updateSaleReport);

// get salesreport pdf
router.post("/downloadSaleReportpdf",adminAuth, adminController.downloadSaleReportpdf);

//downloadSaleReportExcel
router.get("/downloadSaleReportExcel",adminAuth, adminController.downloadSaleReportExcel);
module.exports = router;
