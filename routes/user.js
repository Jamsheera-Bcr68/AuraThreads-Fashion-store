const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuth = require("../middleweres/userAuth");
const passport = require("passport");
const user=require('../model/userModel')
const Product=require('../model/productModel')
const category=require('../model/categoryModel')
const Address=require('../model/addressModel')
const multer=require('multer')
const upload=multer({dest:'uploads/'})
const csrfProtection=require('../middleweres/csrf')
const crypto = require('crypto');
const transporter = require("../config/nodeMailer");


router.use(csrfProtection)

router.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken();
  } catch (err) {
    res.locals.csrfToken = null;
  }
  next();
});
//display register page
router.get("/register", userController.getRegister);

router.post("/register", userController.postRegister);
router.get('/otp',userController.getOtp)

// Display Login Page
router.get("/login", userController.getLogin);
router.post("/login", userController.postLogin);

router.post('/verifyOtp',userController.varifyOtp);
 router.post("/resendOtp", userController.resendOtp);

// Route to start Google OAuth login
router.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

//get product listing page
router.get('/productList',userController.getProductList)
//get home page
router.get("/home", userController.getHome);


router.get('/products/:productId',userController.getSingleProduct)

//google authenticaion
router.post('/google/callback',userController.postRegister)

//googleuser set password
router.get('/setPassword',userController.getSetPassword)

//post google user passwrd
router.post('/setPassword',userController.postSetPassword)

//get all prooducts page
router.get("/products", (req, res) => {
  console.log('allproducts');
  
  res.render("../views/user/allProducts");
});

//get forgot password
router.get('/forgot-password',async (req,res)=>{
  console.log('from forgot password');
  
  res.render('../views/user/forgotPassword.ejs')
})

// post forgot password
router.post('/forgot-password',async (req,res)=>{
  console.log('from post frogot password');
  
  const {email}=req.body
  try {
     const userExist=await user.findOne({email})
     console.log('user Exist'+userExist);
    
     if(!userExist){
      console.log('User not found');
      res.render('../views/user/register',{errorMessage:'User Not found.Register Now'})
     }else{
      console.log('User found');
       const token = crypto.randomBytes(32).toString('hex')
       userExist.resetToken = token;
        userExist.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await userExist.save();
      //create reset link with token
        const resetLink = `http://localhost:3000/user/reset-password/${token}`;

        // reset password message
        const mailOptions = {
      from:  process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Link',
      html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to reset it:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `
    };

   // sending email
   await transporter.sendMail(mailOptions);
     res.render('../views/user/succesforgotpassword')
     }

    
  } catch (error) {
    console.log('Error in fetching user'+error);
    res.redirect('/user/register')
  }
 
  
})

//reset forgot password
router.get('/reset-password/:token',userController.getResetPassword)

//reset post
router.post('/reset-password',userController.postResetPassword)
//shop
router.get('/shop',async (req,res)=>{
  const products=await Product.find({isDeleted:false})
  const categories=await category.find({isDeleted:false})
  res.render('../views/user/shop',{
    categories,
    products,
    cartCount:2
  })
})



//user account
router.get('/account',userAuth,userController.getAccount)

//add anew address
router.post('/address/add',userController.addAddress)

//user Update
router.post('/profile/update',userController.updateUser)

//user profile pic adding
router.post('/addProfileImage',upload.single('profilePic'),userController.addProfileImage)

//removing profile image
router.post('/removeProfileImage',userController.removeProfileImage)

//user edit address
router.post('/address/edit/:editAddressId',userController.editAddress)

//user delete address
router.delete('/address/delete/:addressId',userController.deleteAddress)

//user cart
router.get('/cart',userAuth,userController.getCart)

//user add to cart
router.post('/cart/add',userAuth,userController.addToCart)
//user remove cart
router.delete('/cart/remove/:productId',userController.deleteCart)

//user cartupdate
router.post('/cart/update/:productId/:quantity/',userController.updateCart)

//user forgot password
router.post('/profile/change-password',userController.changePassword)
//get user checkout
router.get('/checkout',userAuth,userController.getCheckout)
 router.post('/place-order',userController.placeOrder)

 router.get('/order-success',userAuth,userController.getOrderSuccess)

 //user all orderpage

 router.get('/orders',userAuth,userController.getOrders)
 //get orderdetails page
 router.get('/order-details/:orderId',userAuth,userController.getOrderDetails)

 router.delete('/cancel-order/:orderId',userController.deleteOrder)
 //user logout
 router.post('/logout',userController.logout)

 //apply coupon
 router.post('/applyCoupon/',userController.applyCoupon)

 //remove Coupon
 router.get('/removeCoupon',userController.removeCoupon)

 //user wishlist
 router.get('/wishList',userAuth,userController.getWishList)

 //add to wishList
 router.post('/wishList/add',userController.addToWishList)

 //remove from wishList
 router.delete('/wishList/delete/:productId',userController.deleteWishlistItem)

 // get wallet
 router.get('/wallet',userAuth,userController.getWallet)

 //add money to wallet
 router.post('/wallet/addMoney',userAuth,userController.addMoney)

 //cancel single product
 router.delete('/cancelSingleProduct',userAuth,userController.cancelSingleProduct)

 //return product
 router.post('/return-product',userAuth,userController.returnProduct)

 router.post('/test',userController.usertest)

 //router.get('/allcoupons',userController.getAllCoupons)

 //varify payment
router.post('/varifyPayment',userController.varifyPayment)

//payment failure
router.get('/order-failure',userController.getPaymentFailure)



module.exports = router;
