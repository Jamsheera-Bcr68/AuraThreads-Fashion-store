const Category=require('../model/categoryModel')
const path=require('path')
const multer = require("multer");
const sharp = require("sharp");
const StatusCodes = require('../utils/statusCodes');
const statusMessages=require('../utils/statusMessages')


//get categoryManagement
const getCategory= async (req,res)=>{
try {
    const query = req.query.query || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    console.log("Query is", query);
    let searchQuery = { isDeleted: false };

    if (query.trim()) {
      searchQuery = {
        $and: [
          {
            $or: [
              { categoryName: { $regex: `^${query}$`, $options: "i" } },
              { description: { $regex: `^${query}$`, $options: "i" } },
            ],
          },
          { isDeleted: false },
        ],
      };
    }

    const categories = await Category
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`from category page is ${page} lmit is ${limit}`);

    const totalCategory = await Category.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCategory / limit);

    res.render("../views/admin/categoryManagement", {
      categories,
      currentPage: page,
      totalPages,
      query,
      title: "Category Manamgement",
      thisPage:'category',
      successMessage: res.locals.successMessage[0] || "",
      errorMessage: res.locals.errorMessage[0] || "",
    });
  } catch (error) {
   return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(statusMessages.SERVER_ERROR);
  }
}

// Multer storage setup (for storing images in "uploads" folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save in "uploads" directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage: storage });

const addCategory=async (req, res) => {

console.log('from add category');
console.log('req.body',req.body);

  const { categoryName, description,uploadedImages } = req.body;
  const isListed = req.body.isListed == "on" ? true : false;
  let imagePaths = []; // Clear this before pushing resized images

  console.log('categoryName,description,isListed,imagePaths',categoryName,description,isListed,uploadedImages);
  
  try {
    console.log('req.files',req.body);
    imagePaths = JSON.parse(uploadedImages || '[]');
   console.log('imge paths',imagePaths);
   
    if(imagePaths.length===0){
      return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:'Plees UPload atleast One Image'})
    }
    // Check if category already exists
    const existingCategory = await Category.findOne({
      categoryName,

    });

    if (existingCategory) {
      console.log('category already exsting');
      
      return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:statusMessages.EXISTS('Category')})
    }
;

    // Save category
    const newCategory = new Category({
      categoryName,
      description,
      isListed,
      images: imagePaths, // Only resized images are stored
    });

    await newCategory.save();
    console.log('newCategory',newCategory);
    
    return res.status(StatusCodes.CREATED).json({success:true,message:statusMessages.CREATED('Category'),newCategory})
  } catch (error) {
    console.error("Error when adding category:", error);
   
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:statusMessages.SERVER_ERROR})
  }
}

const uploadImage=async(req,res)=>{
   console.log("Category image upload route hit");
   console.log('req.file',req.file);
   
 try{
  if (!req.file ) {
    console.log('no files');
    
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "No files uploaded" });
  }

 
const filePaths = [`/uploads/${req.file.filename}`];


  console.log("Uploaded file paths:", filePaths);
    console.log('data send to backend');
    
 return res.status(StatusCodes.OK).json({success:true,filePaths ,message:'Image uploaded'});
  }catch{
    console.log("Backend error in uploading",err);
   return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:statusMessages.SERVER_ERROR})
  }
}

const editCategory=async(req,res)=>{
  console.log('from editCategory');
  const { categoryName, description, isListed } = req.body;
  const { id } = req.params;
try {
const mongoose = require('mongoose');
const categoryexist = await Category.findOne({
  categoryName,
  _id: { $ne: new mongoose.Types.ObjectId(id) }
});

  console.log('Category exist',categoryexist);
  if(categoryexist){
    console.log('category already exist');
   return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: statusMessages.EXISTS('Category')
      });
  }
  
    const existCategory = await Category.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          categoryName,
          description,
          isListed: Boolean(isListed),
        },
      },
      { new: true }
    );
    console.log('Category updated');
    
    return res.status(StatusCodes.OK).json({ success: true, message: statusMessages.UPDATED('Category'),existCategory });

  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR});
  }
}

const deleteCategory=async(req,res)=>{
  console.log('from delete category');
  
    try {
      const { id } = req.params;
      if(!id){
        return res.status(StatusCodes.NOT_FOUND).json({success:false,message:statusMessages.NOT_FOUND('Category Id')})
      }
      const softDeleteCategory = await Category.findByIdAndUpdate(
         id,
        { isDeleted: true },
        { new: true },
      );
      if (!softDeleteCategory) {
        console.log("Category not found");
  
        return res.status(StatusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND('Category') });
      } else {
        console.log("Category Deleted successfully");
        console.log("soft deleted category " , softDeleteCategory);
        return res.status(StatusCodes.OK).json({
          success: true,
          message: statusMessages.DELETED("Category"),
        });
      }
    } catch (error) {
      console.log("error on deleting category", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR});
    }
}
module.exports={
    getCategory,
    addCategory,
    uploadImage,
    editCategory,
    deleteCategory
}