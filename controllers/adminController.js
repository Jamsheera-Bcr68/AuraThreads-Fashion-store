
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


//admin logout
const postLogout = async (req, res) => {
  console.log("from admin logout route");
  req.session.admin = null;
  console.log("admin in session is ", req.session.admin);
  return res.json({ success: true, message: "Admin logouted successfully" });
};


module.exports = {
  getLogin,
  postLogin,
  getUsers,
  
  searchProducts,
  postLogout,

};
