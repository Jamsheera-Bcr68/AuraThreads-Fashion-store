const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuth = require("../middleweres/userAuth");
const passport = require("passport");
const user = require("../model/userModel");
const Product = require("../model/productModel");
const category = require("../model/categoryModel");
const Address = require("../model/addressModel");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const csrfProtection = require("../middleweres/csrf");
const crypto = require("crypto");
const transporter = require("../config/nodeMailer");
const productController=require('../controllers/productController')
const wishListController=require('../controllers/wishListConntroller')
const cartController=require('../controllers/cartController')
const orderController=require('../controllers/orderController')
const addressController=require('../controllers/adressController')
const WalletController=require('../controllers/walletController')
const couponController=require('../controllers/couponController')
const userProductController=require('../controllers/userProductController')
const profileController=require('../controllers/profileController')
const otpController=require('../controllers/otpController')


//display register page
router.get("/register", userController.getRegister);
router.post("/register", userController.postRegister);

router.get("/login", userController.getLogin);
router.post("/login", userController.postLogin);


//otp Controller
router.get("/otp", otpController.getOtp);

router.post("/verifyOtp", otpController.varifyOtp);
router.post("/resendOtp", otpController.resendOtp);

// Route to start Google OAuth login
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);
//google authenticaion
router.post("/google/callback", userController.postRegister);
//googleuser set password
router.get("/setPassword", userController.getSetPassword);

//post google user passwrd
router.post("/setPassword", userController.postSetPassword);
//get forgot password
router.get("/forgot-password", async (req, res) => {
  console.log("from forgot password just after login");

  res.render("../views/user/forgotPassword.ejs");
});

// post forgot password
router.post("/forgot-password", async (req, res) => {
  console.log("from post frogot password");

  const { email } = req.body;
  try {
    console.log('email',email);
    
    const userExist = await user.findOne({ email });
    console.log("user Exist" + userExist);

    if (!userExist) {
      console.log("User not found");
      res.render("../views/user/register", {
        errorMessage: "User Not found.Register Now",
      });
    } else {
      console.log("User found");
      const token = crypto.randomBytes(32).toString("hex");
      userExist.resetToken = token;
      userExist.resetTokenExpiry = Date.now() + 3600000; // 1 hour
      await userExist.save();
      //create reset link with token
      const resetLink = `https://aurathreads.store/user/reset-password/${token}`;

      // reset password message
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Link",
        html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to reset it:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `,
      };

      // sending email
      await transporter.sendMail(mailOptions);
      res.render("../views/user/succesforgotpassword");
    }
  } catch (error) {
    console.log("Error in fetching user" ,error);
    res.redirect("/user/login");
  }
});

//reset forgot password
router.get("/reset-password/:token", userController.getResetPassword);

//reset post
router.post("/reset-password", userController.postResetPassword);
//user forgot password
router.post("/profile/change-password", userController.changePassword);


//get home page
router.get("/home", userController.getHome);

//user product controller
router.get("/products/:variantId", userProductController.getSingleProduct);
router.get("/productList", userProductController.getProductList);



//user profile controller account
router.get("/account", userAuth, profileController.getAccount);
router.post("/removeProfileImage", profileController.removeProfileImage);


router.patch("/profile/update", userController.updateUser);

router.get("/emailChangeOtp", userController.getEmailChangeOtp);

router.post("/emailChangeResendOtp", userController.emailChangeResendOtp);

router.post("/emailChangeOtpVerifyOtp", userController.emailChangeOtpVerifyOtp);

//user profile pic adding
router.post("/addProfileImage",upload.single("profilePic"),profileController.addProfileImage);


//user logout
router.post("/logout", userController.logout);
router.get('/data',userAuth,userController.getUserdata)



//add anew address
router.post("/address/add", addressController.addAddress);
//user edit address
router.post("/address/edit/:editAddressId", addressController.editAddress);

//user delete address
router.delete("/address/delete/:addressId", addressController.deleteAddress)


//user cart
router.get("/cart", userAuth, cartController.getCart);
router.post("/cart/add", cartController.addToCart);
router.delete("/cart/remove/:variantId", cartController.deleteCart);
router.post("/cart/update/:variantId/:quantity",cartController.updateCart);
router.get("/checkout", userAuth, cartController.getCheckout);


//orderController
router.post("/place-order",orderController.placeOrder);
router.post("/varifyPayment", orderController.varifyPayment);
router.get("/order-success", userAuth, orderController.getOrderSuccess);
router.get("/order-failure", orderController.getPaymentFailure);

//user all orderpage
router.get("/orders", userAuth, orderController.getOrders);
router.get("/order-details/:orderId", userAuth, orderController.getOrderDetails);
router.delete("/cancel-order/:orderId", orderController.cancelOrder);


//apply coupon
router.post("/applyCoupon/", couponController.userApplyCoupon);
//remove Coupon
router.get("/removeCoupon", couponController.userRemoveCoupon);


//user wishlist
router.get("/wishList", userAuth, wishListController.getWishList);
router.post("/wishList/add", wishListController.addToWishList);
router.delete("/wishList/delete/:variantId", wishListController.deleteWishlistItem);

// get wallet
router.get("/wallet", userAuth, WalletController.getWallet);
router.post("/wallet/addMoney", userAuth, WalletController.addMoney);
router.get('/transactions',userAuth,WalletController.getTransactions)

//cancel single product
router.delete( "/cancelSingleProduct",userAuth,orderController.cancelSingleProduct,);
//return product
router.post("/return-product", userAuth, orderController.returnProduct);
//router.post("/test", userController.usertest);



//get contact page
router.get("/contact", userController.getContact);

module.exports = router;
