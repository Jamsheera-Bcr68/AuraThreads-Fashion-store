const User = require("../model/userModel");
const mongoose=require('mongoose')
const Address = require("../model/addressModel");
const Order = require("../model/orderModel");
const StatusCodes = require("../utils/statusCodes");
const statusMessages = require("../utils/statusMessages");
const Cart = require("../model/cartModel");


const getAccount = async (req, res) => {
  console.log("from user profile");
  const userId = req.session.user._id;
  console.log("user Id is " + userId);

  //fetch user
  try {
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });
    console.log("user is ", user);

    if (!user) {
      console.log("user not exist");
      res.redirect("/user/home");
    } else {
      const addresses = await Address.find({ userId });

      //fetching orders
      const orders = await Order.find({ userId })
        .populate("items.productId")
        .sort({ createdAt: -1 });
      if (!orders) {
        console.log("orders are not found");

        res.json({ success: false, message: "orders are not found" });
      }

      const cancelReasons = ["reason1", "reason2", "reason3"];

      //get cart count
      let cartCount = 0;
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cartCount = cart.items.length;
        console.log("cart count is ", cartCount);
      } else {
        console.log("cart not fount");
      }

      res.render("../views/user/account", {
        errorMessage: null,
        categoryId: null,
        page: "Accounts",
        priceRange: null,
        cartCount,
        user,
        addresses,
        orders,
        cancelReasons,

        sort: null,
        query: null,
      });
    }
  } catch (error) {
    console.log("error in fetching user" , error);
    res.redirect("/user/home");
  }
};

const removeProfileImage = async (req, res) => {
  console.log("from removeProfileImage");
  const userId = req.session.user._id;
  if (!userId) {
    console.log("user not logined");
    return res.json({ success: false, message: "user not logined" });
  }
  const user = await User.findOne({ _id: userId });
  if (!user) {
    console.log("user not found");
    return res.json({ success: false, message: "user not found" });
  }
  if (user.profilePicture == "") {
    console.log("No profile picture");
    return res.json({ success: false, message: "Already there is no DP" });
  }
  user.profilePicture = "";
  await user.save();
  return res.json({
    success: true,
    message: "Profile image removed successfully",
  });
};

const addProfileImage = async (req, res) => {
  console.log("from addProfileImage");
  try {
    const file = req.file;
    if (!file) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "No file uploaded" });
    }
    const imageUrl = "/uploads/" + file.filename;

    const userId = req.session.user._id;
    const user = await User.findByIdAndUpdate(userId, {
      profilePicture: imageUrl,
    });
    await user.save9;
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Profile image added succesfully",
    });
  } catch (error) {
    console.log("error is ", error);
   return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR});
  }
};

module.exports={
    getAccount,
    removeProfileImage,
    addProfileImage
}