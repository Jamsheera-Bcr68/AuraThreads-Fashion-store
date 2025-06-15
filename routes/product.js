const express = require("express");
const multer = require("multer");
const path = require("path");
const Product = require("../model/productModel"); // Import the Product model
const { default: mongoose } = require("mongoose");
const category = require("../model/categoryModel");
const { title } = require("process");
const adminController = require("../controllers/adminController");
const sharp = require("sharp");
const User = require("../model/userModel");
const Cart = require("../model/cartModel");
const fs = require("fs");

const router = express.Router();

//Admin  product management
router.get("/products", async (req, res) => {
  try {
    const query = req.query.query || "";
    console.log("Query is ", query);

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    //search
    let searchQuery = { isDeleted: false };

    // If query is not empty, apply $regex search
    if (query.trim()) {
      searchQuery = {
        $and: [
          {
            $or: [
              { productName: { $regex: query, $options: "i" } },
              { category: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          },
          { isDeleted: false },
        ],
      };
    }
    console.log(`page is ${page} and limt is ${limit}`);
    const products = await Product.find(searchQuery)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .populate("categoryId");

    const totalProducts = await Product.countDocuments({
      $and: [searchQuery, { isDeleted: false }],
    });
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("admin/productManagement", {
      title: "Product Management",
      currentPage: page || 1,
      totalPages,
      query: query || "",
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
  res.render("admin/addProduct", {
    title: " Add Product",
    categories,
  });
});

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `cropped-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Upload route for images
router.post("/upload", upload.array("image"), (req, res) => {
  console.log("Multiple image upload route hit");

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const filePaths = req.files.map((file) => `/uploads/${file.filename}`);

  console.log("Uploaded file paths:", filePaths);

  res.json({ filePaths });
});

// Product add route with full multer handling
router.post(
  "/products/add",
  upload.fields([
    { name: "imageInput", maxCount: 10 },
    { name: "uploadedImages", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("Add product route hit");
      console.log("Request Files:", req.files);
      console.log("Request Body:", req.body);

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
        uploadedImages,
      } = req.body;

      // Validate required fields
      if (!productName || !price || !description || !categoryId) {
        return res
          .status(400)
          .json({ message: "All required fields must be filled" });
      }

      const existProduct = await Product.findOne({ productName });
      if (existProduct) {
        return res.json({ success: false, message: "product already exists" });
      }
      // Parse uploaded images
      let imagePaths = [];
      try {
        if (uploadedImages) {
          // Try parsing if it's a JSON string
          imagePaths = JSON.parse(uploadedImages);
        }

        
      } catch (parseError) {
        console.error("Error parsing uploaded images:", parseError);
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
        isActive: isActive === "true",
        isListed: isListed === "true",
        brand,
        stock: parseInt(stock),
        images: imagePaths, // Store the image paths
      });

      // Save product
      await newProduct.save();
      console.log("New Product saved:", newProduct);

      res.status(201).json({
        success:true,
        message: "Product added successfully!",
        product: newProduct,
      });
    } catch (error) {
      console.error("Product add error:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },
);

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
      console.log('req.body',req.body)
      
      if (!req.body) {
        throw new Error("Request body is empty");
      }

      const imagePaths = req.files.map((file) => "/uploads/" + file.filename);
      console.log("imagepath ", imagePaths);

      // Extract image filenames
      const { productName, categoryId, price, description, stock } = req.body;
      const { productId } = req.params;

      console.log("This is req.body:", JSON.stringify(req.body, null, 2));
      console.log("Product name is:", productName);
      console.log("Product ID is:", productId);
      console.log("Product stock is:", stock);

      const productToUpdate = await Product.findOne({ _id: productId });
      if (!productToUpdate) {
        console.log('product not found');
        
       return res.json({success:false,message:'Product Not Fount'})
       
      }
      let images;
      if (imagePaths == "") {
        images = productToUpdate.images;
      } else {
        images = imagePaths;
      }
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId },
        {
          $set: { productName, categoryId, description, price, images, stock },
        },
        { new: true },
      );

      console.log(" product updated, Updated Product:", updatedProduct);
      return res.json({success:true,message: "Product Updated Successfully"})
    
    } catch (error) {
      console.error("Error updating product:", error);
     console.log('error in fetching products');
        
       return res.json({success:false,message:'Server error'})
    }
  },
);

//admin product delete function
router.delete("/products/delete/:productId", async (req, res) => {
  console.log("from product delete route");

  const { productId } = req.params;

  try {
    const deleteProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { isDeleted: true },
      {isActive:false},
      {isListed:false},
      { new: true },
    )
    console.log('deleted product',deleteProduct);
    
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

module.exports = router;
