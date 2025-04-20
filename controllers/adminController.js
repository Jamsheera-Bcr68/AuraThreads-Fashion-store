// controllers/adminController.js
const Admin = require("../model/adminModel");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const router = require("../routes/product");
const Order=require('../model/orderModel')

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
   
    const { query,type} = req.query;

    console.log(`Search Query: ${query}, Type: ${type}`)

    ////
    let page=parseInt(req.query.page)|| 1
       let limit=parseInt(req.query.limit) ||5
       let skip=(page-1)*limit
    
        console.log(`page is ${page} and limt is ${limit}`);
    
    ///
    
   let searchQuery={}

   if(type=='products'){
    searchQuery = {
      $or: [
      { productName: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ],
    }
   }else if(type=="category"){
    searchQuery = {
    categoryName: { $regex: query, $options: "i" },
    }
   }else if(type=="users"){
    searchQuery = {
    $or: [
    { name: { $regex: query, $options: "i" } },
    { email: { $regex: query, $options: "i" } },
   ],
   }
   }else{
    return res.status(400).json({ error: "Invalid search type" })
   }

   //finding results
    if (type === "products") {
      let products = await Product.find(searchQuery).sort({
        createdAt: -1,
        }).skip(skip)
        .limit(limit) 

        const totalProducts=await Product.countDocuments(searchQuery)
        const totalPages=Math.ceil(totalProducts/limit)

      res.render("admin/productManagement", {
        title: "Product Management",
        currentPage:page||1,
        totalPages,
        products,
        successMessage: res.locals.successMessage || "",
        errorMessage: res.locals.errorMessage || "",
      })
     } else if (type === "categories") {
      const totalCategory=await Category.countDocuments(searchQuery)
      const totalPages=Math.ceil(totalCategory/limit)

      let categories = await Category.find(searchQuery);
      res.render("../views/admin/categoryManagement", {
        categories,
        totalCategory,
        currentPage:page||1,
        totalPages,
        title: "Category Manamgement",
        successMessage: res.locals.successMessage[0] || "",
        errorMessage: res.locals.errorMessage[0] || "",
      });

    } else if (type === "users") {
      let users = await User.find(searchQuery).skip(skip)
      .limit(limit) ;
      const totalUsers=await User.countDocuments(searchQuery)
      const totalPages=totalUsers/limit

      res.render('../views/admin/userManagement',
        {users,title:"User Management",
          totalPages,
          currentPage:page||1,

          successMessage: res.locals.successMessage||'',
          errorMessage:  res.locals.errorMessage||''
        })
    }
    
    
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
    console.log(error +'error');
    
  }
};

//admin get order page


const getOrder=async(req,res)=>{

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
let page=parseInt(req.query.page)||1
limit=parseInt(req.query.limit) ||5
let skip=(page-1)*limit
console.log(`page is ${page} and limt is ${limit}`);

const totalOrders=await Order.countDocuments()
const totalPages=Math.ceil(totalOrders/limit)

// const pagination = {
//   currentPage: 1,
//   totalPages: 3
// };
  
    const orders=await Order.find().populate('userId').sort({createdAt:-1}).skip(skip).limit(limit)
    console.log('orders are ',orders);
    return res.render('admin/orders',{
      title:"Admin Orders",
     adminUser,
     filter,
     orders,
     currentPage:page,
     
     totalPages
     })
  } catch (error) {
    console.log('error in fetching orders',error);
    res.json({success:false,message:"Order fetching failed"})
  }
}

//get order details

const getOrderDetails=async (req,res)=>{
  console.log('from admin get order details');
  const orderId=req.params.orderId
  const order=await Order.findOne({_id:orderId}).populate('items.productId')
  if(!order){
    console.log('order not found');
    res.json({success:false,message:"Order not found"})
  }
  const userId=order.userId
  console.log('user Id is ',userId);
  
  const user=await User.findOne({_id:userId})
  if(!user){
    console.log('user not found');
    res.json({success:false,message:"User not found"})
  }
  res.render('admin/adminViewOrder',{
    user,
    order,

  })
  
}

//get ipdate order
const getUpdateOrder=async (req,res)=>{
console.log('from admin order update route');
 try {
  const orderId=req.params.orderId
  const order=await Order.findOne({_id:orderId}).populate('items.productId')
  if(!order){
    console.log('order not found');
    res.json({success:false,message:"Order not found"})
  }
 
 
  res.render('admin/adminEditOrder',{
   order,

  })
 } catch (error) {
  console.log(error);
  res.json({success:false,message:"Order not found"})
 }
}

//post update user
const postUpdateOrder=async (req,res)=>{
console.log('from post update order');
const formObject=req.body
const orderId=formObject.orderId
const order=await Order.findOne({_id:orderId})
if(!order){
  console.log('order not found');
  return res.json({success:false,message:"Order not found"})
}
order.status=formObject.status
await order.save()
console.log("order staus updated succesfully");
return res.json({success:true,message:"order staus updated succesfully"})

}

//admin delete order
const deleteOrder=async (req,res)=>{
console.log('from admin order delete route');

try {
  const orderId=req.params.orderId
 if(!orderId){
  console.log('Order id is not found');
 
  return res.json({success:false,message:"Order id is not found"})
 }
  const order=await Order.findOne({_id:orderId}).populate('items.productId')
  
  if(!order){
    console.log('order not found');
    
    return res.json({success:false,message:"order not found"})
  }
  if(order.status=='cancelled'){
    console.log('order already cancelled');
    
    return res.json({success:false,message:"order already cancelled"})
  }
  order.status='cancelled'
   await order.save()

   console.log("order cancelled successfully");

   //restore the stock
 
   for(item of order.items){
    const product=await Product.findById(item.productId)
    console.log(`before restoring ${product.productName} is ${product.stock}`);
    
    product.stock=product.stock+item.quantity
    await product.save()
    console.log(`after restoring ${product.productName} is ${product.stock}`);
    
   }
   
   return res.json({success:true,message:"order cancelled successfully"})
} catch (error) {
  console.log("error in fetching order");
  return res.json({success:false,message:"error in fetching order"})
}
}

//admin logout
const postLogout=async (req,res)=>{
  console.log('from admin logout route');
  req.session.admin = null;
  console.log('admin in session is ',req.session.admin );
  return res.json({success:true,message:"Admin logouted successfully"})
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
  postLogout
};
