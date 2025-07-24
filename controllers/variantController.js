
const Product = require('../model/productModel')
const path = require('path')
//const multer = require("multer");
//const sharp = require("sharp");
const StatusCodes = require('../utils/statusCodes');
const statusMessages = require('../utils/statusMessages')
const Category = require('../model/categoryModel')
const Variant = require('../model/variantModel')
//const fs = require('fs')
const mongoose = require('mongoose');
//const { title } = require('process');
//const { json } = require('body-parser');
//const WishList=require('../model/wishListModel')
//const Cart=require('../model/cartModel')
//const Offer=require('../model/offerModel')

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

      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("variant Id") })
    }

    const variant = await Variant.findOne({ _id: new mongoose.Types.ObjectId(variantId) })
    if (!variant) {
      console.log(' variant id');

      return res.status(StatusCodes.NOT_FOUND), json({ success: false, message: statusMessages.NOT_FOUND("variant ") })
    }

    variant.isDeleted = true
    await variant.save()

    const product=await Product.findOne({_id:variant.productId})
    const productVariants=await Variant.find({productId:variant.productId})
    if(productVariants.every(variant=>variant.isDeleted)){
      product.isDeleted=true
      await product.save()
    }

    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.DELETED("Variant") })
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR), json({ success: false, message: statusMessages.SERVER_ERROR })
  }
}
module.exports={
    getVariants,
    addVariant,
    getVariant,
    editVariant,
    deleteVariant
}