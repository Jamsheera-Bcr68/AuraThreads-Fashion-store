const WishList=require('../model/wishListModel')
const Cart=require('../model/cartModel')
const Offer=require('../model/offerModel')
const Product=require('../model/productModel')
const Variant=require('../model/variantModel')
const statusCodes=require('../utils/statusCodes')
const statusMessages=require('../utils/statusMessages')


const getWishList = async (req, res) => {
  console.log("This is from user wish list");
  try {
    const userId = req.session.user._id;
    if (!userId) {
      console.log("userId is not found");
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "You are not registered" });
    }
    const wishList = await WishList.findOne({ userId }).populate("items");
    const productIds = wishList.items.map(p => p._id);
    const variants=await Variant.find({productId:{$in:productIds}})

    let cartCount = 0;

    const cart = await Cart.findOne({ userId });
    console.log("cart", cart);
    if (cart) {
      cartCount = cart.items.length || 0;
    }

    const offers = await Offer.find({ status: "active" });
    let products = [];
    if (wishList) {
      products = wishList.items;
    }

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

    res.render("user/wishList", {
      wishList,
      products,
      categoryId: null,
      priceRange: null,
      cartCount: cartCount || 0,
      sort: "",
      query: "",
      title: "your WishList",
      user: req.session.user,
    });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:statusMessages.SERVER_ERROR});
  }
};

//post addToWishList
const addToWishList = async (req, res) => {
  console.log("from add to wishlist");
  try {
    const { productId } = req.body;
    console.log("productId ", productId);
    console.log('req.session.user',req.session.user);
    
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      console.log("product not found");

      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Product") });
    }
    if (!req.session.user) {
        
      return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: "You are not registered" });
    }
     
    const userId = req.session.user._id;
   
    let wishList = await WishList.findOne({ userId });
    console.log("wishList ", wishList);

    if (!wishList) {
      console.log("wish list not found");

      wishList = new WishList({ userId, items: [productId] });
      await wishList.save();
      console.log("created wishlist ", wishList);
      return res.status(statusCodes.OK).json({
        success: true,
        message: "This item Added to wishlist",
      });
    } else {
      console.log("wishlist found");

      const itemExist = await wishList.items.find(
        (item) => item.toString() == productId,
      );
      if (itemExist) {
        console.log("This item is already in the wishlist");
        return res.status(statusCodes.CONFLICT).json({
          success: false,
          message: "This item is already in the wishlist",
        });
      }
      wishList.items.push(productId);
      await wishList.save();
      console.log("This item Added to wishlist wishlist");
      return res.status(statusCodes.OK).json({
        success: true,
        message: "This item Added to wishlist",
      });
    }
  } catch (error) {
    console.log("error ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR });
  }
};

// deleteWishlistItem
const deleteWishlistItem = async (req, res) => {
  console.log("deleteWishlistItem");
  try {
    const userId = req.session.user._id;
    const wishList = await WishList.findOne({ userId });
    const { productId } = req.params;
    console.log("productId ", productId);

    if (
      wishList &&
      wishList.items.some((item) => item.toString() === productId)
    ) {
      wishList.items.pull(productId);
      await wishList.save();
      return res.status(statusCodes.OK).json({ success: true, message: "Item removed from wishList" });
    } else {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Item not found in wishList",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR});
  }
};
module.exports={
    getWishList,
    addToWishList,
    deleteWishlistItem
}