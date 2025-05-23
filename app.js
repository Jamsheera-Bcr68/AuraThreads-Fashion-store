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
