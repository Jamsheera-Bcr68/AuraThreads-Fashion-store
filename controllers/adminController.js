// controllers/adminController.js
const Admin = require("../model/adminModel");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const router = require("../routes/product");
const Order = require('../model/orderModel')
const Coupen = require('../model/coupenModel')
const Offer = require('../model/offerModel');
const RefferalOffer=require('../model/referralOfferModel')
const Category = require('../model/categoryModel');
const { default: mongoose } = require("mongoose");
const Wallet=require('../model/walletModel')

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
  let date=new Date()
  const totalOffers=await Offer.countDocuments()
  const pendingOffers=await Offer.countDocuments({status:'pending'})
  const activeOffers=await Offer.countDocuments({status:'active'})
  const expiredOffers=await Offer.countDocuments({endDate:{$lt:date}})
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

    const totalOffers=await Offer.countDocuments()
    const totalPages=Math.ceil(totalOffers/limit)

    const products = await Product.find({ isDeleted: false })
    const categories = await Category.find({ isDeleted: false })
    const offers=await Offer.find().sort({startDate:-1}).skip(skip).limit(limit)

  console.log('from admin offer');
 const refferalOffers=await RefferalOffer.find().sort({startDate:-1})
   
  res.render('admin/offerManagement', {
    title: "Offer Management",
    currentPage:page ||1,
    limit,
    skip,
    totalPages,
    totalOffers,
    stats,
    refferalOffers,
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

    offer.status='inactive'
    await offer.save()
    return res.json({success:true,message:"Offer deleted successfully"})
  } catch (error) {
    console.log('error is ',error);
    return res.json({success:false,message:"server Error"})
  }
}

const getSingleOffer=async (req,res)=>{
  console.log('from admin getSingleOffer');
  try {
    const offerId =req.params.offerId
   
    console.log('offerId ',offerId);
    
    if(!offerId){
      console.log("offer Id not found");
      return res.json({success:false,message:"offerId not found"})
    }
    const offer=await Offer.findOne({_id:offerId})
    if(!offer){
      console.log("offer not found");
      return res.json({success:false,message:"offer not found"})
    }
    return res.json({success:true,offer,message:"offer found"})
  } catch (error) {
    console.log('errr in finding getSingleOffer');
    return res.json({success:false,message:"Error in finding offer"})
  }
}

const editOffer=async (req,res)=>{
  console.log('from editOffer');
  try {
    let offerId=req.params.offerId
    console.log('offerId',offerId);
    
    if(!offerId){
      console.log('Offerid not found');
      return res.json({success:false,success:"Offer id is not found"})
    }
    const offer=await Offer.findOne({_id:offerId})
    if(!offer){
      console.log('Offer not found');
      return res.json({success:false,success:"Offer  is not found"})
    }
    const {offerName,offerDesc,discountType,discountValue,startDate,endDate,status,productId,categoryId,offerOn}=req.body

    offer.offerName=offerName
    offer.description=offerDesc,
    offer.discountType=discountType == 'percentage' ? 'percentage' : 'amount',
    offer.discountValue=discountValue,
    offer.startDate=startDate,
    offer.endDate=endDate,
    offer.status=status,
    offer.productId=productId || null,
    offer.categoryId=categoryId || null,
    offer.applicableTo=offerOn,
     offer.updatedAt=new Date()
   
     await offer.save()
     return res.json({success:true,message:"offer Edited Successfully"})
  } catch (error) {
    console.log('error ',error);
    return res.json({success:false,message:"Server error"})
  }
}

const addrefferalOffer=async (req,res,next)=> {
  console.log('from addrefferalOffer');
  try {
    const bonusAmount=req.body.bonusAmount
    const minOrderAmount=req.body.minOrderAmount
    const rewardType=req.body.rewardType
    const status=req.body.status=='enabled'?'active':'inactive'
    if(status==''||rewardType=='' || minOrderAmount=='' || bonusAmount==''){
      console.log("all field are required");
      throw new Error('All fields are required')
    }

    const offer=new RefferalOffer({
      bonusAmount,
      rewardType,
      minOrderAmount,
      status,
      isActive:status=='enabled'?true:false,
      createAt:new Date()
    })
    await offer.save()
    return res.json({success:true,message:"Refferal offer created successfully"})
  } catch (error) {
    console.log('error is ',error);
    next(error)
  }
}

const referalOffers=async (req,res)=>{
  console.log('referalOffers');
  let date=new Date()
  const totalOffers=await Offer.countDocuments()
  const pendingOffers=await Offer.countDocuments({status:'pending'})
  const activeOffers=await Offer.countDocuments({status:'active'})
  const expiredOffers=await Offer.countDocuments({endDate:{$lt:date}})
  const stats = {
    totalOffers,
    activeOffers,
    pendingOffers,
    expiredOffers
  };
  try {
    const offers=await RefferalOffer.find().sort({createdAt:-1})

    res.render('admin/referalOffer',{
      offers,
      stats,
      title:"Offer Management"
    })
  } catch (error) {
    console.log('error is',error);
    res.json({success:false,message:"error in fetching orders"})
  }
}

const deleteReferalOffers=async(req,res,next)=>{
console.log('deleteReferalOffers');
try {
  const offerId=req.params.offerId
  if(!offerId){
    console.log('offer id is not found');
    throw new Error("Offer id is not found")
  }

  const offer=await RefferalOffer.findOne({_id:offerId})
  if(!offer){
    console.log('offer  not found');
    throw new Error("Offer not found")
  }
  offer.status='inactive'
  await offer.save()
return res.json({success:false,message:"Offer deleted successfully"})
} catch (error) {
  console.log('error',error);
  next(error)
}
}

const getSinglerefferal=async (req,res,next)=>{
try {
  console.log('getSinglerefferal');
  
  const offerId=req.params.offerId
  console.log('offer id ',offerId);
  
  if(!offerId){
    throw new Error("Offer id is not found")
  }
  const offer=await RefferalOffer.findOne({_id:offerId})
  console.log('offer ',offer);
  
  if(!offer){
    throw new Error("Offer is not found")
  }
 return res.json({success:true,message:"Offer founduccessfully",offer})
} catch (error) {
  console.log('error is ',error);
  
  next(error)
}
}

const editReffferalOffer=async(req,res,next)=>{
  console.log('editReffferalOffer');
  try {
    const {bonusAmount,minOrderAmount,rewardType,status}=req.body
    const offerId=req.params.offerId
    console.log('offerId,bonusAmount,minOrderAmount,rewardType,status',offerId,bonusAmount,minOrderAmount,rewardType,status);
    if(!offerId){
      console.log('offer id is not fount');
      throw new Error("Offer Id is not found")
    }
    const offer=await RefferalOffer.findOne({_id:offerId})
      if(!offer){
        console.log("Offer not fount");
        throw new Error("Offer not found")
      }
    offer.bonusAmount=bonusAmount
    offer.minOrderAmount=minOrderAmount
    offer.rewardType=rewardType
    offer.status=status=='enabled'?'active':"inactive"
    offer.isActive=status=='enabled'?true:false
    await offer.save()

    return res.json({success:true,message:"Offer edited successfully"})
  } catch (error) {
    console.log('error is ',error);
    
    next(error)
  }
}

const getPendings=async (req,res,next)=>{
  try {
    // let returnRequests = [
    //   {
    //     orderId: 'ORD12345',
    //     productId: 'PROD987',
    //     userEmail: 'jamsheera@example.com',
    //     productName: 'Dress - Blue Floral',
    //     reason: 'Size too small',
    //     status: 'pending',
    //     requestedAt: new Date('2025-05-05')
    //   },
    //   {
    //     orderId: 'ORD12346',
    //     productId: 'PROD988',
    //     userEmail: 'user2@example.com',
    //     productName: 'T-Shirt - Red',
    //     reason: 'Wrong color received',
    //     status: 'approved',
    //     requestedAt: new Date('2025-05-04')
    //   },
    //   {
    //     orderId: 'ORD12347',
    //     productId: 'PROD989',
    //     userEmail: 'user3@example.com',
    //     productName: 'Jeans - Slim Fit',
    //     reason: 'Damaged item',
    //     status: 'rejected',
    //     requestedAt: new Date('2025-05-03')
    //   }
    // ];
    const orders = await Order.find({ returnRequests: { $exists: true, $ne: [] } });
    console.log('orders ',orders);

    //fetching return requests
    const returnRequests=[]
    const products=await Product.find()
    const users=await User.find()
    orders.forEach(order=>{order.returnRequests.forEach(request=>{
      const product=products.find(product=>product._id.toString()==request.productId?.toString())
      const user=users.find(user=>user._id.toString()==order.userId?.toString())
      returnRequests.push({
        userId:order.userId,
        productId:request.productId,
        reason:request.reason,
        requestedDate:request.date,
        orderId:order._id,
        status:request.status,
        productName:product?.productName ||'',
        userEmail:user.email
      })
    })})
  
    console.log('requestedItems ',returnRequests);
    
  
    res.render('admin/aprovalPage',{
      title:"Admin Approvals Management",
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

    if (!orderId) {
      throw new Error("Order ID not found");
    }

    if (!productId) {
      throw new Error("Product ID not found");
    }

    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      throw new Error("Order not found");
    }

    const product = order.items.find(item => item.productId.toString() === productId.toString());
    if (!product) {
      throw new Error("Product not found in order items");
    }

    // Update product status
    product.status = 'returned';
    product.isreturned = true;

    // If all products are returned, mark order as returned
    if (order.items.every(item => item.status === 'returned')) {
      order.status = 'returned';
    }

    // Approve the return request
    const returnRequest = order.returnRequests.find(req =>
      req.productId?.toString() === productId.toString()
    );

    if (returnRequest) {
      returnRequest.status = 'approved';
    } else {
      throw new Error("Return request not found for this product");
    }

    await order.save();
    //product restocking

    const quantity=product.quantity
    console.log('quantity ',quantity);
    const item=await Product.findOne({_id:productId})
    item.stock+=quantity
    item.save()
    console.log('product restocked ');
    
    // wallet updation
   
    const userId=order.userId
    if(!userId){
      console.log('User id is nt found');
      throw new Error("User id is not found")
    }
    const wallet =await Wallet.findOne({userId})
    const refundAmount=quantity*item.price
    wallet.balance+=refundAmount
    wallet.save()
    return res.json({
      success: true,
      message: "Return approved successfully",
    });

  } catch (error) {
    console.error('Error in approveReturn:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};


const rejectReturn=async (req,res)=>{
  console.log('from rejectReturn');
  const {orderId,productId}=req.body
  console.log(orderId,productId,'orderId,productId');
  if(!orderId ){
    console.log(error);
    throw new Error("Order id not found")
  }else if(!productId){
    console.log(error);
    
    throw new Error("Product Id is not found")
  }
  const order=await Order.findOne({_id:orderId})
  if(!order){
    console.log(error);
    throw new Error("Order not found")
  }
  let product=order.items.find(item=>item.productId.toString()==productId.toString())
  console.log(' rejecting product ',product);
  product.status='delivered'
  
  returnRequest=order.returnRequests.find(req=>req.productId?.toString()==productId.toString())
  returnRequest.status='rejected'
  await order.save()
  
  return res.json({success:true,message:"Return Rejected successfully"})
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
  rejectReturn
};
