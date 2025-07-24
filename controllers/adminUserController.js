const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const Product = require("../model/productModel");
const transporter = require("../config/nodeMailer");
//const otpGenerator = require("otp-generator");
const category = require("../model/categoryModel");
const userAuth = require("../middleweres/userAuth");
const { default: mongoose } = require("mongoose");
const Cart = require("../model/cartModel");
const Address = require("../model/addressModel");
const { use } = require("passport");
const Order = require("../model/orderModel");
const Coupon = require("../model/coupenModel");
const WishList = require("../model/wishListModel");
const Wallet = require("../model/walletModel");
const errorHandler = require("../middleweres/errorHandler");
const Offer = require("../model/offerModel");
const razorpay = require("../config/razorPay");
const crypto = require("crypto");
const { title } = require("process");
const StatusCodes = require("../utils/statusCodes");
const statusMessages = require("../utils/statusMessages");
const Variant =require('../model/variantModel');
const messages = require("dote/src/messages");

const getUsers = async (req, res) => {
  console.log('getUsers');
  try {
    const query = req.query.query || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    console.log("query", query);

    let searchQuery = {};
    if (query.trim()) {
      searchQuery = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      };
    }
    const users = await User
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    console.log(`from userpage.page is ${page} and limit is ${limit}`);

    res.render("../views/admin/userManagement", {
      users,
      currentPage: page,
      totalPages,
      thisPage: 'users',
      title: "User Management",
      successMessage: res.locals.successMessage || "",
      errorMessage: res.locals.errorMessage || "",
    });
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}

const blockUser = async (req, res) => {
  console.log('blockUser');
  const { userId } = req.params;
  const { isActive } = req.body;

  try {
    const blockUser = await User.findOneAndUpdate(
      { _id: userId },
      { isActive },
      { new: true },
    );

    if (!blockUser) {
      console.log('User not found');
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("User ") })
    }
    console.log('Status updated');
    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.UPDATED("User") })
  } catch (error) {

    console.log('Server Error');
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}
module.exports={
    getUsers,
    blockUser
}