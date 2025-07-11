const Offer=require('../model/offerModel')
const Product=require('../model/productModel')
const Category=require('../model/categoryModel')
const statusCodes=require('../utils/statusCodes')
const statusMessages=require('../utils/statusMessages')
const { default: mongoose } = require('mongoose')

//get offers
const getOffers = async (req, res) => {
  try {
    let date = new Date();
    const totalOffers = await Offer.countDocuments();
    const pendingOffers = await Offer.countDocuments({ status: "pending" });
    const activeOffers = await Offer.countDocuments({ status: "active" });
    const expiredOffers = await Offer.countDocuments({
      endDate: { $lt: date },
    });
    const stats = {
      totalOffers,
      activeOffers,
      pendingOffers,
      expiredOffers,
    };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const totalPages = Math.ceil(totalOffers / limit);

    const products = await Product.find({ isDeleted: false });
    const categories = await Category.find({ isDeleted: false });
    const offers = await Offer.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("from admin offer");
   

    for (let offer of offers) {
      if (new Date(offer.endDate) < date) {
        offer.status = "expired";
        await offer.save();
      }else if(new Date(offer.startDate)>date){
         offer.status = "inactive";
        await offer.save();
      }
    }

    const populatedOffers = await Promise.all(
      offers.map(async (offer) => {
        if (offer.applicableTo === "product" && offer.productId) {
          const product = await Product.findById(offer.productId).select(
            "productName",
          );
          offer.applicableName = product
            ? product.productName
            : "Unknown Product";
        } else if (offer.applicableTo === "category" && offer.categoryId) {
          const category = await Category.findById(offer.categoryId).select(
            "categoryName",
          );
          offer.applicableName = category
            ? category.categoryName
            : "Unknown Category";
        }
        return offer;
      }),
    );

    res.render("admin/offerManagement", {
      title: "Offer Management",
      currentPage: page || 1,
      limit,
      skip,
      totalPages,
      totalOffers,
      populatedOffers,
      stats,
      thisPage: 'offers',
      
      offers,
      products,
      categories,
    });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

//add offer
const addOffer = async (req, res) => {
  console.log("from admin add offer");
  try {
    const formObject = req.body;
    console.log("form Object ", formObject);

    console.log('formObject.offerName', formObject.offerName);

    const offerName = formObject.offerName

    const offerExist = await Offer.findOne({ offerName: new RegExp(`^${offerName}$`, 'i') })
    

    if (offerExist) {
      console.log('offerExist', offerExist);
      return res.status(statusCodes.CONFLICT).json({ success: false, message:statusMessages.EXISTS('Offer') })
    }

    const offer = new Offer({
      offerName: formObject.offerName,
      description: formObject.description,
      discountType:
        formObject.discountType == "percentage" ? "percentage" : "amount",
      discountValue: formObject.discountValue,
      startDate: formObject.startDate,
      endDate: formObject.endDate,
      status: formObject.status,
      productId: formObject.productId || null,
      categoryId: formObject.categoryId || null,
      applicableTo: formObject.offerOn,
      createdAt: new Date(),
    });
    const currentDate=new Date()
    if(currentDate< new Date(offer.startDate)){
        offer.status='Inactive'
    }
    

    await offer.save();

 let appliedItem;
 console.log('offer.applicableTo',offer.applicableTo);
 
   if(offer.applicableTo=='product'){
   let populatedOffer=await offer.populate('productId')
    appliedItem=populatedOffer.productId.productName
  }else{
    let populatedOffer=await offer.populate('categoryId')
    appliedItem=populatedOffer.categoryId.categoryName

   }
   console.log('applied item',appliedItem);
   
   
    return res.status(statusCodes.OK).json({ success: true, message:statusMessages.CREATED('Offer') ,newOffer:offer,appliedItem});
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

//get single offer
const getSingleOffer = async (req, res) => {
  console.log("from admin getSingleOffer");
  try {
    const offerId = req.params.offerId;

    console.log("offerId ", offerId);

    if (!offerId) {
      console.log("offer Id not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Offer Id") });
    }
    const offer = await Offer.findOne({ _id: offerId });
    if (!offer) {
      console.log("offer not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Offer")});
    }
    return res.status(statusCodes.OK).json({ success: true, offer, message: "offer found" });
  } catch (error) {
    console.log("errr in finding getSingleOffer");
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR});
  }
};

//delete offer
const deleteOffer = async (req, res) => {
  console.log("from delete offer");
  try {
    const offerId = req.params.offerId;

    if (!offerId) {
      console.log("Offer id not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message:statusMessages.NOT_FOUND("Offer id")});
    }
    console.log('offer id', offerId, 'type of offerid', typeof (offerId));

    const offer = await Offer.findOne({ _id: new mongoose.Types.ObjectId(offerId) });
    if (!offer) {
      console.log("Offer not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Offer") });
    }

    offer.status = "inactive";
    await offer.save();
    console.log('offer deleted');
    
    return res.status(statusCodes.OK).json({ success: true, message: statusMessages.DELETED("Offer ") });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

//edit offer
const editOffer = async (req, res) => {
  console.log("from editOffer");
  try {
    let offerId = req.params.offerId;
    console.log("offerId", offerId);

    if (!offerId) {
      console.log("Offerid not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, success:statusMessages.NOT_FOUND("Offer Id") });
    }
    const offer = await Offer.findOne({ _id: offerId });
    if (!offer) {
      console.log("Offer not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, success: statusMessages.NOT_FOUND("Offer") });
    }

    const {
      offerName,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      status,
      productId,
      categoryId,
      offerOn,
    } = req.body;

    const offerExist = await Offer.findOne({
      offerName,
      _id: { $ne: new mongoose.Types.ObjectId(offerId) }
    });
    if (offerExist) {
      console.log('Offers already exist');
      return res.status(statusCodes.CONFLICT).json({ success: false, message:statusMessages.EXISTS("Offer") })

    }

    offer.offerName = offerName 
    offer.description = description 
      offer.discountType = discountType == "percentage" ? "percentage" : "amount"
      offer.discountValue = discountValue 
      offer.startDate = startDate 
      offer.endDate = endDate 
      offer.status = status
     
      offer.applicableTo = offerOn 
      offer.updatedAt = new Date()

      if (offerOn === 'product') {
  offer.productId = productId;
  offer.categoryId = null; 
} else if (offerOn === 'category') {
  offer.categoryId = categoryId;
  offer.productId = null;  
}

    await offer.save();

 let appliedItem;
 console.log('offer.applicableTo',offer.applicableTo);
 
   if(offer.applicableTo=='product'){
   let populatedOffer=await offer.populate('productId')
    appliedItem=populatedOffer.productId.productName
  }else{
    let populatedOffer=await offer.populate('categoryId')
    appliedItem=populatedOffer.categoryId.categoryName

   }
   console.log('applied item',appliedItem);
   
   


    return res.status(statusCodes.OK).json({ success: true, message: statusMessages.UPDATED('Offer'),edittedOffer:offer ,appliedItem});
  } catch (error) {
    console.log("error ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
}

module.exports={
    getOffers,
    addOffer,
    deleteOffer,
    getSingleOffer,
    editOffer
}