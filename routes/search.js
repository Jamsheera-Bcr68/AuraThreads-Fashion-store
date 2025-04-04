const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');

router.get('/adminSearch', adminController.searchProducts);

//router.get('/userSearch',userController.searchProducts)

module.exports = router;
