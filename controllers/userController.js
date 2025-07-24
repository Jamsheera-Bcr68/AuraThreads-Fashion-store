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


//get Register
const getRegister = async (req, res) => {
  console.log("from user registeration");

  res.render("user/register", { errorMessage: null });
};
//Generate OTp 
const generateOTP = () =>Math.floor(100000 + Math.random() * 900000).toString();
//Handle post Register
const postRegister = async (req, res) => {
  console.log("from post register");
  console.log("this ia google regiser");

  try {
    let { email, password, phone, referredBy } = req.body;

    console.log(
      `emil is${email} password is ${password} and phone is ${phone} userReferalCode ${referredBy}`,
    );
    if (referredBy) {
      const referalExist = await User.findOne({ refferalCode: referredBy });
      console.log("referalExist", referalExist);

      if (!referalExist) {
        return res.json({ success: false, message: "Refferal code not exist" });
      }
    }

    let hashedPassword = await bcrypt.hash(password, 10);
    console.log("hashed pwd" + hashedPassword);

    const userExist = await User.findOne({ email });

    if (userExist) {
      console.log("User already exists");
      return res.json({ success: false, message: "User alredy exist" });
    } else {
      // Generate OTP
      console.log("User not existing");

      const otp = generateOTP();
      req.session.otp = otp;
      req.session.userData = { email, password, phone, referredBy }; 

      //send otp through email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Account Verification",
        text: `Your OTP is: ${otp}. It is valid for 1 minutes.`,
      };

      await transporter.sendMail(mailOptions);
      console.log("otp send to email");
      return res.json({ success: true, message: "check your mail for OTP" });
    }
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(statusMessages.SERVER_ERROR);
  }
};

//google signup user set password
const getSetPassword = async (req, res) => {
  console.log("this is from google user signup set password");
  console.log("req.session.passport.user is ", req.session.passport.user);
  const userId = req.session.passport.user;
  const user = await User.findOne({ _id: userId });
  console.log("user found ", user);
  const email = user.email;

  console.log("email is ", email, 'show alert is true');

  res.render("user/setPassword", { showAlert: true, email });
};

//post set password
const postSetPassword = async (req, res) => {
  console.log("from post set password");
  try {
    const { password, confirmPassword, email } = req.body;
    console.log("pwd,confirm pwd", password, confirmPassword);

    if (password == "" || confirmPassword == "") {
      return res.json({ success: false, message: "Both field are required" });
    }
    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Paswords are not matching" });
    }
    const user = await User.findOne({ email });
    console.log("google user is ", user);

    if (!user) {
      console.log("user not found");

      return res.json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.hashedPassword = hashedPassword;
    await user.save();
    return res.json({ success: true, message: "Passwrd set successfully" });
  } catch (error) {
    console.log("error is", error);
    return res.json({ success: false, message: "error in fetching email" });
  }
};

const getLogin = async (req, res) => {
  res.render("user/userLogin", { errorMessage: null });
};
const postLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  try {

    //finding the url to redirect
    const redirectTo = req.session.redirectTo || "/user/home";
    console.log("redirectTo", redirectTo);
    delete req.session.redirectTo;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("user/userLogin", {
        errorMessage: "You are not registered",
      });
    } else {
      const isMatch = await bcrypt.compare(password, user.hashedPassword);
      console.log(isMatch);

      if (isMatch) {
        req.session.user = user;
        req.session.save((err) => {
          if (err) {
            console.log("errror in saving user" + err);
          }
        });

        //checking waleet exist or not if no creating one
        const wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
          await Wallet.create({
            userId: user._id,
            balance: 0,
            transactions: [],
          });
          console.log("Auto-created wallet for returning user", user.email);
        }
       
        
        return res.redirect(redirectTo);
      } else {
        res.render("user/userLogin", {
          errorMessage: "Password is not Matching",
        });
      }
    }
  } catch (error) {
    console.log("error in finding user");
    console.log(error);
  }
};

// reset forgot password
const getResetPassword = async (req, res) => {
  console.log("resetPassword-forgot password after tocken from mail");
  try {
    let token = req.params.token;
    console.log("token params", token);

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }, // not expired
    });

    if (!user) {
      return res.render("user/reset-expired", {
        message: "Token expired or invalid.",
      });
    }
    res.render("user/resetPasswordForm", { token }); // pass token to form
  } catch (error) {
    console.log(error);
    res.render("user/login", { errorMessage: "error resetting password" });
  }
};

const postResetPassword = async (req, res) => {
  try {
    console.log("from postResetPassword form after entering new password");
    const { password, confirmPassword, token } = req.body;
    console.log("password,confirmPassword", password, confirmPassword);
    if (password === "" || confirmPassword === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Both fields are required" });
    } else if (password !== confirmPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Password not matching" });
    }
    if (password.length < 4) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password should be at least 4 charectors",
      });
    } else if (password.length > 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password should not exeed 8 charectors",
      });
    }
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res.render("reset-expired", {
        message: "Token expired or invalid.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('hashed password',hashedPassword);
    
    user.hashedPassword = hashedPassword
      user.resetToken = undefined
      user.resetTokenExpiry = undefined
      await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log("postResetPassword ",error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

const getHome = async (req, res) => {
  console.log('req.session.user',req.session.user);
  
  const categories = await category
    .find({
      isDeleted: false
    })


  categories.forEach((item) =>
    item.images.forEach((image) => image.replace(/\\/g, "/")),
  );


  const womenCategory = await category.findOne(
    { isDeleted: false, categoryName: "Womens" },
    { _id: 1 },
  );
  
  let womenProducts = [];
  if (womenCategory) {

    womenProducts = await Product.aggregate([
  {
    $match: { categoryId: womenCategory._id, isDeleted: false }
  },
  {
    $lookup: {
      from: 'variants',
      let: { productId: '$_id' }, // pass the local _id as productId
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$productId', '$$productId'] }, // match productId
                { $eq: ['$isDeleted', false] }          // AND variant is not deleted
              ]
            }
          }
        },
         { $limit: 1 }
      ],
      as: 'mainVariant'
    }
  },
  {
    $unwind: {
      path: '$mainVariant',
      preserveNullAndEmptyArrays: true
    }
  }
])

  }

 

  const mensCategory = await category.findOne(
    { isDeleted: false, categoryName: "Mens" },
    { _id: 1 },
  );

  let menProducts = [];
  if (mensCategory) {
    console.log('mensCategory._id', mensCategory._id, typeof mensCategory._id);
menProducts = await Product.aggregate([
  {
    $match: { categoryId: mensCategory._id, isDeleted: false }
  },
  {
    $lookup: {
      from: 'variants',
      let: { productId: '$_id' }, // pass the local _id as productId
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$productId', '$$productId'] }, // match productId
                { $eq: ['$isDeleted', false] }          // AND variant is not deleted
              ]
            }
          }
        },{ $limit: 1 }
      ],
      as: 'mainVariant'
    }
  },
  {
    $unwind: {
      path: '$mainVariant',
      preserveNullAndEmptyArrays: true
    }
  }
])

  }

 


  const kidsCategory = await category.findOne(
    { isDeleted: false, categoryName: "Kids" },
    { _id: 1 },
  );
  let kidsProducts = [];
 
  if (kidsCategory) {

  kidsProducts = await Product.aggregate([
  {
    $match: { categoryId: kidsCategory._id, isDeleted: false }
  },
  {
    $lookup: {
      from: 'variants',
      let: { productId: '$_id' }, // pass the local _id as productId
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$productId', '$$productId'] }, // match productId
                { $eq: ['$isDeleted', false] }          // AND variant is not deleted
              ]
            }
          }
        },{ $limit: 1 }
      ],
      as: 'mainVariant'
    }
  },
  {
    $unwind: {
      path: '$mainVariant',
      preserveNullAndEmptyArrays: true
    }
  }
])


  }

  
  
  let cartCount = 0;
  if (req.session.user) {
    const user = req.session.user;
    const userId = user._id;
    const cart = await Cart.findOne({ userId });
    if (cart) {
      cartCount = cart.items.length;
      console.log("cart count is ", cartCount);
    }
  }
  //const products=await Product.find({isDeleted:false})
  //fetching for orders
  let offers = [];
  offers = await Offer.find({ status: "active" });
  kidsProducts.forEach((product) => {
    const productOffer = offers.find(
      (offer) =>
        offer.applicableTo === "product" &&
        offer.productId?.toString() === product._id.toString(),
    );
    const categoryOffer = offers.find(
      (offer) =>
        offer.applicableTo === "category" &&
        offer.categoryId?.toString() === product.categoryId?.toString(),
    );

    let finalOffer = null;
    let discountAmount = 0;

    if (productOffer && categoryOffer) {
      const productDiscountAmount =
        productOffer.discountType === "amount"
          ? productOffer.discountValue
          : (product.price * productOffer.discountValue) / 100;

      const categoryDiscountAmount =
        categoryOffer.discountType === "amount"
          ? categoryOffer.discountValue
          : (product.price * categoryOffer.discountValue) / 100;

      finalOffer =
        productDiscountAmount > categoryDiscountAmount
          ? productOffer
          : categoryOffer;
      discountAmount = Math.max(productDiscountAmount, categoryDiscountAmount);
    } else if (productOffer || categoryOffer) {
      finalOffer = productOffer || categoryOffer;

      // Checking finalOffer before using its properties
      if (finalOffer) {
        discountAmount =
          finalOffer.discountType === "amount"
            ? finalOffer.discountValue
            : (product.price * finalOffer.discountValue) / 100;
      }
    }

    if (finalOffer) {
      product.discountPrice = Math.round(product.price - discountAmount);
      product.discountAmount = discountAmount;
      product.finalDiscount = finalOffer.discountValue;
      product.discountType = finalOffer.discountType;
    } else {
      product.discountPrice = product.price;
    }
  });

  menProducts.forEach((product) => {
    const productOffer = offers.find(
      (offer) =>
        offer.applicableTo === "product" &&
        offer.productId?.toString() === product._id.toString(),
    );
    const categoryOffer = offers.find(
      (offer) =>
        offer.applicableTo === "category" &&
        offer.categoryId?.toString() === product.categoryId?.toString(),
    );

    let finalOffer = null;
    let discountAmount = 0;

    if (productOffer && categoryOffer) {
      const productDiscountAmount =
        productOffer.discountType === "amount"
          ? productOffer.discountValue
          : (product.price * productOffer.discountValue) / 100;

      const categoryDiscountAmount =
        categoryOffer.discountType === "amount"
          ? categoryOffer.discountValue
          : (product.price * categoryOffer.discountValue) / 100;

      finalOffer =
        productDiscountAmount > categoryDiscountAmount
          ? productOffer
          : categoryOffer;
      discountAmount = Math.max(productDiscountAmount, categoryDiscountAmount);
    } else if (productOffer || categoryOffer) {
      finalOffer = productOffer || categoryOffer;

      // Checking finalOffer before using its properties
      if (finalOffer) {
        discountAmount =
          finalOffer.discountType === "amount"
            ? finalOffer.discountValue
            : (product.price * finalOffer.discountValue) / 100;
      }
    }

    if (finalOffer) {
      product.discountPrice = Math.round(product.price - discountAmount);
      product.discountAmount = discountAmount;
      product.finalDiscount = finalOffer.discountValue;
      product.discountType = finalOffer.discountType;
    } else {
      product.discountPrice = product.price;
    }
  });

  womenProducts.forEach((product) => {
    const productOffer = offers.find(
      (offer) =>
        offer.applicableTo === "product" &&
        offer.productId?.toString() === product._id.toString(),
    );
    const categoryOffer = offers.find(
      (offer) =>
        offer.applicableTo === "category" &&
        offer.categoryId?.toString() === product.categoryId?.toString(),
    );

    let finalOffer = null;
    let discountAmount = 0;

    if (productOffer && categoryOffer) {
      const productDiscountAmount =
        productOffer.discountType === "amount"
          ? productOffer.discountValue
          : (product.price * productOffer.discountValue) / 100;

      const categoryDiscountAmount =
        categoryOffer.discountType === "amount"
          ? categoryOffer.discountValue
          : (product.price * categoryOffer.discountValue) / 100;

      finalOffer =
        productDiscountAmount > categoryDiscountAmount
          ? productOffer
          : categoryOffer;
      discountAmount = Math.max(productDiscountAmount, categoryDiscountAmount);
    } else if (productOffer || categoryOffer) {
      finalOffer = productOffer || categoryOffer;

      // Checking finalOffer before using its properties
      if (finalOffer) {
        discountAmount =
          finalOffer.discountType === "amount"
            ? finalOffer.discountValue
            : (product.price * finalOffer.discountValue) / 100;
      }
    }

    if (finalOffer) {
      product.discountPrice = Math.round(product.price - discountAmount);
      product.discountAmount = discountAmount;
      product.finalDiscount = finalOffer.discountValue;
      product.discountType = finalOffer.discountType;
    } else {
      product.discountPrice = product.price;
    }
  });

  res.render("user/home", {
    errorMessage: null,
    cartCount: 2,
    page: "home",

    cartCount: cartCount || "",
    categoryId: null,
    priceRange: null,
    sort: null,
    query: null,
    user: req.session.user || "",
    categories,
    womenProducts,
    menProducts,
    kidsProducts,
  });
};

const updateUser = async (req, res) => {
  console.log("from user update");

  const { fullName, email, phone, dob } = req.body;
  const userId = req.session.user._id;
  console.log(
    `fulname is ${fullName} .email is ${email} ,phone is ${phone} ,dob is ${dob} userid is ${userId}`,
  );

  try {
    const user = await User.findOne({ _id: userId });
    console.log(`user found`);

    if (!user) {
      console.log("user not found");
      return res.json({ success: false, message: "user not found" });
    } else {
      if (email == user.email) {
      } else {
        console.log("user want to update email");
        const userExist = await User.findOne({ email: email });
        if (userExist) {
          return res.json({
            success: false,
            message: "This email is already existing",
          });
        }
      }
      user.fullName = fullName;

      user.phone = phone;
      user.dob = dob;
      user.save();
      if (email == user.email) {
        console.log("user saved succes fully");
        return res.json({ success: true, message: "user profile updated", fullName });
      } else {
        const otp = generateOTP();
        otpStore[email] = { otp, expiresAt: Date.now() + 1 * 60 * 1000 }; // 1-minute expiry
        req.session.user.newEmail = email;
        req.session.user.otp = otp;

        // Send email with OTP
        await transporter.sendMail({
          to: email,
          subject: "Your OTP Code",
          text: `Your OTP is ${otp}. It expires in 1 minutes.`,
        });
        return res.json({
          success: true,
          message: "A OTP send your new email ",
          newEmail: email,
        });
      }
    }
  } catch (error) {
    console.log("error in fetching user");
    return res.json({ success: false, message: "error in fetching user" });
  }
};

const getEmailChangeOtp = async (req, res, next) => {
  try {
    const redirectTo = req.query.redirectTo || '/user/account'
    console.log('redirectTo', redirectTo);

    res.render("user/emailChangeOtp", { redirectTo });
  } catch (error) {
    console.log(error);
    throw Error({ status: 500, message: "server error" });
  }
};

const emailChangeResendOtp = async (req, res) => {
  console.log("from resent otp page");
  console.log(req.session.userData);

  try {
    const email = req.session.user?.newEmail;
    console.log("newEmail is ", email);

    if (!email)
      return res.status(400).json({ message: "new Email is required" });
    req.session.user.otp = null;
    const newOtp = generateOTP();
    req.session.user.otp = newOtp;
    otpStore[email] = { otp: newOtp, expiresAt: Date.now() + 60 * 1000 }; // 1 minute validity

    await transporter.sendMail({
      to: email,
      subject: "Your New OTP Code",
      text: `Your new OTP is ${newOtp}. It expires in 1 minute.`,
    });
    console.log("new otp send succesfully");

    res.json({
      message: "New OTP sent successfully",
      expiresAt: otpStore[email].expiresAt,
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

const emailChangeOtpVerifyOtp = async (req, res) => {
  console.log("from email changevarify otp");

  let { otp } = req.body;
  console.log("req.body otp is ", otp);

  console.log("session otp is ", req.session.user.otp);

  try {
    if (!req.session.user.otp || !req.session.user) {
      return res.json({
        success: false,
        message: "OTP expired. Please register again.",
      });
    }

    console.log("type of session otp is ", typeof req.session.user.otp);

    console.log("otp is ", otp);
    if (otp !== req.session.user.otp) {
      console.log("Invalid otp");

      return res.json({ success: false, message: "Invalid OTP" });
    }
    console.log("otp validated succesfully");

    const userId = req.session.user._id;
    const user = await User.findOne({ _id: userId });
    if (!user) {
      console.log("user not registered");

      throw new Error("user not registered");
    }

    user.email = req.session.user.newEmail;
    await user.save();

    // Clear session
    req.session.user.otp = null;
    req.session.user.email = req.session.user.newEmail;
    req.session.user.newEmail = null;

    console.log("email updation succesfull");
    return res.json({ success: true, message: "Email updated successfully" });
  } catch (error) {
    console.log("error happened", error);
    return res.json({ success: false, message: "some thing went wrong" });
  }
};


const changePassword = async (req, res) => {
  console.log("from user forgot password");

  const { currentPassword, newPassword, confirmPassword } = req.body;
  console.log(
    "currentPassword,newPassword,confirmPassword",
    currentPassword,
    newPassword,
    confirmPassword,
  );

  try {
    const userId = req.session.user._id;
    console.log("User id is ", userId);
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.json({ success: false, message: "user not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
    console.log("Is match ", isMatch);

    if (!isMatch) {
      return res.json({ success: false, message: "Wrong Password" });
    }
    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: "Password is not matching" });
    }
    console.log("user found", user);

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = newHashedPassword;
    await user.save();
    console.log("new Uswr is ", user);

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log(error, "This is the error");
    return res.json({ success: false, message: "Error in fetching user" });
  }
};


const logout = async (req, res) => {
  console.log("from user logout");
  try {
    req.session.user = null;
    return res.json({ success: true, message: "User Logout Successfull" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error in user logout" });
  }
};


const getAllCoupons = async (req, res, next) => {
  console.log("from getAllCoupons");
  try {
    const currentDate = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: currentDate },
    });
    res.json({ success: true, coupons });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const usertest = (req, res, next) => {
  try {
    console.log("user login route");

    const user = null;
    if (!user) {
      throw new Error("User not found");
    }
    return res.json({ success: true, message: "Use Logined " });
  } catch (err) {
    next(err);
  }
};


const getContact = (req, res) => {
  res.render("user/about", {
    categoryId: null,
    priceRange: null,
    cartCount: 0,
    sort: "",
    query: "",
    user: req.session.user || "",
    title: "About Us",
  });
};


const getUserdata=async(req,res)=>{
  try{
    console.log('from user ata fetch');
    
    if(req.session.user){
     let userId=req.session.user._id
     const user=await User.findOne({_id:userId})
     console.log('user found',user);
     
      return res.status(StatusCodes.OK).json({success:true,message:'User found',user})
    }else{
      return res.status(StatusCodes.UNAUTHORIZED).json({success:false,message:'You are not registered'})
    }
  }catch(error){
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:statusMessages.SERVER_ERROR})
  }
}
module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  getHome,
  
  getResetPassword,
  postResetPassword,
 
  updateUser,
 changePassword,
 
  getSetPassword,
  postSetPassword,
  logout,
 getUserdata,

 
  usertest,
 
 // getAllCoupons,
  getContact,
  emailChangeOtpVerifyOtp,
  getEmailChangeOtp,
  emailChangeResendOtp,
};
