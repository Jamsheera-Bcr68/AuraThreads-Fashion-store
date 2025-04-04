const express = require("express");
const multer = require("multer");
const path = require("path");
const Product = require("../model/productModel"); // Import the Product model
const { default: mongoose } = require("mongoose");
const category = require("../model/categoryModel");
const { title } = require("process");
const adminController = require("../controllers/adminController");
const sharp = require("sharp");
const User=require('../model/userModel')
const Cart=require('../model/cartModel')
const fs=require('fs')

const router = express.Router();

//Admin  product management
router.get("/products", async (req, res) => {
  
  try {
   let page=parseInt(req.query.page)||1
    limit=parseInt(req.query.limit) ||5
    let skip=(page-1)*limit

    console.log(`page is ${page} and limt is ${limit}`);
    const products = await Product.find({ isDeleted: false }).sort({
    createdAt: -1,
    }).skip(skip)
    .limit(limit)

    const totalProducts=await Product.countDocuments({isDeleted:false})
    const totalPages=Math.ceil(totalProducts/limit)

   
   

    res.render("admin/productManagement", {
      title: "Product Management",
      currentPage:page,
      totalPages,
     
      products,
      successMessage: res.locals.successMessage || "",
      errorMessage: res.locals.errorMessage || "",
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/admin/dashboard");
  }
});

// Add Product Page
router.get("/products/add", async (req, res) => {
  const categories = await category.find({ isDeleted: false });
  res.render("../views/admin/addProduct", {
    title: " Add Product",
    categories,
  });
});


const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `cropped-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Upload route for images
router.post('/upload', upload.array('image'), (req, res) => {
    console.log('Multiple image upload route hit');
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }
    
    const filePaths = req.files.map(file => `/uploads/${file.filename}`);
    
    console.log('Uploaded file paths:', filePaths);
    
    res.json({ filePaths });
});

// Product add route with full multer handling
router.post('/products/add', upload.fields([
    { name: 'imageInput', maxCount: 10 },
    { name: 'uploadedImages', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Add product route hit');
        console.log('Request Files:', req.files);
        console.log('Request Body:', req.body);

        const {
            productName,
            stock,
            price,
            description,
            categoryId,
            color,
            size,
            brand,
            isActive,
            isListed,
            uploadedImages
        } = req.body;

        // Validate required fields
        if (!productName || !price || !description || !categoryId) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        const existProduct=await Product.findOne({productName})
        if(existProduct){
          return res.json({success:false,message:'product already exists'})
        }
        // Parse uploaded images
        let imagePaths = [];
        try {
            if (uploadedImages) {
                // Try parsing if it's a JSON string
                imagePaths = JSON.parse(uploadedImages);
            }
            
            // If files were uploaded via imageInput, add those paths
            // if (req.files && req.files.imageInput) {
            //     const additionalPaths = req.files.imageInput.map(file => `/uploads/${file.filename}`);
            //     imagePaths = [...imagePaths, ...additionalPaths];
            // }
        } catch (parseError) {
            console.error('Error parsing uploaded images:', parseError);
        }

        // Ensure imagePaths is an array
        if (!Array.isArray(imagePaths)) {
            imagePaths = [];
        }

        // Create new product
        const newProduct = new Product({
            productName,
            price,
            description,
            categoryId,
            size,
            color,
            isActive: isActive === 'true',
            isListed: isListed === 'true',
            brand,
            stock: parseInt(stock),
            images: imagePaths, // Store the image paths
        });

        // Save product
        await newProduct.save();
        console.log("New Product saved:", newProduct);

        res.status(201).json({
            message: 'Product added successfully!',
            product: newProduct
        });
    } catch (error) {
        console.error('Product add error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});


//edit product admin
router.get("/products/edit/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    // Getting the product
    const product = await Product.findOne({ _id: productId });
    const categories = await category.find({ isDeleted: false });
   
    if (!product) {
      req.flash("errorMessage", "Product not found");
      res.redirect("/admin/productManagement");
    } else {
      res.render("admin/editProduct", {
        title: "Edit Product Page",
        product,
        categories,
      });
    }
  } catch (error) {
    console.log("Error when fetching details:", error);
    req.flash("errorMessage", "Something went wrong");
    res.redirect("/admin/productManagement");
  }
});

// admin post edit product
router.post(
  "/products/edit/:productId",
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!req.body) {
        throw new Error("Request body is empty");
      }

      const imagePaths = req.files.map((file) =>'/uploads/'+ file.filename);
      console.log('imagepath ',imagePaths);
       // Extract image filenames
      const { productName, categoryId, price, description } = req.body;
      const { productId } = req.params;

      console.log("This is req.body:", JSON.stringify(req.body, null, 2));
      console.log("Product name is:", productName);
      console.log("Product ID is:", productId);

      const productToUpdate = await Product.findOne({ _id: productId });
      if (!productToUpdate) {
        req.flash("errorMessage", "No product found");
        return res.redirect("/product/products");
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId },
        { $set: { productName, categoryId, description, price, images:imagePaths } },
        { new: true }
      );

      console.log("Updated Product:", updatedProduct);
      req.flash("successMessage", "Product Updated Successfully");
      return res.redirect("/product/products");
    } catch (error) {
      console.error("Error updating product:", error);
      req.flash("errorMessage", "Product not found");
      return res.redirect("/product/products");
    }
  }
);

//admin product delete function
router.delete("/products/delete/:productId", async (req, res) => {
  console.log("from product delete route");

  const { productId } = req.params;

  try {
    const deleteProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { isDeleted: true },
      { new: true }
    );
    if (!deleteProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
      // req.flash('errorMessage','product not found')
      // res.redirect('/product/products')
    }

    const products = await Product.find({ isDeleted: true });

    console.log(products);

    console.log("Product deleted succesfully");
    res.json({ success: true, message: "Product deleted successfully" });
    // req.flash('succesMessage',"product de'ted succesfuly")
    // res.redirect('/product/products')
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    // req.flash('error when deleting product')
    // res.redirect('/product/products')
  }
});

//get single product user
router.get("/products/:productId", async (req, res) => {
  const { productId } = req.params;
  console.log("productId is equal to " + productId);

  try {
    const singleProduct = await Product.findOne({
      isDeleted: false,
      _id: productId,
    });

    if (!singleProduct) {
      console.log("No product found");
      return res
        .status(404)
        .render("user/error", { message: "Product not found" });
    }

    singleProduct.images = singleProduct.images.map((image) =>
      image.replace(/\\/g, "/")
    );
  
    
    //get related products
     const relatedProducts=await Product.find({isDeleted:false,categoryId:singleProduct.categoryId}).limit(3)
     relatedProducts.forEach(product=>{
      product.images=product.images.map(image=>image.replace(/\\/g, '/'))
    })
     console.log('related images'+relatedProducts[0].images);
     
     
    console.log(relatedProducts +' related products');

    //get cart count
       let cartCount=0
       if(req.session.user){
        const userId=req.session.user._id
        const cart=await Cart.findOne({userId})
        if(cart){
          cartCount=cart.items.length 
          console.log('cart count is ',cartCount);
        }else{
          console.log('cart not fount');
          
        }
       }
        
        
    
    res.render("user/sproduct", {
      title: "Product Details Page",
      singleProduct,
      relatedProducts,
      categoryId:'',
      priceRange:'',
      cartCount,
      user:req.session.user||'',
      sort:'',query:''
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res
      .status(500)
      .render("user/error", {
        message: "Something went wrong. Please try again.",
      });
  }
});
//get product listing page
router.get('/productList', async (req, res) => {
  console.log('product listing page');
  
  
  const categoryId = req.query.categoryId || null;
  
  try {
    // if(userId){
    //   const user=await User.findOne({_id:mongoose.Types.ObjectId(userId)})
    // }
    const {query}=req.query
    console.log(`query is ${query}`);
    
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const priceRange = req.query.priceRange || '';
    const sort = req.query.sort || '';
    
    // Category based filter
    const filter = {isDeleted: false};
    let selectedCategories = [];
    let categoryTitle = 'Show All Products'; // Default title
    
    if (categoryId) {
      // Handle both single category ID and comma-separated list
      selectedCategories = Array.isArray(categoryId)
        ? categoryId
        : categoryId.includes(',')
          ? categoryId.split(',')
          : [categoryId];
          
      // Convert string IDs to ObjectId
      filter.categoryId = {
        $in: selectedCategories.map(id => new mongoose.Types.ObjectId(id))
      };
      
      // If you still want to display a category name in the title, but only when a single category is selected
      if (selectedCategories.length === 1) {
        // Only get the category name if there's exactly one category selected
        const singleCategory = await category.findOne({ _id: new mongoose.Types.ObjectId(selectedCategories[0]) });
        if (singleCategory) {
          categoryTitle = `${singleCategory.categoryName} Clothing`;
        }
      } else if (selectedCategories.length > 1) {
        // Multiple categories selected
        categoryTitle = 'Multiple Categories';
      }
    }
    
    
    
    // Price range based filtering
    let selectedPriceRange = priceRange || "";
    if (selectedPriceRange) {
      let [min, max] = selectedPriceRange.split("-").map(Number);
      filter.price = { $gte: min, $lte: max };
    }
    //searchbased fitering
    if (query) {
      filter.$or = [
        { productName: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ];
    }
    
    // Sorting based on sortOption
    let sortOption = {};
    if (sort == 'newest') {
      sortOption.createdAt = -1;
    } else if (sort == 'lowToHigh') {
      sortOption.price = 1;
    } else if (sort == 'highToLow') {
      sortOption.price = -1;
    } else if (sort == 'az') {
      sortOption.productName = 1;
    } else if (sort == 'za') {
      sortOption.productName = -1; // Fixed: this was price=-1 in your code
    }
    
    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);
      
    // Fix image paths
    products.forEach(product => {
      product.images = product.images.map(image => image.replace(/\\/g, "/"));
    });
    
    // Get all categories for the filter options
    const categories = await category.find({isDeleted: false});
    
    // Get total count of products for pagination
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    //get cart count
       let cartCount=0
       if(req.session.user){
        const userId=req.session.user._id

        const cart=await Cart.findOne({userId})
        if(cart){
          cartCount=cart.items.length 
          console.log('cart count is ',cartCount);
        }else{
          console.log('cart not fount');
          
        }
       }
       
    
    res.render('user/productList', {
      products,
      categoryId: categoryId || null,
      categories,
      sort: sort || null,
      priceRange: priceRange || null,
      title: categoryTitle,
      currentPage: page,
      totalPages,
      user:req.session.user||'',
      selectedCategories,
      selectedPriceRange,
      cartCount,
      query: req.query.query || "",
      type: req.query.type || "products",
    });
    
  } catch (error) {
    console.log('error in fetching products: ' + error);
    return res.redirect('/user/home');
  }
});

module.exports = router;
