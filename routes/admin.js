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
const sharp = require('sharp')
const path = require('path');
const { route } = require("./product");
const Order = require('../model/orderModel')



// Display Login Page
router.get("/login", adminController.getLogin);

// Handle Login Submission
router.post("/login", adminController.postLogin);

//get dashboard
router.get("/dashboard", async (req, res) => {
  const userCount = await user.countDocuments();
  const productCount = await product.countDocuments({ isDeleted: false });
  const categoryCount = await category.countDocuments({ isDeleted: false });
  const orderCount = await Order.countDocuments({});
  console.log(
    userCount +
    " userCount , " +
    productCount +
    " productCount , " +
    categoryCount +
    "category counts"
  );

  res.render("../views/admin/dashboard", {
    title: "Dashboard",
    userCount,
    productCount,
    categoryCount,
    orderCount
  });
});

//get categoryManagement
router.get("/category", async (req, res) => {
  try {
    const query=req.query.query || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit
 console.log('Query is' ,query);
 let searchQuery={isDeleted:false}

 if(query.trim()){
  searchQuery = {
    $and: [
      {
        $or: [
          { categoryName: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
      { isDeleted: false },
    ],
  };
 }
 
    const categories = await category.find(searchQuery).sort({ createdAt: -1 })
      .skip(skip).limit(limit)
    console.log(`from category page is ${page} lmit is ${limit}`);

    const totalCategory = await category.countDocuments(searchQuery)
    const totalPages = Math.ceil(totalCategory / limit)

    res.render("../views/admin/categoryManagement", {
      categories,
      currentPage: page,
      totalPages,
      query,
      title: "Category Manamgement",
      successMessage: res.locals.successMessage[0] || "",
      errorMessage: res.locals.errorMessage[0] || "",
    });
  } catch (error) {
    res.status(500).send("Error fetching categories");
  }
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




router.post("/category/add", upload.array("images", 5), async (req, res) => {
  console.log("Uploaded files:", req.files); // Debugging

  if (!req.files || req.files.length === 0) {
    req.flash("errorMessage", "No images uploaded.");
    return res.redirect("/admin/category");;
  }

  const { categoryName, description } = req.body;
  const isListed = req.body.isListed == "on" ? true : false;
  const imagePaths = []; // Clear this before pushing resized images

  try {
    // Check if category already exists
    const existingCategory = await category.findOne({ categoryName, isDeleted: false });

    if (existingCategory) {
      req.flash("errorMessage", "This Category already exists.");
      return res.redirect("/admin/category");;
    }

    // Resize each uploaded image and save only resized paths
    await Promise.all(
      req.files.map(async (file) => {
        const resizedPath = path.join("uploads", "resized_" + file.filename);

        await sharp(file.path)
          .resize({ width: 500, height: 500, fit: "cover" }) // Crop & Resize
          .toFile(resizedPath);

        imagePaths.push(resizedPath); // Save only resized image path
      })
    );

    // Save category
    const newCategory = new category({
      categoryName,
      description,
      isListed,
      images: imagePaths, // Only resized images are stored
    });

    await newCategory.save();
    req.flash("successMessage", "Category added successfully!");
    return res.redirect("/admin/category");
  } catch (error) {
    console.error("Error when adding category:", error);
    req.flash("errorMessage", "Error in adding Category.");
    return res.redirect("/admin/category");
  }
});



router.post("/category/edit/:id", async (req, res) => {
  const { categoryName, description } = req.body;
  const { id } = req.params;

  const isListed = req.body.isListed == "on" ? true : false;
  console.log(isListed);

  try {
    const existCategory = await category.findOneAndUpdate(
      { _id: id },
      {
        $set: { categoryName, description, isListed },
      },
      { new: true }
    );
    console.log("category found");

    if (!existCategory) {
      req.flash('errorMessage', 'Category not found')
      res.redirect('/admin/category')
    }

    req.flash('successMessage', 'Category Updated Successfully')
    res.redirect('/admin/category')
    // const categories = await category.find({isDeleted:false});

    // res.render("../views/admin/categoryManagement", {
    //   categories,
    //   title: "Category Manamgement",
    // });
  } catch (error) {
    console.log(error);
    req.flash('errorMessage', 'Error While Adding Caterory')
  }
});

router.delete("/category/delete/:id", async (req, res) => {
  const { id } = req.params;
 console.log('from delete routes');
 
  try {
    const softDeleteCategory = await category.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!softDeleteCategory) {
      console.log('Category not found');
      
     return res.json({success:false,message:"Category not found"})
    } else {
      console.log('Category Deleted successfully');
      console.log("soft deleted category " + softDeleteCategory);
     return res.json({success:true,message:"Category Deleted successfully"})
    
  } }catch (error) {
    console.log("error on deleting category", error);
    return res.json({success:false,message:"Error in delting category"})
  }
})

//get usermangement
router.get('/users', async (req, res) => {
  try {
    const query=req.query.query ||''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit

    console.log('query',query);
    
    let searchQuery={}
    if(query.trim()){
      searchQuery = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      }
    }
    const users = await user.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit)

    const totalUsers = await user.countDocuments()
    const totalPages = Math.ceil(totalUsers / limit)

    console.log(`from userpage.page is ${page} and limit is ${limit}`);


    res.render('../views/admin/userManagement',
      {
        users,
        currentPage: page,
        totalPages,
        title: "User Management",
        successMessage: res.locals.successMessage || '',
        errorMessage: res.locals.errorMessage || ''
      })
  } catch (error) {
    req.flash('errorMessage', 'Error in fetching User')
    res.render('../views/admin/dashboard', { title: 'Admin Dashboard' })
  }
})

//block and unblock user 

router.patch('/block-user/:userId', async (req, res) => {
  console.log('from block user');
  const { userId } = req.params
  const { isActive } = req.body

  try {

    const blockUser = await user.findOneAndUpdate(
      { _id: userId },
      { isActive },
      { new: true })



    if (!blockUser) {

      req.flash('errorMessage', 'user not found')
      res.redirect('/users')
    }
    req.flash('succesMessage', 'user not found')
    res.redirect('/users')
  } catch (error) {
    console.log('error in blocking user');
    req.flash('errorMessage', 'error in blocking user')
    res.redirect('/users')

  }

})

router.get('/orders', adminController.getOrder)
router.get('/orderDetails/:orderId', adminController.getOrderDetails)
router.get('/updateOrder/:orderId', adminController.getUpdateOrder)
router.post('/updateOrder', adminController.postUpdateOrder)
router.delete('/deleteOrder/:orderId', adminController.deleteOrder)
router.post('/logout', adminController.postLogout)

//admin coupenMangement
router.get('/coupens', adminController.getCoupenPage)

//admin add coupen 
router.post('/addCoupon', adminController.addCoupen)

//admin edit coupen
router.put('/editCoupon/:couponId', adminController.editCoupen)

//get coupen data
router.get('/getCouponData/:coupenId', adminController.getCouponData)

//remove coupon
router.delete('/removeCoupon/:couponId', adminController.removeCoupon)

//applyCoupon
router.put('/applyCoupon/:couponId', adminController.applyCoupon)

//get offer mangement
router.get('/offers', adminController.getOffers)

//add offer
router.post('/addOffer', adminController.addOffer)

//delte Offer
router.delete('/offer/delete/:offerId', adminController.deleteOffer)

//edit offer
router.get('/getSingleOffer/:offerId',adminController.getSingleOffer)

//edit offer
router.put('/editOffer/:offerId',adminController.editOffer)

//add refferal offer
router.post('/addrefferalOffer',adminController.addrefferalOffer)

//get referal offer
router.get('/referalOffers',adminController.referalOffers)

//delete referal offer
router.delete('/refferalOffer/delete/:offerId',adminController.deleteReferalOffers)

//get single refferal
router.get('/getSinglerefferal/:offerId',adminController.getSinglerefferal)

//edit referal offer
router.post('/editReferralForm/:offerId',adminController.editReffferalOffer)

// get approval page
router.get('/pendings',adminController.getPendings)

//admin return approval
router.post('/returns/approve',adminController.approveReturn)

//admin reject return
router.post('/returns/reject',adminController.rejectReturn)
module.exports = router;
