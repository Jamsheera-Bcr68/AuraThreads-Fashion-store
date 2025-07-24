const StatusCodes = require("../utils/statusCodes");
const statusMessages = require("../utils/statusMessages");
const transporter = require("../config/nodeMailer");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Wallet = require("../model/walletModel");
const Cart = require("../model/cartModel");
const WishList = require("../model/wishListModel");

const generateOTP = () =>Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

//getOtp page
const getOtp = async (req, res) => {
  try {
    console.log("from get otp");
    return res.render("user/otp");
  } catch (error) {
    console.log("Error rendering OTP page:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(statusMessages.SERVER_ERROR);
  }
};

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

   return res.status(StatusCodes.OK).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message:statusMessages.SERVER_ERROR });
  }
};

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

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g., "FJ9K2A"
};

const otpStore = {};
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

module.exports={
    getOtp,
    sendOTP,
    varifyOtp,
    resendOtp
}