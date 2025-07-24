const Product = require('../model/productModel')
const path = require('path')
const multer = require("multer");
const sharp = require("sharp");
const StatusCodes = require('../utils/statusCodes');
const statusMessages = require('../utils/statusMessages')
const Category = require('../model/categoryModel')
const Variant = require('../model/variantModel')
const fs = require('fs')
const mongoose = require('mongoose');
const { title } = require('process');
const { json } = require('body-parser');
const WishList=require('../model/wishListModel')
const Cart=require('../model/cartModel')
const Offer=require('../model/offerModel')



const getProducts = async (req, res) => {
  try {
    const query = req.query.query || "";
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    let searchQuery = { isDeleted: false };

    if (query.trim()) {
      searchQuery = {
        $and: [
          {
            $or: [
              { productName: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          },
          { isDeleted: false },
        ],
      };
    }
    // const products = await Variant.aggregate([
    //   {
    //     $lookup: {
    //       from: "products",
    //       localField: "productId",
    //       foreignField: "_id",
    //       as: "product"
    //     }
    //   },
    //   { $unwind: "$product" }, // Flatten product

    //   {
    //     $lookup: {
    //       from: "categories",
    //       localField: "product.categoryId",
    //       foreignField: "_id",
    //       as: "category"
    //     }
    //   },
    //   {
    //     $unwind: {
    //       path: "$category",
    //       preserveNullAndEmptyArrays: true
    //     }
    //   },

    //   // Optional: apply search on product name or description
    //   {
    //     $match: {
    //       $and: [
    //         {
    //           $or: [
    //             { "product.productName": { $regex: query, $options: "i" } },
    //             { "product.description": { $regex: query, $options: "i" } }
    //           ]
    //         },
    //         { "product.isDeleted": false }
    //       ]
    //     }
    //   },

    //   { $sort: { "product.createdAt": -1 } },
    //   { $skip: skip },
    //   { $limit: limit }
    // ]);

    const products = await Variant.aggregate([
      
      {
        $sort: { createdAt: -1 } 
      },
      {
        $group: {
          _id: "$productId",
          variantId: { $first: "$_id" },
          color: { $first: "$color" },
          size: { $first: "$size" },
          stock: { $first: "$stock" },
          images: { $first: "$images" },
          productId: { $first: "$productId" },
          createdAt: { $first: "$createdAt" }
        }
      },

      // Lookup product info
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },

      // Lookup category info
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true
        }
      },

      // Search filter
      {
        $match: {
          $and: [
            {
              $or: [
                { "product.productName": { $regex: query, $options: "i" } },
                { "product.description": { $regex: query, $options: "i" } }
              ]
            },
            { "product.isDeleted": false }
          ]
        }
      },

      // Sort + Pagination
      { $sort: { "product.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

     

    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find({ isDeleted: false });

    res.render("admin/productManagement", {
      title: "Product Management",
      currentPage: page,
      totalPages,
      query,
      products,
      categories,
      thisPage: "products",
      successMessage: res.locals.successMessage || "",
      errorMessage: res.locals.errorMessage || "",
    });

  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: statusMessages.SERVER_ERROR
    });
  }
};




const getAddProduct = async (req, res) => {

  const categories = await Category.find({ isDeleted: false });
  try {
    res.render("admin/addProduct", {
      title: " Add Product",
      categories,
      thisPage: 'products'
    });
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}


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


const uploadImages = async (req, res) => {
  console.log("Multiple image upload route hit");

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }


  const filePaths = req.files.map((file) => `/uploads/${file.filename}`);
  if (filePaths.length == 0) {
    console.log('Images are not entered');
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Images are not uploaded" })
  }

  console.log("Uploaded file paths:", filePaths);

  res.json({ filePaths });
}



const postAddProduct = async (req, res) => {
  console.log('postAddProduct');
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
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "All required fields must be filled" });
    }
    if (!color || !size || stock === undefined) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Variant color, size, and stock are required.'
      });
    }



    if (price < 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Price sgould not less than zero' })
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
    if (imagePaths.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please upload at least one image."
      });
    }

    //check whether the product is exist or not 
    let productId;
    const existProduct = await Product.findOne({ productName });
    if (existProduct) {
      productId = existProduct._id
      //  Check if the same variant already exists
      const existingVariant = await Variant.findOne({
        productId,
        color,
        size
      });

      if (existingVariant) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Variant with the same color and size already exists for this product"
        });
      }


    } else {
      // Create new product
      const newProduct = new Product({
        productName,
        price,
        description,
        categoryId,
        brand,
        isListed: isListed === 'true',
        isActive: isActive === 'true',
      });

      // Save product
      await newProduct.save();
      console.log("New Product saved:", newProduct);
      productId = newProduct._id
    }


    //saving variant in both cases

    const newVariant = new Variant({
      productId,
      color,
      size,
      images: imagePaths,
      stock: parseInt(stock),
      isActive: isActive === 'true',
      isListed: isListed === 'true',
      categoryId
    })
    await newVariant.save()
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: statusMessages.CREATED("Product")

    });
  } catch (error) {
    console.error("Product add error:", error);
    res.status(StatusCodes.SERVER_ERROR).json({
      message: statusMessages.SERVER_ERROR,
      error: error.message,
    });
  }

}

const getEditProduct = async (req, res) => {
  console.log('getEditProduct');
  try {
    const { productId } = req.params;
    console.log(productId);


    // Getting the product
    const product = await Product.findOne({ _id: productId })
    const categories = await Category.find({ isDeleted: false });

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Product') })

    } else {
      //get all variants of the product
      const variants = await Variant.find({ productId });

      res.render("admin/editProduct", {
        title: "Edit Product Page",
        product,
        categories,
        variants,
        thisPage: 'products'
      });
    }
  } catch (error) {
    console.log("Error when fetching details:", error);
    return res.status(StatusCodes.SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}

const postEditProduct = async (req, res) => {
  console.log('post edit product  edit');
  try {
    console.log('req.body', req.body)

    if (!req.body) {
      throw new Error("No product data ");
    }


    // Extract image filenames
    let { productName, brand, categoryId, price, description, stock } = req.body;
    const { productId } = req.params;
    categoryId = new mongoose.Types.ObjectId(categoryId)

    console.log("This is req.body:", JSON.stringify(req.body, null, 2));
    console.log("Product name is:", productName);
    console.log("Product ID is:", productId);
    console.log("Product stock is:", stock);

    const productExist = await Product.findOne({ productName, _id: { $ne: new mongoose.Types.ObjectId(productId) } })
    if (productExist) {
      console.log('product exist');
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: statusMessages.EXISTS("Product") })
    }

    const productToUpdate = await Product.findOne({ _id: productId });
    if (!productToUpdate) {
      console.log('product not found');

      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND })

    }

    const isActive = req.body.isActive ? true : false
    const isListed = req.body.isListed ? true : false
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      {
        $set: { productName, categoryId, description, brand, price, stock, isActive, isListed },
      },
      { new: true },
    );

    await Variant.updateMany(
      { productId: new mongoose.Types.ObjectId(productId) },
      {
        $set: {
          productName,
          price,
          brand, description, categoryId
        }
      }
    );

    console.log(" product updated, Updated Product:", updatedProduct);
    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.UPDATED('Product'), updatedProduct })

  } catch (error) {
    console.error("Error updating product:", error);
    console.log('error in fetching products');

    return res.status(StatusCodes.SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}

const deleteProduct = async (req, res) => {
  console.log('deleteProduct');
  const { productId } = req.params;

  try {
    const deletedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { $set: { isDeleted: true, isActive: false, isListed: false } },
      { new: true }
    );
    console.log('deleted product', deleteProduct);

    if (!deleteProduct) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: statusMessages.NOT_FOUND("Product") });

    }

    const products = await Product.find({ isDeleted: true });

    console.log(products);

    const variants = await Variant.find({ productId: new mongoose.Types.ObjectId(productId) })

    await Variant.updateMany(
      { productId: new mongoose.Types.ObjectId(productId) },
      { $set: { isDeleted: true } }
    );

    console.log("Product deleted succesfully");
    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.DELETED("Product") });

  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(StatusCodes.SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });

  }
}


const getAdminProduct = async (req, res) => {
  console.log('get admin product');

  try {
    const productId = req.params.productId
    if (!productId) {
      console.log('productid notfound');
      return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.NOT_FOUND(" product id") })
    }
    const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(productId) })
    if (!product) {
      console.log('product notfound');
      return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.NOT_FOUND(" product ") })
    }
    //get categories
    const categories = await Category.find({ isDeleted: false })
    return res.status(StatusCodes.OK).json({ success: true, product, categories })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: true, message: statusMessages.SERVER_ERROR })
  }
}


module.exports = {
  getProducts,
  getAddProduct,
  postAddProduct,
  uploadImages,
  getEditProduct,
  postEditProduct,
  deleteProduct,
 getAdminProduct,
}