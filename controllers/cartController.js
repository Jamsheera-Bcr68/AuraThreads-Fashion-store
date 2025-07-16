const WishList = require('../model/wishListModel')
const Cart = require('../model/cartModel')
const Offer = require('../model/offerModel')
const Product = require('../model/productModel')
const statusCodes = require('../utils/statusCodes')
const statusMessages = require('../utils/statusMessages')
const Variant = require('../model/variantModel')
const { default: mongoose } = require('mongoose')
const messages = require('dote/src/messages')
const User=require('../model/userModel')
const Wallet=require('../model/walletModel')
const Address=require('../model/addressModel')
const Coupon=require('../model/coupenModel')

const getCart = async (req, res) => {
  let cartCount = 0;
  console.log("this is from get cart");
  try {
    const user = req.session.user;
    const userId = user._id;
    if (!userId) {
      console.log("User not registered");
      return res.status(statusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Please Login First",
      });
    }
    // console.log("user id is ", userId);
    let title;

    let cart = await Cart.findOne({ userId })
      .populate({
        path: "items.variantId",
        model: "Variant",
        select: "images color stock size",
      })
      .populate({
        path: "items.productId",
        model: "Product",
        select: "productName price categoryId",
      });

    // console.log('cart',cart);

    if (!cart) {
      console.log("No existing cart");
      try {
        cart = new Cart({ userId: userId, items: [] });
        console.log("new empty cart is created");
      } catch (error) {
        console.log("error in creating new cart" + error);
      }
      await cart.save();
    }

    //console.log("Cart Items:", JSON.stringify(cart.items, null, 2));
    cart.items.forEach((item) => {
      if (item.variantId.images && item.variantId.images.length > 0) {
        item.variantId.images = item.variantId.images.map((image) =>
          image.replace(/\\/g, "/"),
        );
      }
    });
    cartCount = cart.items.length;
    title =
      cart.items.length > 0
        ? `Displaying your  cart itmes`
        : "Your cart is empty";

    let cartTotal = 0
    if (cart.items.length == 0) {
      cartTotal = cart.items.reduce(
        (sum, item) => sum + item.productId.price * item.quantity,
        0,
      );
    }
    // console.log("cart total", cartTotal);

    //fetching offers
    const offers = await Offer.find({ status: "active" });
    cart.items.forEach((item) => {
      const productOffer = offers.find(
        (offer) =>
          offer.applicableTo == "product" &&
          offer.productId?.toString() == item.productId._id?.toString(),
      );
      const categoryOffer = offers.find(
        (offer) =>
          offer.applicableTo == "category" &&
          offer.categoryId?.toString() == item.productId?.categoryId?.toString(),
      );

      let finalOffer = null;
      let discountAmount = 0;
      if (!categoryOffer && !productOffer) {
      } else if (productOffer && categoryOffer) {
        const productDiscountAmount =
          productOffer.discountType == "amount"
            ? productOffer.discountValue
            : (productOffer.discountValue * item.productId.price) / 100;
        const categoryDiscountAmount =
          categoryOffer.discountType == "amount"
            ? categoryOffer.discountValue
            : (categoryOffer.discountValue * item.productId.price) / 100;

        discountAmount =
          productDiscountAmount > categoryDiscountAmount
            ? productDiscountAmount
            : categoryDiscountAmount;
        finalOffer =
          productDiscountAmount > categoryDiscountAmount
            ? productOffer
            : categoryOffer;
      } else if (categoryOffer || productOffer) {
        finalOffer = categoryOffer || productOffer;
        discountAmount =
          finalOffer.discountType == "amount"
            ? finalOffer.discountValue
            : (finalOffer.discountValue * item.productId.price) / 100;
      }

      if (finalOffer) {
        item.discountAmount = discountAmount;
        item.discountPrice = Math.round(item.productId.price - discountAmount);
        item.discountType = finalOffer.discountType;
      } else {
        item.discountAmount = 0;
        item.discountPrice = item.productId.price;
        item.discountTyp = "";
      }
    });

    const netAmount = cart.items.reduce(
      (total, item) => total + item.discountPrice * item.quantity,
      0,
    );
    const totalDiscount = cart.items.reduce(
      (total, item) => total + item.discountAmount * item.quantity,
      0,
    );

    req.session.offer = cart.items.map((item) => ({
      variantId: item.variantId._id,
      discountAmount: item.discountAmount || 0,
      discountPrice: item.discountPrice || item.productId.price,
      discountType: item.discountType || null,
    }));
    req.session.cartTotal = cartTotal;
    req.session.netAmount = netAmount;
    req.session.totalDiscount = totalDiscount;
    console.log("req.session.offer ", req.session.offer);
    console.log("totalDiscount from get cart", totalDiscount);

    // console.log('cart',cart);

    return res.render("../views/user/cart", {
      errorMessage: null,
      categoryId: null,
      priceRange: null,
      cart,
      title,
      cartCount,

      user: req.session.user || "",
      sort: null,
      query: null,
    });
  } catch (error) {
    console.log("error n fetching cart", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

const addToCart = async (req, res) => {
  console.log("from add to cart");
  try {
    if (!req.session.user) {
      return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: "You are not registered" });
    }
    const user = req.session.user;
    const userId = user._id;

    const { variantId } = req.body;
    console.log("variantId  is ", variantId);

    if (!variantId) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Variant Id") });
    }
    const quantity = req.body.quantity || 1;
    let subTotal = req.body.subTotal;
    console.log('subTotal', subTotal)


    if (!user) {
      return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: "Please login first" });
    }
    console.log("quantity is ", quantity);

    // Find the product and check stock
    const variant = await Variant.findOne({ _id: variantId });

    if (!variant) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Product") });
    }

    const productStock = variant.stock;

    // Check if requested quantity exceeds available stock
    if (quantity > productStock) {
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Out of stock" });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ userId });
    let productId
    if (variant && variant.productId) {
      productId = variant.productId;
    } else {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: "Product ID missing in variant!" });
    }

    const product = await Product.findOne({ _id: productId })
    const price=product.price
    console.log('price', price);


    if (!cart) {
      // Create a new cart if it doesn't exist
      console.log('no cart,vauant is,product id,quantity', variantId, productId, quantity);
      // const price=await Product.findOne({_id:productId}).price
      console.log('price', price);
      console.log('typeof quantity', typeof quantity, 'typeof price', typeof price);

      subTotal = price * quantity
      console.log('subtotal', subTotal);


      cart = new Cart({ userId, items: [{ productId, variantId: variant._id, quantity, subTotal }] });
    } else {
      // Check if the product is already in the cart
      const itemIndex = cart.items.findIndex(
        (item) => item.variantId?.toString() === variantId,
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
        console.log('typeof cart.items[itemIndex].quantity', typeof cart.items[itemIndex].quantity, 'typeof price', typeof price);
        subTotal = cart.items[itemIndex].quantity * price

        if (cart.items[itemIndex].quantity > productStock) {
          return res.json({ success: false, message: "Out of stock" });
        } else if (cart.items[itemIndex].quantity > 5) {
          return res.json({
            success: false,
            message: "Cannot add more than 5 quantity of the same",
          });
        }
      } else {
        subTotal = price * quantity
        console.log('typeof quantity', typeof quantity, 'typeof price', typeof price);
        console.log('subtotal', subTotal);

        // Add the product to the cart if it's not already in
        console.log('fount cart,variant id,product id,quantity', variantId, productId, quantity);
        cart.items.push({ productId, variantId: variant._id, quantity, subTotal });
        console.log('cart saved');

      }
    }

    console.log(cart);

    //  cart.items.forEach(item=>item.subTotal=item.quantity*)

    await cart.save();

    console.log("Product added to cart!");

    //remove the product from wishlist
    const wishList = await WishList.findOne({ userId });

    if (wishList) {
      const wishListItem = wishList.items.find(
        (item) => item.toString() == variantId,
      );
      if (wishListItem) {
        wishList.items.pull(variantId);
        await wishList.save();
      }
    } else {
      console.log("No wishlist found for user:", userId);

    }
    // Response after successfully adding to cart
    res.json({ success: true, message: "Product added to cart!" });
  } catch (error) {
    console.log("Error in Adding Cart", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};


const deleteCart = async (req, res) => {
  console.log("From delete Cart");
  const { variantId } = req.params;

  if (!req.session.user) {
    return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: "Please login first" })

  }

  let userId = req.session.user._id;


  console.log(`userId id ${userId} and product Id is ${variantId}`);
  try {
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
      select: "productName price  categoryId",
    });
    if (!cart) {
      console.log("can't find cart");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Cart') })
    } else {
      console.log("cart found");
      cart.items = cart.items.filter(
        (item) => item.variantId._id?.toString() !== variantId,
      );

      await cart.save();
      const variant = await Variant.findOne({ _id: new mongoose.Types.ObjectId(variantId) })
      if (!variant) {
        return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Variant") })
      }

      // fetching offers
      const offers = await Offer.find({ status: "active" });
      cart.items.forEach((item) => {
        const productOffer = offers.find(
          (offer) =>
            offer.applicableTo == "product" &&
            offer.productId?.toString() == item.productId._id?.toString(),
        );
        const categoryOffer = offers.find(
          (offer) =>
            offer.applicableTo == "category" &&
            offer.categoryId?.toString() == item.productId.categoryId.toString(),
        );

        let finalOffer = null;
        let discountAmount = 0;
        if (!categoryOffer && !productOffer) {
        } else if (productOffer && categoryOffer) {
          const productDiscountAmount =
            productOffer.discountType == "amount"
              ? productOffer.discountValue
              : (productOffer.discountValue * item.productId.price) / 100;
          const categoryDiscountAmount =
            categoryOffer.discountType == "amount"
              ? categoryOffer.discountValue
              : (categoryOffer.discountValue * item.productId.price) / 100;

          discountAmount =
            productDiscountAmount > categoryDiscountAmount
              ? productDiscountAmount
              : categoryDiscountAmount;
          finalOffer =
            productDiscountAmount > categoryDiscountAmount
              ? productOffer
              : categoryOffer;
        } else if (categoryOffer || productOffer) {
          finalOffer = categoryOffer || productOffer;
          discountAmount =
            finalOffer.discountType == "amount"
              ? finalOffer.discountValue
              : (finalOffer.discountValue * item.productId.price) / 100;
        }

        if (finalOffer) {
          item.discountAmount = discountAmount;
          item.discountPrice = Math.round(item.productId.price - discountAmount);
          item.discountType = finalOffer.discountType;
        } else {
          item.discountAmount = 0;
          item.discountPrice = item.productId.price;
          item.discountType = "";
        }
      });

      const netAmount = cart.items.reduce(
        (total, item) => total + (parseInt(item.discountPrice) * parseInt(item.quantity)),
        0,
      );
      const totalDiscount = cart.items.reduce(
        (total, item) => total + item.discountAmount * item.quantity,
        0,
      );
      req.session.netAmount = netAmount;
      req.session.totalDiscount = totalDiscount;

      req.session.discountAmount = 0;
      req.session.totalAmount = 0;
      req.session.code = "";
      console.log("removed from cart");
      const cartItems = cart.items
      console.log('net amount', netAmount);

      return res.status(statusCodes.OK).json({ success: true, message: statusMessages.DELETED("Item"), cartItems, netAmount, totalDiscount });
    }
  } catch (error) {
    console.log("error in fetching cart", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

const updateCart = async (req, res) => {
  console.log("from updateCart");
  console.log("Received Params:", req.params); // Log received params

  const { variantId } = req.params;
  const quantity = parseInt(req.params.quantity);

  // Validate request parameters
  if (!variantId || isNaN(quantity) || quantity < 1) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ success: false, message: "Invalid request data" });
  }

  try {
    console.log(`Updating product ${variantId} with quantity ${quantity}`);
    const userId = req.session.user._id;

    // Find cart and product

    const variant = await Variant.findById(variantId);
    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.variantId",
        model: "Variant",
        select: "images stock size color",
      })
      .populate({
        path: "items.productId",
        model: "Product",
        select: "productName price categoryId",
      });
    console.log('cart', cart);
   
    if (!cart) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Cart") });
    }

    if (!variant) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Variant") });
    }

    const productStock = variant.stock;
    console.log("cart itmes ", cart.items);
    const cartItems = cart.items
    // Find item in cart
    const item = cart.items.find(
      (item) => item.variantId._id.toString() === variantId,
    );

    if (!item) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Item not found in your cart",
      });
    }

    console.log("Item found in cart");

    // Ensure quantity does not exceed stock before updating
    if (quantity > productStock) {
      console.log("Out of stock, requested quantity:", quantity);
      return res.status(statusCodes.BAD_REQUEST).json({ success: false, message: "Out of stock" });
    }

   const price = parseInt(item.productId.price);
    const subTotal = price * parseInt(quantity);

    // Update quantity
    item.quantity = quantity;
    item.subTotal = subTotal;

    // Save cart update
    await cart.save();

    //fetching offers
    const offers = await Offer.find({ status: "active" });
    cartItems.forEach((item) => {
      const productOffer = offers.find(
        (offer) =>
          offer.applicableTo == "product" &&
          offer.productId?.toString() == item.productId._id?.toString(),
      );
      const categoryOffer = offers.find(
        (offer) =>
          offer.applicableTo == "category" &&
          offer.categoryId?.toString() == item.productId.categoryId.toString(),
      );

      let finalOffer = null;
      let discountAmount = 0;
      if (!categoryOffer && !productOffer) {
      } else if (productOffer && categoryOffer) {
        const productDiscountAmount =
          productOffer.discountType == "amount"
            ? productOffer.discountValue
            : (productOffer.discountValue * item.productId.price) / 100;
        const categoryDiscountAmount =
          categoryOffer.discountType == "amount"
            ? categoryOffer.discountValue
            : (categoryOffer.discountValue * item.productId.price) / 100;

        discountAmount =
          productDiscountAmount > categoryDiscountAmount
            ? productDiscountAmount
            : categoryDiscountAmount;
        finalOffer =
          productDiscountAmount > categoryDiscountAmount
            ? productOffer
            : categoryOffer;
      } else if (categoryOffer || productOffer) {
        finalOffer = categoryOffer || productOffer;
        discountAmount =
          finalOffer.discountType == "amount"
            ? finalOffer.discountValue
            : (finalOffer.discountValue * item.productId.price) / 100;
      }

      if (finalOffer) {
        item.discountAmount = discountAmount;
        item.discountPrice = Math.round(item.productId.price - discountAmount);
        item.discountType = finalOffer.discountType;
      } else {
        item.discountAmount = 0;
        item.discountPrice = item.productId.price;
        item.discountTyp = "";
      }
    });

    const netAmount = cart.items.reduce(
      (total, item) => total + item.discountPrice * item.quantity,
      0,
    );
    console.log('net amount', netAmount);

    const totalDiscount = cart.items.reduce(
      (total, item) => total + item.discountAmount * item.quantity,
      0,
    );
    req.session.netAmount = netAmount;
    req.session.totalDiscount = totalDiscount;
    req.session.discountAmount = 0;
    req.session.totalAmount = 0;
    req.session.code = "";
    console.log("Cart saved successfully");



    return res
      .status(statusCodes.OK)
      .json({ success: true, message: statusMessages.UPDATED("Cart"), cartItems, netAmount, totalDiscount });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

const getCheckout = async (req, res) => {
  console.log("this is from user checkout page");
  const userId = req.session.user._id;
  if (!userId) {
    return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: statusMessages.NOT_FOUND("User") });
  }
  const user = await User.findOne({ _id: userId });
  if (!user) {
    console.log("User is not found");

    return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: statusMessages.NOT_FOUND("User") });
  }
  

  const wallet = await Wallet.findOne({ userId });
  // console.log('wallet ', wallet);

  if (!wallet) {
    return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Wallet") });
  }
  const cart = await Cart.findOne({ userId }).populate({
    path:"items.productId",
    from:"Product",
    select:"productName price "
  }).populate({
    path:'items.variantId',
    from:"Variant",
    select:" size color stock images"
  })
  console.log('cart items from checkout',cart.items);
  
  if (cart) {
    cartCount = cart.items.length;
    console.log("cart count is ", cartCount);
  } else {
    console.log("cart not found");
    res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND("Cart") });
  }

  const shippingCharge = cart.items.length > 0 ? 50.0 : 0;
  const taxAmount = 0.0;
  let totalAmount = 0;
  let subTotal = 0;
  let cartItems = cart.items.map((item) => {
    subTotal = item.productId.price * item.quantity;
    totalAmount += subTotal;
    req.session.totalAmount = totalAmount;
    return {
      productName: item.productId.productName,
      price: item.productId.price,
      quantity: item.quantity,
      subTotal,
      totalAmount,
      code: req.session.code || "",
      images: item.variantId.images,
      color:item.variantId.color,
      size:item.variantId.size
    };
  });
  //fetching address

  const addresses = await Address.find({ userId });
  if (!addresses) {
    return res.json({
      success: false,
      message: "You dont have any saved address",
    });
  }
  const offerDiscountAmount = req.session.totalDiscount;
  console.log("offerDiscountAmount", offerDiscountAmount);

  //getting available coupons
  const coupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gte: new Date() },
  });

  return res.render("user/userCkeckout", {
    categoryId: null,
    priceRange: null,
    cartCount: cartCount || "",
    user: req.session.user || "",
    sort: null,
    query: null,
    addresses: addresses || "",
    user,
    cartItems,
    shippingCharge,
    taxAmount,
    couponCode: req.session.code || "",
    couponDiscountAmount: req.session.discountAmount || 0,
    offerDiscountAmount: req.session.totalDiscount || 0,
    totalAmount,
    wallet,
    coupons,
  });
};
module.exports = {
  getCart,
  addToCart,
  updateCart,
  deleteCart,
  getCheckout
}