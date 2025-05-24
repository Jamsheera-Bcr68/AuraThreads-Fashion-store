const express = require('express');
const app = express();
const bodyParser = require('body-parser');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('dashboard');
});

app.get('/products', (req, res) => {
    res.render('products');
});

app.get('/orders', (req, res) => {
    res.render('orders');
});

app.get('/users', (req, res) => {
    res.render('users');
});

app.get('/reports', (req, res) => {
    res.render('reports');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

let refundAmount = itemPrice * itemQuantity;
let actualRefundAmount = refundAmount;

if (order.items.length === 1) {
  console.log('Only one item in order.');

  if (order.isOfferApplied) {
    refundAmount -= order.offerDiscountAmount;
  }

  if (order.isCouponApplied) {
    refundAmount -= order.coupenDiscountAmount;
  }

  // Entire order is cancelled
  order.totalAmount = 0;
  order.finalAmount = 0;
  order.coupenDiscountAmount = 0;
  order.isCouponApplied = false;

} else {
  // More than one item in the order
  if (order.isCouponApplied) {
    const code = order.couponCode;
    const coupon = await Coupon.findOne({ coupenCode: code });

    if (coupon.minPurchase > (order.totalAmount - actualRefundAmount)) {
      // Coupon no longer valid after refund
      order.totalAmount -= actualRefundAmount;

      refundAmount -= order.coupenDiscountAmount; // Reduce refund
      order.finalAmount -= refundAmount;

      // Remove coupon
      order.finalAmount += order.coupenDiscountAmount; // restore amount
      order.coupenDiscountAmount = 0;
      order.isCouponApplied = false;
    } else {
      order.totalAmount -= actualRefundAmount;
      order.finalAmount -= refundAmount;
    }

  } else {
    // No coupon applied, normal refund
    order.totalAmount -= actualRefundAmount;
    order.finalAmount -= refundAmount;
  }
}

// Final checks
if (order.finalAmount < 0) {
  order.finalAmount = 0;
}

// Check if all items cancelled
const allItemsCancelled = order.items.every(item => item.status === 'cancelled');
if (allItemsCancelled) {
  order.status = 'cancelled';
}

await order.save();



 let orderItems = await Promise.all(cart.items.map(async (item) => {
      const product = await Product.findById(item.productId).populate('categoryId');

      // Simulate logic for getting final offer (you should already have this logic)
      let finalOffer = null;
      let offerDiscount = 0;

      const categoryOffer = await Offer.findOne({ categoryId: product.categoryId, isActive: true });
      const productOffer = await Offer.findOne({ productId: product._id, isActive: true });

      if (productOffer && categoryOffer) {
        finalOffer = (productOffer.discount > categoryOffer.discount) ? productOffer : categoryOffer;
      } else if (productOffer) {
        finalOffer = productOffer;
      } else if (categoryOffer) {
        finalOffer = categoryOffer;
      }

      if (finalOffer) {
         if(finalOffer.discountType=='amount'){
          offerDiscount =item.quantity * finalOffer.discountValue

         }else if(finalOffer.discountType=='percentage'){
          offerDiscount=(product.price * finalOffer.discount * item.quantity) / 100;
         }
        
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        offerId: finalOffer ? finalOffer._id : null,
        offerApplied: finalOffer ? true : false,
        offerDiscount: offerDiscount,
      };
    }))