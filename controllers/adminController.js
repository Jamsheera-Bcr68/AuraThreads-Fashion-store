// controllers/adminController.js
const Admin = require("../model/adminModel");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const router = require("../routes/product");
const Order = require('../model/orderModel')
const Coupen = require('../model/coupenModel')
const Offer = require('../model/offerModel');
const RefferalOffer = require('../model/referralOfferModel')
const Category = require('../model/categoryModel');
const { default: mongoose } = require("mongoose");
const Wallet = require('../model/walletModel')
const ejs = require('ejs');
const path=require('path')
const fs = require('fs');
const pdf = require('html-pdf');
const ExcelJS = require('exceljs');
console.log("Admin Controller Loaded!");
const Razorpay = require("razorpay");
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
//get categories
const getCategory = async (req, res) => {
  res.render("admin/category", { errorMessage: null });
};

//get products
const getProducts = async (req, res) => {
  res.render("admin/products/add", { errorMessage: null });
};

//get addproduct page

const getAddProducts = async (req, res) => {
  res.render("admin/products", { errorMessage: null });
};

//get users
const getUsers = async (req, res) => {
  res.render("admin/user", { errorMessage: null });
};

//searchProducts

const searchProducts = async (req, res) => {
  console.log("from admin searchproducts");

  try {

    const { query, type } = req.query;

    console.log(`Search Query: ${query}, Type: ${type}`)

    ////
    let page = parseInt(req.query.page) || 1
    let limit = parseInt(req.query.limit) || 5
    let skip = (page - 1) * limit

    console.log(`page is ${page} and limt is ${limit}`);

    ///

    let searchQuery = {}
    if (type == "category") {
      searchQuery = {
        categoryName: { $regex: query, $options: "i" },
      }
    } else if (type == "users") {
      searchQuery = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      }
    } else {
      return res.status(400).json({ error: "Invalid search type" })
    }

    //finding results
    if (type === "products") {
      let products = await Product.find(searchQuery).sort({
        createdAt: -1,
      }).skip(skip)
        .limit(limit)

      const totalProducts = await Product.countDocuments(searchQuery)
      const totalPages = Math.ceil(totalProducts / limit)

      res.render("admin/productManagement", {
        title: "Product Management",
        currentPage: page || 1,
        totalPages,
        products,
        successMessage: res.locals.successMessage || "",
        errorMessage: res.locals.errorMessage || "",
      })
    } else if (type === "categories") {
      const totalCategory = await Category.countDocuments(searchQuery)
      const totalPages = Math.ceil(totalCategory / limit)

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
      let users = await User.find(searchQuery).skip(skip)
        .limit(limit);
      const totalUsers = await User.countDocuments(searchQuery)
      const totalPages = totalUsers / limit

      res.render('../views/admin/userManagement',
        {
          users, title: "User Management",
          totalPages,
          currentPage: page || 1,

          successMessage: res.locals.successMessage || '',
          errorMessage: res.locals.errorMessage || ''
        })
    }


  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
    console.log(error + 'error');

  }
};

//admin get order page


const getOrder = async (req, res) => {

  console.log('from admin get order page');
  try {
    //dummy datas
    const adminUser = {
      name: 'Admin User',
      role: 'Administrator',
      profileImage: '/images/admin-avatar.jpg'
    };
    const filter = {
      status: 'all',
      date: '',
      search: ''
    };
    let page = parseInt(req.query.page) || 1
    limit = parseInt(req.query.limit) || 5
    let skip = (page - 1) * limit
    console.log(`page is ${page} and limt is ${limit}`);

    const totalOrders = await Order.countDocuments()
    const totalPages = Math.ceil(totalOrders / limit)

    // const pagination = {
    //   currentPage: 1,
    //   totalPages: 3
    // };

    const orders = await Order.find().populate('userId').sort({ createdAt: -1 }).skip(skip).limit(limit)
    console.log('orders are ', orders);
    return res.render('admin/orders', {
      title: "Admin Orders",
      adminUser,
      filter,
      orders,
      currentPage: page,

      totalPages
    })
  } catch (error) {
    console.log('error in fetching orders', error);
    res.json({ success: false, message: "Order fetching failed" })
  }
}

//get order details

const getOrderDetails = async (req, res) => {
  console.log('from admin get order details');
  const orderId = req.params.orderId
  const order = await Order.findOne({ _id: orderId }).populate('items.productId')
  if (!order) {
    console.log('order not found');
    res.json({ success: false, message: "Order not found" })
  }
  const userId = order.userId
  console.log('user Id is ', userId);

  const user = await User.findOne({ _id: userId })
  if (!user) {
    console.log('user not found');
    res.json({ success: false, message: "User not found" })
  }
  res.render('admin/adminViewOrder', {
    user,
    order,

  })

}

//get ipdate order
const getUpdateOrder = async (req, res) => {
  console.log('from admin order update route');
  try {
    const orderId = req.params.orderId
    const order = await Order.findOne({ _id: orderId }).populate('items.productId')
    if (!order) {
      console.log('order not found');
      res.json({ success: false, message: "Order not found" })
    }


    res.render('admin/adminEditOrder', {
      order,

    })
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Order not found" })
  }
}

//post update user
const postUpdateOrder = async (req, res) => {
  console.log('from post update order');
  const formObject = req.body
  const orderId = formObject.orderId
  const order = await Order.findOne({ _id: orderId })
  if (!order) {
    console.log('order not found');
    return res.json({ success: false, message: "Order not found" })
  }
  order.status = formObject.status
  await order.save()
  console.log("order staus updated succesfully");
  return res.json({ success: true, message: "order staus updated succesfully" })

}

//admin delete order
const deleteOrder = async (req, res) => {
  console.log('from admin order delete route');

  try {
    const orderId = req.params.orderId
    if (!orderId) {
      console.log('Order id is not found');

      return res.json({ success: false, message: "Order id is not found" })
    }
    const order = await Order.findOne({ _id: orderId }).populate('items.productId')

    if (!order) {
      console.log('order not found');

      return res.json({ success: false, message: "order not found" })
    }
    if (order.status == 'cancelled') {
      console.log('order already cancelled');

      return res.json({ success: false, message: "order already cancelled" })
    }
    order.status = 'cancelled'
    await order.save()

    console.log("order cancelled successfully");

    //restore the stock

    for (item of order.items) {
      const product = await Product.findById(item.productId)
      console.log(`before restoring ${product.productName} is ${product.stock}`);

      product.stock = product.stock + item.quantity
      await product.save()
      console.log(`after restoring ${product.productName} is ${product.stock}`);

    }

    return res.json({ success: true, message: "order cancelled successfully" })
  } catch (error) {
    console.log("error in fetching order");
    return res.json({ success: false, message: "error in fetching order" })
  }
}

//admin logout
const postLogout = async (req, res) => {
  console.log('from admin logout route');
  req.session.admin = null;
  console.log('admin in session is ', req.session.admin);
  return res.json({ success: true, message: "Admin logouted successfully" })
}

//coupen management
const getCoupenPage = async (req, res) => {
  //console.log('this is from admin coupens');

  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit
    const coupons = await Coupen.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
    //console.log(page, limit, skip, coupons);

    if (!coupons) {
      console.log('No coupens');

      return res.json({ success: false, message: "Coupens not found" })
    }
    const activeCouponsCount = await Coupen.countDocuments({ isActive: true })
    const totalCoupons = await Coupen.countDocuments()
    const totalPages = Math.floor(totalCoupons / limit)

    res.render('admin/coupenManagement', {
      title: 'Admin Coupen Management',
      coupons,
      activeCouponsCount,
      totalRedemptions: 10,
      revenueImpact: 100,
      expiringSoonCount: 5,
      currentPage: page,
      skip,
      limit,
      totalPages
    })
  } catch (error) {
    console.log('Error in fetching coupens');
    return res.json({ success: false, message: "Error in fetching coupens" })
  }
}

//add coupen
const addCoupen = async (req, res) => {
  console.log('from add coupen');
  try {
    let { coupenCode, description, discountType, discountValue, endDate, minOrder, startDate, isActive, usageLimit } = req.body
    console.log(coupenCode, description, discountType, discountValue, endDate, minOrder, startDate, isActive, usageLimit);
    const coupen = await Coupen.findOne({ coupenCode: coupenCode })
    if (coupen) {
      console.log('Coupen alredy Exists');

      return res.json({ success: false, message: "Coupen already exist" })
    }

    const newCoupen = new Coupen({
      coupenCode,
      description,
      discountType,
      discountValue,
      expiryDate: endDate,
      minPurchase: minOrder,
      startDate,
      isActive: isActive ? true : false,
      usageLimit,

      createdAt: new Date()
    })
    await newCoupen.save()
    console.log('Coupen saved successfully');

    return res.json({ success: true, message: "Coupen created Successfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: "Error in adding coupen" })
  }

}

//editCoupen
const editCoupen = async (req, res) => {
  console.log('from edit coupen');
  try {
    const couponId = req.params.couponId
    console.log("coupen id is ", couponId);
    let { coupenCode, description, discountType, discountValue, endDate, minOrder, startDate, isActive, usageLimit } = req.body
    const coupen = await Coupen.findOne({ _id: couponId })
    if (!coupen) {
      return res.json({ success: false, message: "Coupen not found" })
    }
    coupen.coupenCode = coupenCode,
      coupen.description = description,
      coupen.discountType = discountType,
      coupen.discountValue = discountValue,
      coupen.expiryDate = endDate,
      coupen.minPurchase = minOrder,
      coupen.startDate = startDate,
      coupen.isActive = isActive,
      coupen.usageLimit = usageLimit,
      coupen.updatedAt = new Date(),
      await coupen.save()
    console.log('couped editted successfully');

    return res.json({ success: true, message: "Coupen edited successfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: "Error in fetching coupen" })
  }
}

//getCouponData
const getCouponData = async (req, res) => {
  try {
    console.log('getCouponData');

    const coupenId = req.params.coupenId
    if (!coupenId) {
      console.log('coupen id is not present');
      return res.json({ success: false, message: "coupen id is not seen" })
    }

    const coupon = await Coupen.findOne({ _id: coupenId })
    if (!coupon) {
      console.log('coupen  is not present');
      return res.json({ success: false, message: "coupen  is not seen" })
    }
    return res.json({ success: true, coupon })

  } catch (error) {
    console.log('Error in fetching coupen');
    return res.json({ success: false, message: "Error in fetching coupen" })
  }
}

//removeCoupon
const removeCoupon = async (req, res) => {
  console.log('removeCoupon');
  try {
    const couponId = req.params.couponId
    const coupon = await Coupen.findByIdAndUpdate(
      couponId,
      { $set: { isActive: false } },
      { new: true } // optional: returns the updated document
    );
    await coupon.save()
    console.log('Coupen removed suucesfully');
    return res.json({ success: false, message: "Coupen removed  suuccessfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: 'Server error' })
  }

}

//applyCoupon
const applyCoupon = async (req, res) => {
  console.log('applyCoupon');
  try {
    const couponId = req.params.couponId
    const coupon = await Coupen.findByIdAndUpdate(
      couponId,
      { $set: { isActive: true } },
      { new: true } // optional: returns the updated document
    );
    await coupon.save()
    console.log('Coupen Applied suucesfully');
    return res.json({ success: false, message: "Coupen Applied  suuccessfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: 'Server error' })
  }

}

//get offers
const getOffers = async (req, res) => {
  let date = new Date()
  const totalOffers = await Offer.countDocuments()
  const pendingOffers = await Offer.countDocuments({ status: 'pending' })
  const activeOffers = await Offer.countDocuments({ status: 'active' })
  const expiredOffers = await Offer.countDocuments({ endDate: { $lt: date } })
  const stats = {
    totalOffers,
    activeOffers,
    pendingOffers,
    expiredOffers
  };
  try {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit

    const totalOffers = await Offer.countDocuments()
    const totalPages = Math.ceil(totalOffers / limit)

    const products = await Product.find({ isDeleted: false })
    const categories = await Category.find({ isDeleted: false })
    const offers = await Offer.find().sort({ startDate: -1 }).skip(skip).limit(limit)

    console.log('from admin offer');
    const refferalOffers = await RefferalOffer.find().sort({ startDate: -1 })

    res.render('admin/offerManagement', {
      title: "Offer Management",
      currentPage: page || 1,
      limit,
      skip,
      totalPages,
      totalOffers,
      stats,
      refferalOffers,
      offers, products, categories
    })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: 'Server Error' })
  }
}

//add offer
const addOffer = async (req, res) => {
  console.log('from admin add offer');
  try {
    const formObject = req.body
    console.log('form Object ', formObject);

    const offer = new Offer({
      offerName: formObject.offerName,
      description: formObject.offerDesc,
      discountType: formObject.discountType == 'percentage' ? 'percentage' : 'amount',
      discountValue: formObject.discountValue,
      startDate: formObject.startDate,
      endDate: formObject.endDate,
      status: formObject.status,
      productId: formObject.productId || null,
      categoryId: formObject.categoryId || null,
      applicableTo: formObject.offerOn,
      createdAt: new Date()
    })

    await offer.save()
    return res.json({ success: false, message: "Offer Created successfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: "Error in Making offer" })
  }
}

const deleteOffer = async (req, res) => {
  console.log('from delete offer');
  try {
    const offerId = req.params.offerId
    if (!offerId) {
      console.log('Offer id not found');
      return res.json({ success: false, message: "Offer id is missing" })
    }
    const offer = await Offer.findOne({ _id: offerId })
    if (!offer) {
      console.log('Offer not found');
      return res.json({ success: false, message: "Offer is not found" })
    }

    offer.status = 'inactive'
    await offer.save()
    return res.json({ success: true, message: "Offer deleted successfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: "server Error" })
  }
}

const getSingleOffer = async (req, res) => {
  console.log('from admin getSingleOffer');
  try {
    const offerId = req.params.offerId

    console.log('offerId ', offerId);

    if (!offerId) {
      console.log("offer Id not found");
      return res.json({ success: false, message: "offerId not found" })
    }
    const offer = await Offer.findOne({ _id: offerId })
    if (!offer) {
      console.log("offer not found");
      return res.json({ success: false, message: "offer not found" })
    }
    return res.json({ success: true, offer, message: "offer found" })
  } catch (error) {
    console.log('errr in finding getSingleOffer');
    return res.json({ success: false, message: "Error in finding offer" })
  }
}

const editOffer = async (req, res) => {
  console.log('from editOffer');
  try {
    let offerId = req.params.offerId
    console.log('offerId', offerId);

    if (!offerId) {
      console.log('Offerid not found');
      return res.json({ success: false, success: "Offer id is not found" })
    }
    const offer = await Offer.findOne({ _id: offerId })
    if (!offer) {
      console.log('Offer not found');
      return res.json({ success: false, success: "Offer  is not found" })
    }
    const { offerName, offerDesc, discountType, discountValue, startDate, endDate, status, productId, categoryId, offerOn } = req.body

    offer.offerName = offerName
    offer.description = offerDesc,
      offer.discountType = discountType == 'percentage' ? 'percentage' : 'amount',
      offer.discountValue = discountValue,
      offer.startDate = startDate,
      offer.endDate = endDate,
      offer.status = status,
      offer.productId = productId || null,
      offer.categoryId = categoryId || null,
      offer.applicableTo = offerOn,
      offer.updatedAt = new Date()

    await offer.save()
    return res.json({ success: true, message: "offer Edited Successfully" })
  } catch (error) {
    console.log('error ', error);
    return res.json({ success: false, message: "Server error" })
  }
}

const addrefferalOffer = async (req, res, next) => {
  console.log('from addrefferalOffer');
  try {
    const bonusAmount = req.body.bonusAmount
    const minOrderAmount = req.body.minOrderAmount
    const rewardType = req.body.rewardType
    const status = req.body.status == 'enabled' ? 'active' : 'inactive'
    if (status == '' || rewardType == '' || minOrderAmount == '' || bonusAmount == '') {
      console.log("all field are required");
      throw new Error('All fields are required')
    }

    const offer = new RefferalOffer({
      bonusAmount,
      rewardType,
      minOrderAmount,
      status,
      isActive: status == 'enabled' ? true : false,
      createAt: new Date()
    })
    await offer.save()
    return res.json({ success: true, message: "Refferal offer created successfully" })
  } catch (error) {
    console.log('error is ', error);
    next(error)
  }
}

const referalOffers = async (req, res) => {
  console.log('referalOffers');
  let date = new Date()
  const totalOffers = await Offer.countDocuments()
  const pendingOffers = await Offer.countDocuments({ status: 'pending' })
  const activeOffers = await Offer.countDocuments({ status: 'active' })
  const expiredOffers = await Offer.countDocuments({ endDate: { $lt: date } })
  const stats = {
    totalOffers,
    activeOffers,
    pendingOffers,
    expiredOffers
  };
  try {
    const offers = await RefferalOffer.find().sort({ createdAt: -1 })

    res.render('admin/referalOffer', {
      offers,
      stats,
      title: "Offer Management"
    })
  } catch (error) {
    console.log('error is', error);
    res.json({ success: false, message: "error in fetching orders" })
  }
}

const deleteReferalOffers = async (req, res, next) => {
  console.log('deleteReferalOffers');
  try {
    const offerId = req.params.offerId
    if (!offerId) {
      console.log('offer id is not found');
      throw new Error("Offer id is not found")
    }

    const offer = await RefferalOffer.findOne({ _id: offerId })
    if (!offer) {
      console.log('offer  not found');
      throw new Error("Offer not found")
    }
    offer.status = 'inactive'
    await offer.save()
    return res.json({ success: false, message: "Offer deleted successfully" })
  } catch (error) {
    console.log('error', error);
    next(error)
  }
}

const getSinglerefferal = async (req, res, next) => {
  try {
    console.log('getSinglerefferal');

    const offerId = req.params.offerId
    console.log('offer id ', offerId);

    if (!offerId) {
      throw new Error("Offer id is not found")
    }
    const offer = await RefferalOffer.findOne({ _id: offerId })
    console.log('offer ', offer);

    if (!offer) {
      throw new Error("Offer is not found")
    }
    return res.json({ success: true, message: "Offer founduccessfully", offer })
  } catch (error) {
    console.log('error is ', error);

    next(error)
  }
}

const editReffferalOffer = async (req, res, next) => {
  console.log('editReffferalOffer');
  try {
    const { bonusAmount, minOrderAmount, rewardType, status } = req.body
    const offerId = req.params.offerId
    console.log('offerId,bonusAmount,minOrderAmount,rewardType,status', offerId, bonusAmount, minOrderAmount, rewardType, status);
    if (!offerId) {
      console.log('offer id is not fount');
      throw new Error("Offer Id is not found")
    }
    const offer = await RefferalOffer.findOne({ _id: offerId })
    if (!offer) {
      console.log("Offer not fount");
      throw new Error("Offer not found")
    }
    offer.bonusAmount = bonusAmount
    offer.minOrderAmount = minOrderAmount
    offer.rewardType = rewardType
    offer.status = status == 'enabled' ? 'active' : "inactive"
    offer.isActive = status == 'enabled' ? true : false
    await offer.save()

    return res.json({ success: true, message: "Offer edited successfully" })
  } catch (error) {
    console.log('error is ', error);

    next(error)
  }
}

const getPendings = async (req, res, next) => {
  try {
   
    const orders = await Order.find({ returnRequests: { $exists: true, $ne: [] } });
    //console.log('orders ', orders);

    //fetching return requests
    const returnRequests = []
    const products = await Product.find()
    const users = await User.find()
    orders.forEach(order => {
      order.returnRequests.forEach(request => {
        const product = products.find(product => product._id.toString() == request.productId?.toString())
        const user = users.find(user => user._id.toString() == order.userId?.toString())
        returnRequests.push({
          userId: order.userId,
          productId: request.productId,
          reason: request.reason,
          requestedDate: request.date,
          orderId: order._id,
          status: request.status,
          productName: product?.productName || '',
          userEmail: user.email
        })
      })
    })

   // console.log('requestedItems ', returnRequests);


    res.render('admin/aprovalPage', {
      title: "Admin Approvals Management",
      returnRequests
    })
  } catch (error) {
    console.log(error);
    next(error)
  }
}
const approveReturn = async (req, res) => {
  try {
    console.log('From approveReturn');
    const { orderId, productId } = req.body;
console.log('orderId, productId',orderId, productId);

    if (!orderId || !productId) {
      throw new Error("Order ID or Product ID not found");
    }

    const order = await Order.findOne({ _id: orderId });
    if (!order) throw new Error("Order not found");

    const product = order.items.find(item => item.productId.toString() === productId.toString());
    if (!product) throw new Error("Product not found in order items");
    
    console.log('returning product is ',product);
    
    // Update product status
    product.status = 'returned';
    product.isreturned = true;
    order.markModified('items');

    // If all products are returned, mark the whole order as returned
    if (order.items.every(item => item.status === 'returned')) {
      order.status = 'returned';
    }

    // Approve the return request
    const returnRequest = order.returnRequests.find(req =>
      req.productId?.toString() === productId.toString()
    );
    if (!returnRequest) throw new Error("Return request not found for this product");

    console.log('returnrequest brfore save',returnRequest);
    
    returnRequest.status = 'approved';
    order.markModified('returnRequests')
    console.log('Return approved');

    await order.save();

    console.log('returnrequest after save',order.returnRequests)
    // Restock product
    const quantity = product.quantity;
    const item = await Product.findOne({ _id: productId });
    if (!item) throw new Error("Product not found in database");
    item.stock += quantity;
    await item.save();
    console.log('Product restocked');

    // Wallet refund
    const userId = order.userId;
    if (!userId) throw new Error("User ID is not found");

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error("Wallet not found");

    const refundAmount = quantity * item.price;
    wallet.balance += refundAmount;
    await wallet.save();
    console.log('Wallet refunded with:', refundAmount);

    return res.json({
      success: true,
      message: "Return approved successfully",
    });

  } catch (error) {
    console.error('Error in approveReturn:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};



const rejectReturn = async (req, res) => {
  try {
    console.log('From rejectReturn');

    const { orderId, productId } = req.body;
    console.log(orderId, productId, 'orderId, productId');

    // Validate inputs
    if (!orderId) throw new Error("Order ID not found");
    if (!productId) throw new Error("Product ID not found");

    // Find the order
    const order = await Order.findOne({ _id: orderId });
    if (!order) throw new Error("Order not found");

    // Find the product in order items
    const product = order.items.find(item => item.productId.toString() === productId.toString());
    if (!product) throw new Error("Product not found in order items");

    // Revert status back to delivered (or keep original if needed)
    product.status = 'delivered';
    order.markModified('items');

    // Find and reject the return request
    const returnRequest = order.returnRequests.find(req => req.productId?.toString() === productId.toString());
    if (!returnRequest) throw new Error("Return request not found for this product");
      console.log('returnRequest',returnRequest);
      
    returnRequest.status = 'rejected';

    // Save changes
    await order.save();

    return res.json({ success: true, message: "Return rejected successfully" });

  } catch (error) {
    console.error('Error in rejectReturn:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};



const getSalesReport = async (req, res, next) => {
  try {
    console.log('from sales report page');

    const reportType = req.query.reportType || '';
    console.log('reportType', reportType);

    let matchStage = { $match: { status: { $ne: 'cancelled' } } };
    let groupStage, sortStage;


    if (reportType === 'weekly') {
      groupStage = {
        $group: {
          _id: { $isoWeek: '$createdAt' },
          totalSales: { $sum: '$finalAmount' }
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'monthly') {
      groupStage = {
        $group: {
          _id: { $month: '$createdAt' },
          totalSales: { $sum: '$finalAmount' }
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'yearly') {
      groupStage = {
        $group: {
          _id: { $year: '$createdAt' },
          totalSales: { $sum: '$finalAmount' }
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'custom') {
      const { startDate, endDate } = req.query;
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: '$finalAmount' }
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        },
      }
      sortStage = { $sort: { '_id': 1 } }
    }


    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage
    ]);

    console.log('salesData', salesData);
    const totalSales = await salesData.map(s => s.totalSales)
    console.log('totalSales', totalSales);

    //salesdates
    const year = 2025;
    const month = 4;
    const salesDates = salesData.map(item => {
      const id = item._id;

      if (reportType === 'weekly') {
        return `Week ${id}`;
      } else if (reportType === 'monthly') {
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        return monthNames[id - 1]; // since $month returns 1 for Jan
      } else if (reportType === 'yearly') {
        return id.toString(); // id is the year
      } else if (reportType === 'custom') {
        return id; // it's already a formatted date string like "2025-05-12"
      } else {
        // default: daily by day of month
        const date = new Date(year, month, id);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
      }
    });


    console.log('salesDates', salesDates);

    //total discounts
    let discountMatchStage = { $match: { status: { $ne: 'cancelled' } } };
    let discountGroupStage, discountSortStage;

    if (reportType === 'weekly') {
      discountGroupStage = {
        $group: {
          _id: { $isoWeek: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'monthly') {
      discountGroupStage = {
        $group: {
          _id: { $month: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'yearly') {
      discountGroupStage = {
        $group: {
          _id: { $year: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'custom') {
      const { startDate, endDate } = req.query;
      discountMatchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      };
      discountGroupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else {
      // default: daily (per day)
      discountGroupStage = {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    }

    const totalDiscount = await Order.aggregate([
      discountMatchStage,
      discountGroupStage,
      discountSortStage
    ]);

    console.log('total discont', totalDiscount);

    //top products
    let topProductMatchStage = { status: { $ne: 'cancelled' } };


    const topProducts = await Order.aggregate([
      { $match: topProductMatchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' }, productName: { $first: '$productDetails.productName' }, images: { $first: '$productDetails.images' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 3 }
    ])
   // console.log('top products ', topProducts);

    //recent orders
    const recentOrders = await Order.find({ status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(3);

    const salesDatas = [
      // {
      //   _id: "2025-05-01",
      //   totalOrders: 12,
      //   totalSales: 15000,
      //   totalDiscount: 1200,
      //   couponDeduction: 500
      // },
      // {
      //   _id: "2025-05-02",
      //   totalOrders: 9,
      //   totalSales: 10250,
      //   totalDiscount: 750,
      //   couponDeduction: 300
      // },
      // {
      //   _id: "2025-05-03",
      //   totalOrders: 15,
      //   totalSales: 18750,
      //   totalDiscount: 1500,
      //   couponDeduction: 750
      // },
      // {
      //   _id: "2025-05-04",
      //   totalOrders: 7,
      //   totalSales: 8200,
      //   totalDiscount: 500,
      //   couponDeduction: 250
      // },
      // {
      //   _id: "2025-05-05",
      //   totalOrders: 11,
      //   totalSales: 13400,
      //   totalDiscount: 1000,
      //   couponDeduction: 600
      // }
      //    ];

      //summary
    ]
    let summary = {
      offerDiscountAmount: totalDiscount.reduce((acc, val) => acc + val.totalDiscountAmount, 0),
      couponDiscount: totalDiscount.reduce((acc, val) => acc + val.couponDiscount, 0),
      totalOrders: salesData.length,
      totalRevenue: totalSales.reduce((acc, val) => acc + val, 0),
    }
    res.render('admin/report', {
      title: 'Sales Report',
      salesData,
      recentOrders,
      summary,
      topProducts,
      totalSales: totalSales || 0,
      reportType,
      salesDates,
      salesDatas
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    next(error);
  }
};

const updateSaleReport = async (req, res, next) => {
  console.log('updateSaleReport');
  try {
    const reportType = req.query.reportType || '';
    console.log('reportType', reportType);
    //////
    let matchStage = { $match: { status: { $ne: 'cancelled' } } };
    let groupStage, sortStage;


    if (reportType === 'weekly') {
      groupStage = {
        $group: {
          _id: { $isoWeek: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'monthly') {
      groupStage = {
        $group: {
          _id: { $month: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'yearly') {
      groupStage = {
        $group: {
          _id: { $year: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'custom') {
      const { startDate, endDate } = req.query;
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        },
      }
      sortStage = { $sort: { '_id': 1 } }
    }


    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage
    ]);

    console.log('salesData from updates', salesData);
    const totalSales = await salesData.map(s => s.totalSales)
    console.log('totalSales', totalSales);

    //salesdates
    const year = 2025;
    const month = 4;
    const salesDates = salesData.map(item => {
      const id = item._id;

      if (reportType === 'weekly') {
        return `Week ${id}`;
      } else if (reportType === 'monthly') {
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        return monthNames[id - 1]; // since $month returns 1 for Jan
      } else if (reportType === 'yearly') {
        return id.toString(); // id is the year
      } else if (reportType === 'custom') {
        return id; // it's already a formatted date string like "2025-05-12"
      } else {
        // default: daily by day of month
        const date = new Date(year, month, id);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
      }
    });


    console.log('salesDates', salesDates);

    //total discounts
    let discountMatchStage = { $match: { status: { $ne: 'cancelled' } } };
    let discountGroupStage, discountSortStage;

    if (reportType === 'weekly') {
      discountGroupStage = {
        $group: {
          _id: { $isoWeek: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'monthly') {
      discountGroupStage = {
        $group: {
          _id: { $month: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'yearly') {
      discountGroupStage = {
        $group: {
          _id: { $year: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'custom') {
      const { startDate, endDate } = req.query;
      discountMatchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      };
      discountGroupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    } else {
      // default: daily (per day)
      discountGroupStage = {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          totalDiscountAmount: { $sum: '$offerDiscountAmount' },
          couponDiscount: { $sum: '$coupenDiscountAmount' }
        }
      };
      discountSortStage = { $sort: { '_id': 1 } };
    }

    const totalDiscount = await Order.aggregate([
      discountMatchStage,
      discountGroupStage,
      discountSortStage
    ]);

    console.log('total discont', totalDiscount);



    //top products
    let topProductMatchStage = { status: { $ne: 'cancelled' } };


    if (reportType == 'weekly') {
      const today = new Date();
      const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      topProductMatchStage.createdAt = { $gte: firstDayOfWeek, $lte: lastDayOfWeek };

    } else if (reportType == 'monthly') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      topProductMatchStage.createdAt = { $gte: firstDay, $lte: lastDay };
    } else if (reportType == 'yearly') {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      topProductMatchStage.createdAt = { $gte: start, $lte: end };
    } else if (reportType == 'custom') {
      const { startDate, endDate } = req.query;
      topProductMatchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    } else {
      const today = new Date()
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
    const recentOrders = await Order.find({ status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(3);


    //summary

    // let summary = {
    //   offerDiscountAmount: totalDiscount.reduce((acc, val) => acc + val.totalDiscountAmount, 0),
    //   couponDiscount: totalDiscount.reduce((acc, val) => acc + val.couponDiscount, 0),
    //   totalOrders: salesData.length,
    //   totalRevenue: totalSales.reduce((acc, val) => acc + val, 0),
    // }
    console.log('salesDates,totalsales', salesDates, totalSales);

    res.json({ success: true, message: 'Data got successfully', totalSales, salesDates ,salesData})
    /////
  } catch (error) {
    console.log(error);
    next(error)
  }
}

const downloadSaleReportpdf=async (req,res,next)=>{
  console.log('downloadSaleReportpdf');
  try {
    
    const {chartImage,startDate,endDate,reportType}=req.body
   // console.log('chartImage,startDate,endDate,reportType',chartImage,startDate,endDate,reportType);
    //getiing salesdata
    console.log('reportType', reportType);
    //////
    let matchStage = { $match: { status: { $ne: 'cancelled' } } };
    let groupStage, sortStage;


    if (reportType === 'weekly') {
      groupStage = {
        $group: {
          _id: { $isoWeek: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'monthly') {
      groupStage = {
        $group: {
          _id: { $month: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'yearly') {
      groupStage = {
        $group: {
          _id: { $year: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'custom') {
     
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        },
      }
      sortStage = { $sort: { '_id': 1 } }
    }


    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage
    ]);

    console.log('sale Dta',salesData);
 const htmlContent = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'admin', 'salesReportPdf.ejs'),
      {
        chartImage,
        salesData,
        reportType,
        startDate: startDate || null,
        endDate: endDate || null
      }
    );

    const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const pdfPath = path.join(downloadsDir, 'SalesReport.pdf');

    pdf.create(htmlContent).toFile(pdfPath, (err, result) => {
      if (err) {
        console.error("PDF creation error:", err);
        return res.status(500).send("Failed to generate PDF");
      }

      return res.download(pdfPath, 'SalesReport.pdf', (err) => {
        if (err) {
          console.error("Download error:", err);
          return res.status(500).send("Error downloading file.");
        }
      });
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
}

const downloadSaleReportExcel=async (req,res,next)=>{
  console.log('downloadSaleReportExcel');
  try {
    const {startDate}=req.query||null
    const {endDate}=req.query||null
    const {reportType}=req.query
    console.log('startDate,endDate,reportType',startDate,endDate,reportType);
    //getiing salesdata
    console.log('reportType', reportType);
    //////
    let matchStage = { $match: { status: { $ne: 'cancelled' } } };
    let groupStage, sortStage;

     if (reportType === 'weekly') {
      groupStage = {
        $group: {
          _id: { $isoWeek: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'monthly') {
      groupStage = {
        $group: {
          _id: { $month: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'yearly') {
      groupStage = {
        $group: {
          _id: { $year: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else if (reportType === 'custom') {
     
      matchStage = {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      };
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        }
      };
      sortStage = { $sort: { '_id': 1 } };
    } else {
      groupStage = {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          totalSales: { $sum: '$finalAmount' },
          offerDeduction:{$sum:'$offerDiscountAmount'},
          couponDeduction:{$sum:'$coupenDiscountAmount'},
         orderCount:{$sum:1}
        },
      }
      sortStage = { $sort: { '_id': 1 } }
    }


    const salesData = await Order.aggregate([
      matchStage,
      groupStage,
      sortStage
    ]);
    
     console.log('sale Data from excel',salesData);

      const workbook = new ExcelJS.Workbook();
       const worksheet = workbook.addWorksheet('Sales Report')

        // Define columns
  worksheet.columns = [
  {
    header:
      reportType === 'daily' || reportType === 'custom'
        ? 'Date'
        : reportType === 'weekly'
        ? 'Week'
        : reportType === 'monthly'
        ? 'Month'
        : 'Year',
    key: 'date',
    width: 20,
  },
  { header: 'Total Sales', key: 'total', width: 15 },
  { header: 'Coupon Discount', key: 'couponDeduction', width: 15 },
  { header: 'Offer Discount', key: 'offerDeduction', width: 15 },
  { header: 'Total Discount', key: 'totalDiscount', width: 15 },
  { header: 'Order Count', key: 'orderCount', width: 15 },
];

     // Add data rows
   salesData.forEach((entry) => {
  worksheet.addRow({
    date: entry._id,
    total: entry.totalSales,
    
    couponDeduction:entry.couponDeduction,
    offerDeduction:entry.offerDeduction,
    totalDiscount: Number(entry.offerDeduction || 0) + Number(entry.couponDeduction || 0),
    orderCount: entry.orderCount
  });
})

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    next(error)
  }
  
}
module.exports = {
  getLogin,
  postLogin,
  getCategory,
  getProducts,
  getUsers,
  getAddProducts,
  searchProducts,
  getOrder,
  getOrderDetails,
  getUpdateOrder,
  postUpdateOrder,
  deleteOrder,
  postLogout,
  getCoupenPage,
  addCoupen,
  editCoupen,
  getCouponData,
  removeCoupon,
  applyCoupon,
  getOffers,
  addOffer,
  deleteOffer,
  getSingleOffer,
  editOffer,
  addrefferalOffer,
  referalOffers,
  deleteReferalOffers,
  getSinglerefferal,
  editReffferalOffer,
  getPendings,
  approveReturn,
  rejectReturn,
  getSalesReport,
  updateSaleReport,
  downloadSaleReportpdf,
  downloadSaleReportExcel
}
