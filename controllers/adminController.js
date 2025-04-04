// controllers/adminController.js
const Admin = require("../model/adminModel");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const router = require("../routes/product");

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
    const { query ,type} = req.query;

    console.log(`Search Query: ${query}, Type: ${type}`)
    
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
      let products = await Product.find(searchQuery);
      res.render("admin/productManagement", {
        title: "Product Management",
  
        products,
        successMessage: res.locals.successMessage || "",
        errorMessage: res.locals.errorMessage || "",
      })
     } else if (type === "categories") {
      let categories = await Category.find(searchQuery);
      res.render("../views/admin/categoryManagement", {
        categories,
        title: "Category Manamgement",
        successMessage: res.locals.successMessage[0] || "",
        errorMessage: res.locals.errorMessage[0] || "",
      });

    } else if (type === "users") {
      let users = await User.find(searchQuery);
      res.render('../views/admin/userManagement',
        {users,title:"User Management",
          successMessage: res.locals.successMessage||'',
          errorMessage:  res.locals.errorMessage||''
        })
    }
    
    
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
    console.log(error +'error');
    
  }
};

module.exports = {
  getLogin,
  postLogin,
  getCategory,
  getProducts,
  getUsers,
  getAddProducts,
  searchProducts,
};
