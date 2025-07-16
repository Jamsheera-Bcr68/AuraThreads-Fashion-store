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
const Variant =require('../model/variantModel')


//get Register
const getRegister = async (req, res) => {
  console.log("from user registeration");

  res.render("user/register", { errorMessage: null });
};

//  Generate OTp const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

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
      req.session.otp = otp; //store otp in session
      req.session.userData = { email, password, phone, referredBy }; // Store user data temporarily

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
    return res.status(500).send("Server error");
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

//getOtp page
const getOtp = async (req, res) => {
  try {
    console.log("from get otp");
    return res.render("user/otp");
  } catch (error) {
    console.log("Error rendering OTP page:", error);
    res.status(500).send("Internal Server Error");
  }
};

//  Send OTP
const sendOTP = async (req, res) => {
  console.log("from send otp");

  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 1 * 60 * 1000 }; // 1-minute expiry

    // Send email with OTP
    await transporter.sendMail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 1 minutes.`,
    });

    console.log("OTP sent successfully");

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g., "FJ9K2A"
};

//otp verification
const varifyOtp = async (req, res) => {
  console.log("from varify otp");

  let { otp } = req.body;
  console.log("req.body otp is ", otp);

  console.log("session otp is ", req.session.otp);

  try {
    if (!req.session.otp || !req.session.userData) {
      return res.json({
        success: false,
        message: "OTP expired. Please register again.",
      });
    }

    console.log("type of session otp is ", typeof req.session.otp);

    console.log("otp is ", otp);
    if (otp !== req.session.otp) {
      console.log("Invalid otp");

      return res.json({ success: false, message: "Invalid OTP" });
    }
    console.log("otp validated succesfully");
    //generate refferalCode

    // OTP is correct → Hash password & save user
    const isVerified = true;
    console.log("isVerified = true");

    const { name, email, password, phone } = req.session.userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const { referredBy } = req.session.userData || "";
    console.log("reffered by ", referredBy);

    let code;
    do {
      code = generateReferralCode();
    } while (await User.findOne({ refferalCode: code }));

    const newUser = new User({
      phone,
      name,
      email,
      hashedPassword,
      isVerified,
      refferalCode: code,
      referredBy,
    });
    await newUser.save();
    console.log("new user saved successfuly");

    // creating wallt
    const wallet = new Wallet({ userId: newUser._id });
    if (referredBy) {
      console.log("This is  a referred user");

      wallet.balance = 50;
      wallet.transactions.push({
        amount: 50,
        type: "credit",
        date: new Date(),
        description: "Refferal code benefit",
      });
      await wallet.save();
      console.log("user got referalcode benefit");

      let referrer = await User.findOne({ refferalCode: referredBy });
      console.log("referrer ", referrer);

      if (!referrer) {
        console.log("refferedUser not found");
        return res.json({ success: false, message: "referredUser not found" });
      }
      let referrerId = referrer._id;
      const referrerWallet = await Wallet.findOne({ userId: referrerId });
      if (!referrerWallet) {
        console.log("refferedUser wallet not found");
        return res.json({ success: false, message: "refferedUser not found" });
      }
      console.log(referrerWallet.balance, "before");

      referrerWallet.balance = referrerWallet.balance + 100;

      referrerWallet.transactions.push({
        amount: 100,
        type: "credit",
        date: new Date(),
        description: "Refferal offer Credit",
      });

      await referrerWallet.save();
      console.log(referrerWallet.balance, "after");
      console.log("refered user go referalcode benefit");
    } else {
      console.log("this is a nonreferreduser");
    }

    // Clear session
    req.session.otp = null;
    req.session.userData = null;

    // referal discount for both
    console.log("registration succesfull");

    return res.json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.log("error happened", error);
    return res.json({ success: false, message: "some thing went wrong" });
  }
};

//resend OTP
const resendOtp = async (req, res) => {
  console.log("from resent otp page");
  console.log(req.session.userData);

  try {
    const email = req.session.userData?.email;
    if (!email) return res.status(400).json({ message: "Email is required" });
    req.session.userData.otp = null;
    const newOtp = generateOTP();
    req.session.otp = newOtp;
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

// get login
const getLogin = async (req, res) => {
  res.render("user/userLogin", { errorMessage: null });
};

//Handle post login

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
  console.log("resetPassword-forgot password");
  try {
    let token = req.params.token;
    console.log("token params", token);

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }, // not expired
    });

    if (!user) {
      return res.render("reset-expired", {
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
    console.log("from postResetPassword form");
    const { password, confirmPassword, token } = req.body;
    console.log("password,confirmPassword", password, confirmPassword);
    if (password === "" || confirmPassword === "") {
      return res.json({ success: false, message: "Both fields are required" });
    } else if (password !== confirmPassword) {
      return res.json({ success: false, message: "Password not matching" });
    }
    if (password.length < 4) {
      return res.json({
        success: false,
        message: "Password should be at least 4 charectors",
      });
    } else if (password.length > 8) {
      return res.json({
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
    (user.password = hashedPassword),
      (user.resetToken = undefined),
      (user.resetTokenExpiry = undefined),
      await user.save();

    return res.json({
      success: false,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log("postResetPassword ");
    return res.json({ success: false, message: "Error in setting password" });
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



const otpStore = {}; //  OTP store temporarly

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
    console.log("error in fetching user" + error);
    res.redirect("/user/home");
  }
};

// //add address
// const addAddress = async (req, res) => {
//   console.log("from add adress");
//   const { label, line1, line2, city, state, zip, country, phone } = req.body;
//   console.log(
//     ` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`,
//   );
//   const isDefault = req.body.isDefault || false;
//   console.log(`is defsult is ${isDefault}`);

//   try {
//     const userId = req.session.user._id;
//     console.log("user is ", userId);
//     const address = await Address.find({ userId })

//     if (address.length == 4) {
//       return res.json({ success: false, message: "You can only add 4 addresses" })
//     }
//     // If isDefault is true, update all other addresses to false for the same user
//     if (isDefault) {
//       await Address.updateMany({ userId }, { isDefault: false });
//       const newAddress = new Address({
//         userId,
//         label,
//         line1,
//         line2,
//         phone,
//         city,
//         state,
//         zip,
//         country,
//         isDefault,
//       });
//       await newAddress.save();
//       console.log("adress saved as default");

//       return res.json({ success: true, message: "New Address added successfully", address: newAddress });
//     } else {
//       const newAddress = new Address({
//         userId,
//         line1,
//         line2,
//         phone,
//         city,
//         state,
//         zip,
//         country,
//         isDefault,
//       });
//       await newAddress.save();
//       console.log("adress is saves as not default");
//       return res.status(201).json({ success: true, message: "Address added successfully" });
//     }
//   } catch (error) {
//     console.log("error in fetching adress", error);
//     return res.json({ success: false, message: "error in fetching adress" });
//   }
// };

//edit adress
// const editAddress = async (req, res) => {
//   const addressId = req.params.editAddressId;
//   console.log("address id is ", addressId);

//   const { label, line1, line2, city, state, zip, country, phone } = req.body;
//   console.log(`Address id is ${addressId} ant type is ${typeof addressId}`);
//   console.log(
//     ` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`,
//   );
//   const isDefault = req.body.isDefault || false;
//   console.log(`is defsult is ${isDefault}`);
//   const userId = req.session.user._id;
//   try {
//     console.log("user id is ", userId);

//     const address = await Address.findOne({
//       _id: new mongoose.Types.ObjectId(addressId),
//     });

//     if (!address) {
//       console.log("address not found");

//       return res.json({ success: false, message: "address not found" });
//     } else {
//       console.log("address fount");
//       if (isDefault) {
//         await Address.updateMany({ userId }, { isDefault: false });
//       }
//       (address.label = label), (address.line1 = line1);
//       address.line2 = line2;
//       address.city = city;
//       address.state = state;
//       address.zip = zip;
//       address.country = country;
//       address.phone = phone;

//       await address.save();
//       console.log("adress saved successfully");
//       return res.json({ success: true, message: "Addres edited successfully" });
//     }
//   } catch (error) {
//     return res.json({ success: false, message: "error in fetching address" });
//   }
// };

// //delete address
// const deleteAddress = async (req, res) => {
//   console.log("from user delete adress");
//   const addressId = req.params.addressId;
//   console.log("addressid is"), addressId;

//   try {
//     const address = await Address.findOneAndDelete({ _id: addressId });
//     if (!address) {
//       console.log("address not fount");
//       return res.json({ success: false, message: "Address not Found" });
//     } else {
//       console.log("account deleted success fully");
//       return res.json({
//         success: true,
//         message: "Address Deleted Successfully",
//       });
//     }
//   } catch (error) {
//     console.log("error in fetching address", error);

//     res.json({ success: false, message: "error in fetching address" });
//   }
// };
//edit profile'

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
//addProfileImage
const addProfileImage = async (req, res) => {
  console.log("from addProfileImage");
  try {
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    const imageUrl = "/uploads/" + file.filename;

    const userId = req.session.user._id;
    const user = await User.findByIdAndUpdate(userId, {
      profilePicture: imageUrl,
    });
    await user.save9;
    return res.json({
      success: true,
      message: "Profile image added succesfully",
    });
  } catch (error) {
    console.log("error is ", error);
    res.json({ success: false, message: "Error in adding profile picture" });
  }
};

// const addAddresses = async (req, res) => {
//   const { label, line1, line2, city, state, zip, country, phone } = req.body;
//   console.log(
//     ` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`,
//   );
//   const isDefault = req.body.isDefault || false;
//   console.log(`is defsult is ${isDefault}`);

//   try {
//     const userId = req.session.user._id;
//     console.log("user is ", userId);

//     // If isDefault is true, update all other addresses to false for the same user
//     if (isDefault) {
//       await Address.updateMany({ userId }, { isDefault: false });
//       const newAddress = new Address({
//         userId,
//         line1,
//         line2,
//         phone,
//         city,
//         state,
//         zip,
//         country,
//         isDefault,
//       });
//       await newAddress.save();
//       console.log("adress saved as default");
//       res.redirect("/user/checkout");
//     } else {
//       const newAddress = new Address({
//         userId,
//         line1,
//         line2,
//         phone,
//         city,
//         state,
//         zip,
//         country,
//         isDefault,
//       });
//       await newAddress.save();
//       console.log("adress is saves as not default");
//       res.redirect("/user/checkout");
//     }
//   } catch (error) {
//     console.log("error in fetching adress", error);
//     res.redirect("/user/checkout");
//   }
// };
//removeProfileImage
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




const getOrders = async (req, res) => {
  console.log("from user all orders page");
  try {
    const userId = req.session.user._id;
    if (!userId) {
      console.log("user not found");

      res.json({ success: false, message: "User not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
      .populate("items.productId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (!orders) {
      console.log("orders are not found");

      res.json({ success: false, message: "orders are not found" });
    }
    // console.log('your orders are ', orders);

    const totalOrders = orders.length;
    // console.log('total orders', totalOrders);

    const totalPages = Math.ceil(totalOrders / limit);
    //console.log('totalPages ', totalPages);

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
      "items.productId",
    );
    if (!order) {
      res.json({ success: false, message: "Order not found" });
    }
    res.render("user/orderDetails", { title: "order details page", order });
  } catch (error) {
    console.log("error:", error);
    res.json({ success: false, message: "Error in fetching order detais" });
  }
};

//delete order
const deleteOrder = async (req, res) => {
  console.log("form order delete route");
  try {
    let orderId = req.params.orderId;
    console.log("order id ", orderId);
    if (!orderId) {
      console.log("order id is not fount");
      return res.json({ success: false, message: "order id is not getting" });
    }

    orderId = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({ _id: orderId });
    order.status = "cancelled";
    order.items.forEach((item) => (item.status = "cancelled"));
    order.save();
    const finalAmount = order.finalAmount;

    // restoring wallet
    if (order.useWallet == true) {
      const wallet = await Wallet.findOne({ userId: req.session.user._id });
      wallet.balance = wallet.balance + finalAmount;
      wallet.transactions.push({
        type: "credit",
        amount: finalAmount,
        date: new Date(),
        description: "Order Cancelled,Amount refunded",
      });
      await wallet.save();
    }

    // restoring stock

    for (item of order.items) {
      const product = await Product.findById(item.productId);
      console.log(
        `user cancelling before restoring ${product.productName} is ${product.stock}`,
      );
      product.stock = product.stock + item.quantity;
      await product.save();
      console.log(`after restoring ${product.productName} is ${product.stock}`);
    }

    console.log("order cancelled succeccfully");
    return res.json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.log("error is ", error);
    return res.json({ success: false, message: "error in deleteing cart" });
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

//apply coupen
const applyCoupon = async (req, res) => {
  console.log("from user apply coupon route");
  try {
    const userId = req.session.user._id;
    const code = req.body.code;

    let discountAmount = 0;
    console.log("code is ", code);

    const coupon = await Coupon.findOne({ coupenCode: code });
    console.log("coupon is ", coupon);

    if (!coupon) {
      console.log("Coupon not found");
      return res.json({ success: false, message: "Coupon not found" });
    }
    if (coupon.isActive == false) {
      console.log("Coupon not active");
      return res.json({ success: false, message: "Coupon not Active now" });
    }
    if (new Date() > coupon.expiryDate) {
      console.log("Coupon Expired");
      return res.json({ success: false, message: "Coupon Expired" });
    }
    if (req.session.netAmount < coupon.minPurchase) {
      console.log("Not reach mini purchase");
      return res.json({
        success: false,
        message: `You Should Purchse for minimum ${coupon.minPurchase} to get this coupon`,
      });
    }

    console.log('userId', userId, 'coupenCode', code);

    //check it is used by the same user
    const isUsed = await Order.findOne({
      userId,
      couponCode: code,
    });
    console.log("Is used is ", isUsed);

    if (isUsed) {
      console.log('this code is alredy used');

      return res.json({
        success: false,
        message: "You have already used this coupon",
      });
    }

    if (coupon.discountType == "fixed") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType == "percentage") {
      discountAmount = req.session.totalAmount * (coupon.discountValue / 100);
    }

    console.log('req.session.netAmount', req.session.netAmount, 'coupon.discountValue', coupon.discountValue);

    const finalAmount = req.session.netAmount - coupon.discountValue;
    console.log("finalAmount ", finalAmount);

    req.session.appliedCoupon = {
      code: coupon.coupenCode,
      discountAmount,
      finalAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };
    req.session.discountAmount = discountAmount;
    req.session.finalAmount = finalAmount;
    req.session.code = code;
    console.log("req.session.code", req.session.code);

    return res.json({
      success: true,
      message: "Coupon Applied Successfully",
      finalAmount,
      discountAmount,
      code,
    });
  } catch (error) {
    console.log("error ", error);
    return res.json({ success: false, message: "Error in fetching coupen" });
  }
};



// get wallet
const getWallet = async (req, res) => {
  console.log("from user wallet");

  try {
    const userId = req.session.user._id;
    if (!userId) {
      return res.json({ success: false, message: "You are not registered" });
    }
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.json({ success: false, message: "Wallet no found" });
    }
    let cart = []
    let cartCount = 0
    if (userId) {
      cart = await Cart.findOne({ userId });
      if (cart) {
        cartCount = cart.length || 0
      }
    }

    const debitLength = wallet.transactions.filter(
      (transaction) => transaction.type == "debit",
    ).length;
    const creditLength = wallet.transactions.filter(
      (transaction) => transaction.type == "credit",
    ).length;

    const recentTransactions = wallet.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // sort newest first
      .slice(0, 3);

    res.render("user/wallet", {
      categoryId: null,
      priceRange: null,
      cartCount,
      sort: "",
      query: "",
      title: "your Wallet",
      user: req.session.user,
      wallet,
      recentTransactions,
      debitLength,
      creditLength,
    });
  } catch (error) {
    console.log("error is ", error);
    return res.json({ success: false, message: "Server error" });
  }
};

//add money to wallet
const addMoney = async (req, res) => {
  console.log("from add money to wallet ");
  try {
    let { amount } = req.body;
    console.log("req.body ", req.body);

    if (!amount) {
      console.log("enter an amount");
      return res.json({ success: false, message: "Enter a amount" });
    }
    const userId = req.session.user._id;
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.log("Wallet is not found");
      return res.json({ success: false, message: "Wallet is not found" });
    }

    wallet.balance = wallet.balance + parseInt(amount);
    wallet.transactions.push({
      type: "credit",
      amount: parseInt(amount),
      date: new Date(),
      description: "Fund Added",
    });
    await wallet.save();
    return res.json({ success: true, message: "Fund Added succesfully", balance: wallet.balance });
  } catch (error) {
    console.log("error is ", error);
    return res.json({ success: false, message: "server error" });
  }
};

const cancelSingleProduct = async (req, res) => {
  console.log("cancelSingleProduct");

  try {
    const { productId, orderId } = req.body;
    console.log("productId,orderId ", productId, orderId);

    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      console.log("order not found");
      return res.json({ success: false, message: "Order not found" });
    }

    let itemQuantity = 0;
    let itemPrice = 0;
    order.items.forEach((item) => {
      if (
        item.productId.toString() === productId &&
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
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      console.log("Product not found");
      return res.json({ success: false, message: "Product not found" });
    }
    product.stock += itemQuantity;
    await product.save();
    console.log("stock restocked ", itemQuantity);
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

    await order.save();

    const userId = req.session.user._id;
    if (!userId) {
      console.log("User not registered");
      return res.json({ success: false, message: "User not registered" });
    }
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.log("wallet not found");
      return res.json({ success: false, message: "Wallet not found" });
    }

    if (order.useWallet == true) {
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
    return res.json({ success: true, message: "Product order cancelled" });
  } catch (error) {
    console.log("error is ", error);
    return res.json({ success: false, message: "Server error" });
  }
};

const returnProduct = async (req, res) => {
  console.log("from user return product");
  try {
    const { productId, orderId, reason } = req.body;
    if (!productId) {
      console.log("product id is not found");

      return res.json({ success: false, message: "Product id is not found" });
    } else if (!reason) {
      console.log("reson not found");

      return res.json({
        success: false,
        message: "Enter reason for returning",
      });
    } else if (!orderId) {
      console.log("OrderId not found");

      return res.json({ success: false, message: "OrderId not found" });
    }

    // fetching order
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      console.log("Order not found");

      return res.json({ success: false, message: "Order not found" });
    }
    if (order.status !== "Delivered") {
      console.log("the order is not delvered");
      return res.json({
        success: false,
        message: "YOu can return after delivered",
      });
    }
    const productInOrder = order.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (productInOrder.isReturned == true) {
      return res.json({ success: false, message: "Already Returned" });
    }
    //fetching product
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      console.log("Product  not found");
      return res.json({ success: false, message: "Product not found" });
    }
    const existReturn = order.returnRequests.find(
      (req) => req.productId.toString() == productId.toString(),
    );
    if (existReturn) {
      console.log("already requested");
      return res.json({ success: false, message: "Already requested" });
    }

    productInOrder.status = "returnRequested";
    // saving reason in order
    order.returnRequests = order.returnRequests || [];
    order.returnRequests.push({
      productId: productId,
      reason: reason,
      status: "pending",
      date: new Date(),
    });

    productInOrder.status = "return-requested";
    await order.save();

    console.log("Return request saved successfully");
    return res.json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.log("error is ", error);
    return res.json({ success: false, message: "Error in returning product" });
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


const removeCoupon = async (req, res, next) => {
  console.log("removeCoupon");
  try {
    try {
      req.session.appliedCoupon = null;
      req.session.discountAmount = 0;
      req.session.finalAmount = req.session.netAmount; // revert back to original
      req.session.code = "";
      console.log('final amount', req.session.finalAmount);

      return res.json({
        success: true,
        message: "Coupon removed successfully",
        finalAmount: req.session.finalAmount
      });
    } catch (error) {
      console.log("Error removing coupon:", error);
      return res.json({ success: false, message: "Something went wrong" });
    }
  } catch (error) {
    console.log(error);
    next(error);
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

//adminside
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

//block user
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
module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  getHome,
  sendOTP,
  varifyOtp,
  resendOtp,
  getResetPassword,
  postResetPassword,
  getAccount,
  
 
  updateUser,

  
  changePassword,
  getOtp,
  getSetPassword,
  postSetPassword,
  
 
  getOrders,
  getOrderDetails,
  deleteOrder,
  logout,
  applyCoupon,
  
  getWallet,
  addMoney,
  cancelSingleProduct,
  returnProduct,
  addProfileImage,
  removeProfileImage,
  usertest,
 
  getAllCoupons,
  
  removeCoupon,
  getContact,
  emailChangeOtpVerifyOtp,
  getEmailChangeOtp,
  emailChangeResendOtp,

  getUsers,
  blockUser
};
