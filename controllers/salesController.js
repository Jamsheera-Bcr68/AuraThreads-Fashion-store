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
module.exports={
    getSalesReport,
    updateSaleReport,
    downloadSaleReportpdf,
    downloadSaleReportExcel
}