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
      // Group by productId to get only one variant per product
      {
        $sort: { createdAt: -1 } // sort if you want to pick the first variant
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

    // console.log(products);


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

// const getvariants=async(req,res)=>{
//   console.log('getvariants');
//   try {
//     const productId=req.params.productId
//     console.log('productId',productId);

//    const variants = await Variant.aggregate([
//   {
//     $match: {
//       productId: new mongoose.Types.ObjectId(productId),
//       isDeleted: false
//     }
//   },

//   // Lookup product
//   {
//     $lookup: {
//       from: "products",
//       localField: "productId",
//       foreignField: "_id",
//       as: "product"
//     }
//   },
//   { $unwind: "$product" },

//   // Lookup category from product.categoryId
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
//   }
// ]);

//     console.log(variants);
//     console.log('variants.length',variants.length);

//     const categories=await Category.find({sDeleted:false})
//     const products=await Product.find({isDeleted:false})

//     res.render('admin/variant',{
//       title:"View Variants",
//       categories,
//       variants,
//       products,
//       thisPage:'products'
//     })

//   } catch (error) {
//     console.log(error);
//     return res.status(StatusCodes.SERVER_ERROR).json({success:false,message:statusMessages.SERVER_ERROR})
//   }
// }
const getVariants = async (req, res) => {
  console.log('getVariants');
  try {
    const limit = parseInt(req.query.limit) || 5
    const page = parseInt(req.query.page) || 1
    const skip = limit * (page - 1)

    const productId = req.params.productId;
    console.log('productId:', productId);

    const categoryId = req.params.categoryId;
    console.log('categoryid:', categoryId);

    //get variant count
    // First: total count
    const totalVariants = await Variant.countDocuments({
      productId: new mongoose.Types.ObjectId(productId),
      isDeleted: false
    });

    const variants = await Variant.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
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
      }, { $sort: { createdAt: -1 } },
      { $skip: skip }, { $limit: limit }
    ]);


    const totalPages = Math.ceil(totalVariants / limit)
    console.log('totalVariants', totalVariants);

    const categories = await Category.find({ isDeleted: false });
    const products = await Product.find({ isDeleted: false });

    res.render('admin/variant', {
      title: "View Variants",
      categories,
      variants,
      products,
      productId,
      categoryId,
      thisPage: 'products',
      currentPage: page, limit, skip, totalPages
    });

  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: statusMessages.SERVER_ERROR
    });
  }
}



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

const addVariant = async (req, res) => {
  console.log('addVariant');

  try {
    console.log(req.files);

    const productId = req.body.productId
    console.log(productId);
    const categoryId = req.body.categoryId
    console.log('categoryId', categoryId);

    const { color, size, stock } = req.body
    console.log('color,size,stock,isActive,isListed', color, size, stock,);

    const images = req.files?.map(file => `/uploads/${file.filename}`) || [];
    console.log(images);

    const variantExist = await Variant.findOne({ productId: new mongoose.Types.ObjectId(productId), color, size })
    console.log(variantExist);


    if (variantExist) {
      console.log('Varient exist', statusMessages.EXISTS('Varient'));
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: statusMessages.EXISTS('Varient') })
    }
    if (images.length == 0) {
      console.log('Images not entered');
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: statusMessages.REQUIRED('Images ') })
    }
    if (!color) {
      console.log('color not entered');
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: statusMessages.REQUIRED('Color ') })
    }
    if (!size) {
      console.log('Size not entered');
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: statusMessages.REQUIRED('Size ') })
    }
    if (!stock) {
      console.log('Stock not entered');

      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: statusMessages.REQUIRED('Stock ') })
    }

    const isListed = req.body.isListed ? true : false;
    const isActive = req.body.isActive ? true : false;
    const createdAt = new Date()
    const newVariant = new Variant({
      productId: new mongoose.Types.ObjectId(productId),
      color,
      size, stock, images, categoryId, isActive, isListed, createdAt
    })
    await newVariant.save()
    console.log('new varint saved');
    console.log(statusMessages.CREATED("Variant"))

    const populatedVariant = await Variant.findById({ _id: newVariant._id })
      .populate('productId')
      .populate('categoryId');



    return res.status(StatusCodes.CREATED).json({ success: true, message: statusMessages.CREATED("Variant"), newVariant: populatedVariant })

  } catch (error) {
    console.log(statusMessages.SERVER_ERROR);

    console.log(error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }

}
const getVariant = async (req, res) => {
  console.log('getVariant');

  const variantId = req.params.variantId
  if (!variantId) {
    console.log('varient id not found');
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Varient Id') })
  }
  const variant = await Variant.findOne({ _id: new mongoose.Types.ObjectId(variantId) })
  console.log(variant);
  if (!variant) {
    console.log('varient not found');
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Varient') })
  }

  return res.status(StatusCodes.OK).json({ success: true, message: 'varient found', variant })
}
const editVariant = async (req, res) => {
  console.log('editVariant');
  try {
    const variantId = req.params.variantId

    const productId = req.body.productId
    console.log('productId', productId);




    const variant = await Variant.findOne({ _id: new mongoose.Types.ObjectId(variantId) })
    console.log(variant);
    if (!variant) {
      console.log('varient not found');
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Varient') })
    }



    const { stock, size, color } = req.body

    const variantExist = await Variant.findOne({ productId: new mongoose.Types.ObjectId(productId), color, size, _id: { $ne: new mongoose.Types.ObjectId(variantId) } })
    console.log('variantExist', variantExist);


    if (variantExist) {
      console.log('Varient exist', statusMessages.EXISTS('Varient'));
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: statusMessages.EXISTS('Varient') })
    }

    if (!color || !size) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Color and size are required"
      });
    }

    const isActive = req.body.isActive ? true : false
    const isListed = req.body.isListed ? true : false
    let images = req.files?.map(file => `/uploads/${file.filename}`)
    if (images.length == 0) {
      images = variant.images
    }
    console.log(images);
    variant.color = color || variant.color
    variant.size = size || variant.size
    variant.images = images
    variant.stock = stock || variant.stock
    variant.isActive = isActive
    variant.isListed = isListed
    await variant.save()

    const populatedVariant = await Variant.findById({ _id: variant._id })
      .populate('productId')
      .populate('categoryId');

    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.UPDATED("Variant"), variant: populatedVariant })
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}

const deleteVariant = async (req, res) => {
  console.log('Delete varient');
  try {
    const variantId = req.params.variantId
    if (!variantId) {
      console.log('No variant id');

      return res.status(StatusCodes.NOT_FOUND), json({ success: false, message: statusMessages.NOT_FOUND("variant Id") })
    }

    const variant = await Variant.findOne({ _id: new mongoose.Types.ObjectId(variantId) })
    if (!variant) {
      console.log(' variant id');

      return res.status(StatusCodes.NOT_FOUND), json({ success: false, message: statusMessages.NOT_FOUND("variant ") })
    }

    variant.isDeleted = true
    await variant.save()

    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.DELETED("Variant") })
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR), json({ success: false, message: statusMessages.SERVER_ERROR })
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

//userside

const getProductList = async (req, res) => {
  console.log("from user product list");
  const categoryId = req.query.categoryId || null;
  console.log("categoryId", categoryId);
  try {
    const { query } = req.query;
    console.log(`query is ${query}`);

    const page = parseInt(req.query.page) || 1;
    console.log('page',page);
    
    const limit = 6;
    const skip = (page - 1) * limit;
    const priceRange = req.query.priceRange || "";
    const sort = req.query.sort || "";

    // Category based filter
    const filter = { isDeleted: false };
    let selectedCategories = [];
    let categoryTitle = "Show All Products"; // Default title

    if (categoryId) {
      // Handle both single category ID and comma-separated list
      selectedCategories = Array.isArray(categoryId)
        ? categoryId
        : categoryId.includes(",")
          ? categoryId.split(",")
          : [categoryId];

      // Convert string IDs to ObjectId
      filter.categoryId = {
        $in: selectedCategories.map((id) => new mongoose.Types.ObjectId(id)),
      };

      //  display a category name in the title, but only when a single category is selected
      if (selectedCategories.length === 1) {
        // Only get the category name if there's exactly one category selected
        const singleCategory = await Category.findOne({
          _id: new mongoose.Types.ObjectId(selectedCategories[0]),
        });
        if (singleCategory) {
          categoryTitle = `${singleCategory.categoryName} Clothing`;
        }
      } else if (selectedCategories.length > 1) {
        // Multiple categories selected
        categoryTitle = "Multiple Categories";
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
        { description: { $regex: query, $options: "i" } },
      ];
    }

    // Sorting based on sortOption
    let sortOption={}
    if (sort == "newest") {
      sortOption.createdAt = -1;
    } else if (sort == "lowToHigh") {
      sortOption.price = 1;
    } else if (sort == "highToLow") {
      sortOption.price = -1;
    } else if (sort == "az") {
      sortOption.productName = 1;
    } else if (sort == "za") {
      sortOption.productName = -1; // Fixed: this was price=-1 in your code
    }else{
      sortOption.createdAt = -1;
    }

   
    const products = await Product.aggregate([
  {
    $match:filter
  },
  {
    $lookup: {
      from: 'variants',
      let: { productId: '$_id' }, // pass the local _id as productId
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$productId', '$$productId'] }, // match productId
                { $eq: ['$isDeleted', false] }          // AND variant is not deleted
              ]
            }
          }
        },{ $limit: 1 }
      ],
      as: 'mainVariant'
    }
  },
  {
    $unwind: {
      path: '$mainVariant',
      preserveNullAndEmptyArrays: true
    }
  },{$sort:sortOption},
  
 {$skip:skip},
  {$limit:limit}
 
])


    
    // Get all categories for the filter options
    const categories = await Category.find({ isDeleted: false });

    // Get total count of products for pagination
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    //get cart count
    let cartCount = 0;
    let wishlistIds = [];
    if (req.session.user) {
      const userId = req.session.user._id;

      //console.log('userId', userId);

      const wishList = await WishList.findOne({ userId: req.session.user._id });
      console.log("wishlist", wishList);

      if (wishList) {
        wishlistIds = wishList.items.map((item) => item.toString());
      } else {
        console.log("Wishlist not found for user:", userId);
        wishlistIds = []; // fallback to empty
      }
      //console.log('wishlist ids', wishlistIds);

      const cart = await Cart.findOne({ userId });
      if (cart) {
        cartCount = cart.items.length;
        //console.log('cart count is ', cartCount);
      } else {
        console.log("cart not fount");
      }
    }
    // fetching offers
    const offers = await Offer.find({ status: "active" });

    products.forEach((product) => {
      const productOffer = offers.find(
        (offer) =>
          offer.applicableTo === "product" &&
          offer.productId?.toString() === product._id.toString(),
      );
      const categoryOffer = offers.find(
        (offer) =>
          offer.applicableTo === "category" &&
          offer.categoryId?.toString() === product.categoryId?.toString(),
      );

      let finalOffer = null;
      let discountAmount = 0;

      if (productOffer && categoryOffer) {
        const productDiscountAmount =
          productOffer.discountType === "amount"
            ? productOffer.discountValue
            : (product.price * productOffer.discountValue) / 100;

        const categoryDiscountAmount =
          categoryOffer.discountType === "amount"
            ? categoryOffer.discountValue
            : (product.price * categoryOffer.discountValue) / 100;

        finalOffer =
          productDiscountAmount > categoryDiscountAmount
            ? productOffer
            : categoryOffer;
        discountAmount = Math.max(
          productDiscountAmount,
          categoryDiscountAmount,
        );
      } else if (productOffer || categoryOffer) {
        finalOffer = productOffer || categoryOffer;

        // Checking finalOffer before using its properties
        if (finalOffer) {
          discountAmount =
            finalOffer.discountType === "amount"
              ? finalOffer.discountValue
              : (product.price * finalOffer.discountValue) / 100;
        }
      }

      if (finalOffer) {
        product.discountPrice = Math.round(product.price - discountAmount);
        product.discountAmount = discountAmount;
        product.finalDiscount = finalOffer.discountValue;
        product.discountType = finalOffer.discountType;
      } else {
        product.discountPrice = product.price;
      }
    });

    res.render("user/productList", {
      products,
      wishlist: wishlistIds,
      categoryId: categoryId || null,
      categories,
      sort: sort || null,
      priceRange: priceRange || null,
      title: categoryTitle,
      currentPage: page,
      totalPages,
      user: req.session.user || "",
      selectedCategories,
      selectedPriceRange,
      cartCount,
      query: req.query.query || "",
      type: req.query.type || "products",
      csrfToken: res.locals.csrfToken,
      offers,
    });
  } catch (error) {
    console.log("error in fetching products: ", error);
    return res.redirect("/user/home");
  }
};

//product dtails page
const getSingleProduct = async (req, res) => {
  console.log("from single vairant page");
  const { variantId } = req.params;
  console.log("variantid is equal to " + variantId);

  try {
    if (!variantId) {
      console.log("Variant id is not fount");

      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Variant Id")});
    }

    const variant=await Variant.findOne({_id:new mongoose.Types.ObjectId(variantId)})
    console.log('variant',variant);
    if(!variant){
       console.log("Variant  is not fount");

      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Variant")});
   
    }

    const productId=variant.productId
    const variants=await Variant.find({productId}).populate('productId')
    console.log('variants',variants);
    


    const singleProduct = await Product.findOne({
      isDeleted: false,
      _id: productId,
    }).lean();

    if (!singleProduct) {
      console.log("No product found");
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message:statusMessages.NOT_FOUND("Product") });
    }

   

    //get related products
    let relatedProducts=[]


    relatedProducts = await Product.aggregate([
  {
    $match: { categoryId: variant.categoryId, isDeleted: false }
  },
  {
    $lookup: {
      from: 'variants',
      let: { productId: '$_id' }, // pass the local _id as productId
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$productId', '$$productId'] }, // match productId
                { $eq: ['$isDeleted', false] }          // AND variant is not deleted
              ]
            }
          }
        },
         { $limit: 1 }
      ],
      as: 'mainVariant'
    }
  },
  {
    $unwind: {
      path: '$mainVariant',
      preserveNullAndEmptyArrays: true
    }
  },
  {$limit:3}
])

  

    

    console.log(relatedProducts , ' related products');

    //get cart count
    let cartCount = 0;
    if (req.session.user) {
      const userId = req.session.user._id;
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cartCount = cart.items.length;
        console.log("cart count is ", cartCount);
      } else {
        console.log("cart not fount");
      }
    }

    //fetching offer
    const offers = await Offer.find({ status: "active" });

    const productOffer = offers.find(
      (offer) =>
        offer.applicableTo == "product" &&
        offer.productId?.toString() == singleProduct._id.toString(),
    );
    const categoryOffer = offers.find(
      (offer) =>
        offer.applicableTo == "category" &&
        offer.categoryId?.toString() == singleProduct.categoryId?.toString(),
    );

    let finalOffer = null;
    let discountAmount = 0;

    if (productOffer && categoryOffer) {
      console.log("Both available fronm single product page");

      const productdiscountAmount =
        productOffer.discountType == "amount"
          ? productOffer.discountValue
          : (productOffer.discountValue * singleProduct.price) / 100;
      const categoryDiscountAmount =
        categoryOffer.discountType == "amount"
          ? categoryOffer.discountValue
          : (categoryOffer.discountValue * singleProduct.price) / 100;

      discountAmount =
        productdiscountAmount > categoryDiscountAmount
          ? productdiscountAmount
          : categoryDiscountAmount;
      finalOffer =
        productdiscountAmount > categoryDiscountAmount
          ? productOffer
          : categoryOffer;
    } else if (productOffer || categoryOffer) {
      console.log("one offer applicable fronm single product page");
      finalOffer = productOffer || categoryOffer;
      discountAmount =
        finalOffer.discountType == "amount"
          ? finalOffer.discountValue
          : (finalOffer.discountValue * singleProduct.price) / 100;
    } else {
      console.log("No offer applicable from single product page");
      finalOffer = null;
      discountAmount = 0;
    }

    if (finalOffer) {
      singleProduct.discountPrice = Math.round(
        singleProduct.price - discountAmount,
      );
      singleProduct.discountType = finalOffer.discountType;
      singleProduct.discount = finalOffer.discountValue;
      singleProduct.discountAmount = discountAmount;
    } else {
      singleProduct.discountPrice = singleProduct.price;
    }
    res.render("user/sproduct", {
      title: "Product Details Page",
      singleProduct,
      variant,
      singleProduct,
      variants,
       relatedProducts,
      categoryId: "",
      priceRange: "",
      finalOffer,
      cartCount,
      user: req.session.user || "",
      sort: "",
      query: "",
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

module.exports = {
  getProducts,
  getAddProduct,
  postAddProduct,
  uploadImages,
  getEditProduct,
  postEditProduct,
  deleteProduct,
  getVariants,
  addVariant,
  getVariant,
  editVariant,
  deleteVariant,
  getAdminProduct,


  getProductList,
  getSingleProduct
}