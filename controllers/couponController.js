const { default: mongoose } = require('mongoose');
const Coupen=require('../model/coupenModel')
const statusCodes=require('../utils/statusCodes')
const statusMessages=require('../utils/statusMessages')

//coupen management
const getCouponPage = async (req, res) => {
  //console.log('this is from admin coupens');

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const coupons = await Coupen.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    //console.log(page, limit, skip, coupons);

    if (!coupons) {
      console.log("No coupens");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Coupons") });
    }
    const activeCouponsCount = await Coupen.countDocuments({ isActive: true });
    const expiredCount = await Coupen.countDocuments({ isActive: false });
    const totalCoupons = await Coupen.countDocuments();
    const totalPages = Math.floor(totalCoupons / limit);

    const currentDate = new Date();

    for (const coupon of coupons) {
      if (coupon.expiryDate < currentDate) {
        coupon.isActive = false;
        await coupon.save();
      }
    }

    res.render("admin/coupenManagement", {
      title: "Admin Coupon Management",
      coupons,
      thisPage: 'coupons',
      activeCouponsCount,
      totalRedemptions: 10,
      revenueImpact: 100,
      expiredCount,
      currentPage: page,
      skip,
      limit,
      totalPages,
    });
  } catch (error) {
    console.log("Error in fetching coupens");
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

//add coupon
const addCoupon = async (req, res) => {
  console.log("from add coupen");
  try {
    let {
      coupenCode,
      description,
      discountType,
      discountValue,
      endDate,
      minOrder,
      startDate,
      isActive,
      usageLimit,
    } = req.body;
    console.log(
      coupenCode,
      description,
      discountType,
      discountValue,
      endDate,
      minOrder,
      startDate,
      isActive,
      usageLimit,
    );
    const coupen = await Coupen.findOne({ coupenCode: coupenCode });
    if (coupen) {
      console.log("Coupen already Exists");

      return res.status(statusCodes.CONFLICT).json({ success: false, message: statusMessages.EXISTS("Coupon") });
    }
    const date = new Date()
    console.log('Today', date);

    if (endDate < date) {
      console.log("Invalid Expiry Date");

      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message:statusMessages.INVALID('Expiry Date') });
    }
    if (endDate < startDate) {
      console.log("Expiry date should be greater than start Date ");

      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Expiry date should be greater than start Date " });
    }
    const newCoupon = new Coupen({
      coupenCode,
      description,
      discountType,
      discountValue,
      expiryDate: endDate,
      minPurchase: minOrder,
      startDate,
      isActive: isActive ? true : false,
      usageLimit,

      createdAt: new Date(),
    });
    await newCoupon.save();
    console.log("Coupen saved successfully");

    return res.status(statusCodes.OK).json({ success: true, message: statusMessages.CREATED("Coupon"),newCoupon });
  } catch (error) {
    console.log("error is ", error);
    return res.json({ success: false, message: "Error in adding coupen" });
  }
};

//edit coupon
const editCoupon = async (req, res) => {
  console.log("from edit coupen");
  try {
    const couponId = req.params.couponId;
    console.log("coupen id is ", couponId);
    let {
      coupenCode,
      description,
      discountType,
      discountValue,
      endDate,
      minOrder,
      startDate,
      isActive,
      
    } = req.body;
    const coupen = await Coupen.findOne({ _id:new mongoose.Types.ObjectId(couponId) });
    if (!coupen) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Coupon")});
    }

    const couponExist=await Coupen.findOne({coupenCode,_id:{$ne:new mongoose.Types.ObjectId(couponId)}})
    if (couponExist) {
      return res.status(statusCodes.CONFLICT).json({ success: false, message: statusMessages.EXISTS("Coupon")});
    }

    coupen.coupenCode = coupenCode || coupen.coupenCode
      coupen.description = description ||coupen.description
      coupen.discountType = discountType||coupen.discountType
      coupen.discountValue = discountValue||coupen.discountValue
      coupen.expiryDate = endDate||coupen.expiryDate
      coupen.minPurchase = minOrder||coupen.minPurchase
      coupen.startDate = startDate ||coupen.startDate
      coupen.isActive = isActive 
      coupen.usageLimit = 1
      coupen.updatedAt = new Date()
      await coupen.save();
    console.log("coupon editted successfully");

    return res.status(statusCodes.OK).json({ success: true, message: statusMessages.UPDATED("Coupon"),editedCoupon:coupen})
    
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR});
  }
};

//getCouponData
const getCouponData = async (req, res) => {
  try {
    console.log("getCouponData");

    const coupenId = req.params.coupenId;
    if (!coupenId) {
      console.log("coupen id is not present");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Coupon Id") });
    }

    const coupon = await Coupen.findOne({ _id: coupenId });
    if (!coupon) {
      console.log("coupen  is not present");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Coupon") });
    }
    return res.status(statusCodes.OK).json({ success: true, coupon });
  } catch (error) {
    console.log("Error in fetching coupen");
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR});
  }
};

//removeCoupon
const removeCoupon = async (req, res) => {
  console.log("removeCoupon");
  try {
    const couponId = req.params.couponId;
    const coupon = await Coupen.findByIdAndUpdate(
      couponId,
      { $set: { isActive: false } },
      { new: true }, // optional: returns the updated document
    );
    await coupon.save();
    console.log("Coupen removed suucesfully");
    return res.status(statusCodes.OK).json({ success: true, message:'Coupon Removed successsfully'});
  } catch (error) {
    console.log("error is ", error);
   return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

//applyCoupon
const applyCoupon = async (req, res) => {
  console.log("applyCoupon");
  try {
    const couponId = req.params.couponId;
    const coupen = await Coupen.findOne({ _id: couponId })
    console.log('coupen', coupen);

    const currentDate = new Date()
    console.log(currentDate);
    const expiryDate = new Date(coupen.expiryDate)
    if (expiryDate < currentDate) {
      console.log('This coupon is expired');

      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "This coupon is expired" })
    }
    const coupon = await Coupen.findByIdAndUpdate(
      couponId,
      { $set: { isActive: true } },
      { new: true }, // optional: returns the updated document
    );
    await coupon.save();
    console.log("Coupen Applied succesfully");
    return res.status(statusCodes.OK).json({
      success: true,
      message: "Coupen Applied  successfully",
    });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};
module.exports={
    getCouponPage,
    addCoupon,
    editCoupon,
    getCouponData,
    removeCoupon,
    applyCoupon
}