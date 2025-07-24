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
    const variants=await Variant.find({productId,isDeleted:false}).populate('productId')
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

module.exports={
    getSingleProduct,
    getProductList
}