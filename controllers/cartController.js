const WishList=require('../model/wishListModel')
const Cart=require('../model/cartModel')
const Offer=require('../model/offerModel')
const Product=require('../model/productModel')
const statusCodes=require('../utils/statusCodes')
const statusMessages=require('../utils/statusMessages')

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
        message: "Please register to add to cart",
      });
    }
    console.log("user id is ", userId);
    let title;

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
      select: "productName price images stock categoryId",
    });
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
      if (item.productId.images && item.productId.images.length > 0) {
        item.productId.images = item.productId.images.map((image) =>
          image.replace(/\\/g, "/"),
        );
      }
    });
    cartCount = cart.items.length;
    title =
      cart.items.length > 0
        ? `Displaying your  cart itmes`
        : "Your cart is empty";

    let cartTotal = cart.items.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0,
    );
    console.log("cart total", cartTotal);

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
    const totalDiscount = cart.items.reduce(
      (total, item) => total + item.discountAmount * item.quantity,
      0,
    );

    req.session.offer = cart.items.map((item) => ({
      productId: item.productId._id,
      discountAmount: item.discountAmount || 0,
      discountPrice: item.discountPrice || item.productId.price,
      discountType: item.discountType || null,
    }));
    req.session.cartTotal = cartTotal;
    req.session.netAmount = netAmount;
    req.session.totalDiscount = totalDiscount;
    console.log("req.session.offer ", req.session.offer);
    console.log("totalDiscount from get cart", totalDiscount);

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
   return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message:statusMessages.SERVER_ERROR});
  }
};

const addToCart = async (req, res) => {
  console.log("from add to cart");
  try {
    if (!req.session.user) {
      return res.json({ success: false, message: "User not registered" });
    }
    const user = req.session.user;
    const userId = user._id;

    const { productId } = req.body;
    console.log("product id is ", productId);

    if (!productId) {
      return res.json({ success: false, message: "Product id is not found" });
    }
    const quantity = req.body.quantity || 1;
    const subTotal = req.body.subTotal;

    if (!user) {
      return res.json({ success: false, message: "User not resistered" });
    }
    console.log("quantity is ", quantity);

    // Find the product and check stock
    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const productStock = product.stock;

    // Check if requested quantity exceeds available stock
    if (quantity > productStock) {
      return res.json({ success: false, message: "Out of stock" });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create a new cart if it doesn't exist
      cart = new Cart({ userId, items: [{ productId, quantity }] });
    } else {
      // Check if the product is already in the cart
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId,
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;

        if (cart.items[itemIndex].quantity > productStock) {
          return res.json({ success: false, message: "Out of stock" });
        } else if (cart.items[itemIndex].quantity > 5) {
          return res.json({
            success: false,
            message: "Cannot add more than 5 quantity of the same",
          });
        }
      } else {
        // Add the product to the cart if it's not already in
        cart.items.push({ productId, quantity, subTotal });
      }
    }

    // Save the cart after ensuring quantity is valid
    await cart.save();

    console.log("Product added to cart!");

    //remove the product from wishlist
    const wishList = await WishList.findOne({ userId });

    if (wishList) {
      const wishListItem = wishList.items.find(
        (item) => item.toString() == productId,
      );
      if (wishListItem) {
        wishList.items.pull(productId);
        await wishList.save();
      }
    } else {
      console.log("No wishlist found for user:", userId);
      // Optional: you could create a new wishlist document if needed
    }
    // Response after successfully adding to cart
    res.json({ success: true, message: "Product added to cart!" });
  } catch (error) {
    console.log("Error in Adding Cart", error);
    res.json({ success: false, message: "Something went wrong!" });
  }
};


const deleteCart = async (req, res) => {
  console.log("From delete Cart");
  const { productId } = req.params;
  const userId = req.session.user._id;

  console.log(`userId id ${userId} and product Id is ${productId}`);
  try {
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
      select: "productName price images stock categoryId",
    });
    if (!cart) {
      console.log("can't find cart");
    } else {
      console.log("cart found");
      cart.items = cart.items.filter(
        (item) => item.productId._id?.toString() !== productId,
      );

      await cart.save();
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
      req.session.netAmount = netAmount;
      req.session.totalDiscount = totalDiscount;

      req.session.discountAmount = 0;
      req.session.totalAmount = 0;
      req.session.code = "";
      console.log("removed from cart");
      const cartItems = cart.items
      return res.json({ success: true, message: "deleted from cart", cartItems, netAmount, totalDiscount });
    }
  } catch (error) {
    console.log("error in fetching cart");
    res.json({ success: false, message: "Error in ffetching cart" });
  }
};
module.exports={
    getCart,
    addToCart,
    deleteCart
}