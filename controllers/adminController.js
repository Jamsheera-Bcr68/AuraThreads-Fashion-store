// controllers/adminController.js
const Admin = require("../model/adminModel");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const router = require("../routes/product");
const Order = require('../model/orderModel')
const Coupen = require('../model/coupenModel')
const Offer = require('../model/offerModel');

const Category = require('../model/categoryModel')

console.log("Admin Controller Loaded!");
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

    if (type == 'products') {
      searchQuery = {
        $or: [
          { productName: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      }
    } else if (type == "category") {
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
  console.log('this is from admin coupens');

  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit
    const coupons = await Coupen.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
    console.log(page, limit, skip, coupons);

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
  const stats = {
    totalOffers: 24,
    activeOffers: 16,
    pendingOffers: 5,
    expiredOffers: 3,
  };
  try {
    const products = await Product.find({ isDeleted: false })
    const categories = await Category.find({ isDeleted: false })
    const offers=await Offer.find({})

  console.log('from admin offer');
  res.render('admin/offerManagement', {
    title: "Offer Management",
    stats,
    offers, products, categories
  })
  } catch (error) {
    console.log('error is ',error);
    return res.json({success:false,message:'Server Error'})
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
      createdAt:new Date()
    })

    await offer.save()
    return res.json({ success: false, message: "Offer Created successfully" })
  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: "Error in Making offer" })
  }
}

const deleteOffer=async (req,res)=>{
  console.log('from delete offer');
  try {
    const  offerId=req.params.offerId
    if(!offerId){
      console.log('Offer id not found');
      return res.json({success:false,message:"Offer id is missing"})
    }
    const offer=await Offer.findOne({_id:offerId})
    if(!offer){
      console.log('Offer not found');
      return res.json({success:false,message:"Offer is not found"})
    }

    offer.status='pending'
    await offer.save()
    return res.json({success:true,message:"Offer deleted successfully"})
  } catch (error) {
    console.log('error is ',error);
    return res.json({success:false,message:"server Error"})
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
  deleteOffer
};
