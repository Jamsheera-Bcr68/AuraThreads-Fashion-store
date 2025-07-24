const express = require("express");
const multer = require("multer");
const path = require("path");
const Product = require("../model/productModel"); 
const { default: mongoose } = require("mongoose");
const category = require("../model/categoryModel");
const { title } = require("process");
const adminController = require("../controllers/adminController");
const sharp = require("sharp");
const User = require("../model/userModel");
const Cart = require("../model/cartModel");
const fs = require("fs");
const productController=require('../controllers/productController')
const adminAuth=require('../middleweres/adminAuth')
const variantController=require('../controllers/variantController')

const router = express.Router();


router.get('/products',productController.getProducts)

// Add Product Page
router.get('/products/add',adminAuth,productController.getAddProduct)


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

router.post("/upload", upload.array("image"),productController.uploadImages)
// Upload route for images


// Product add route with full multer handling
router.post('/products/add',upload.fields([{name:'imageInput',maxCount:10},
{ name: "uploadedImages", maxCount: 1 }
]),productController.postAddProduct)

router.get("/products/edit/:productId",upload.array('images',5),productController.getEditProduct)
//edit product admin


router.post( "/products/edit/:productId",upload.array("images", 5),productController.postEditProduct)
router.delete("/products/delete/:productId",productController.deleteProduct)

//variantController
router.get('/viewVariants/:productId/:categoryId',variantController.getVariants)
router.post('/variant/add', upload.array('images', 5),variantController.addVariant)
router.get('/getvariant/:variantId',variantController.getVariant)
router.patch('/variant/edit/:variantId', upload.array('images',5),variantController.editVariant)
router.delete(`/variant/:variantId`,variantController.deleteVariant)

router.get(`/product/:productId`,productController.getAdminProduct)



module.exports = router;
