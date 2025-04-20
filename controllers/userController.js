const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const Product = require("../model/productModel");
const transporter = require("../config/nodeMailer");
//const otpGenerator = require("otp-generator");
const category = require('../model/categoryModel')
const userAuth = require('../middleweres/userAuth');
const { default: mongoose } = require("mongoose");
const Cart = require('../model/cartModel');
const Address = require('../model/addressModel');
const { use } = require("passport");
const Order = require('../model/orderModel')


//get Register
const getRegister = async (req, res) => {
  console.log('from user registeration');

  res.render("user/register", { errorMessage: null });
};

//  Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

//Handle post Register
const postRegister = async (req, res) => {
  console.log('from post register');
  console.log('this ia google regiser');

  try {
    let { email, password, phone } = req.body;
    console.log(`emil is${email} password is ${password} and phone is ${phone}`);

    let hashedPassword = await bcrypt.hash(password, 10);
    console.log('hashed pwd' + hashedPassword);

    const userExist = await User.findOne({ email });


    if (userExist) {
      console.log("User already exists");
      return res.json({ success: false, message: "User alredy exist" })
      // return res.render("user/userLogin", {
      //   errorMessage: "User Already registered",
      // });
    } else {
      // Generate OTP
      console.log('User not existing');

      const otp = generateOTP()
      req.session.otp = otp //store otp in session
      req.session.userData = { email, password, phone }; // Store user data temporarily

      //send otp through email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Account Verification",
        text: `Your OTP is: ${otp}. It is valid for 1 minutes.`,
      };

      await transporter.sendMail(mailOptions);
      console.log('otp send to email');
      return res.json({ success: true, message: 'check your mail for OTP' })
      // Store user data temporarily with OTP (but not verified yet)
      // const newUser = new User({
      //   email,
      //  hashedPassword,
      //   phone,
      //   isVerified: false,
      // })

      // await newUser.save();
      // res.redirect('/user/home')

    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server error");
  }
}

//google signup user set password 
const getSetPassword = async (req, res) => {
  console.log('this is from google user signup set password');
  console.log('req.session.passport.user is ', req.session.passport.user);
  const userId = req.session.passport.user
  const user = await User.findOne({ _id: userId })
  console.log('user found ', user);
  const email = user.email

  console.log('email is ', email);

  res.render('user/setPassword', { email })
}


//post set password
const postSetPassword = async (req, res) => {
  console.log('from post set password');
  try {
    const { password, confirmPassword, email } = req.body
    console.log('pwd,confirm pwd', password, confirmPassword);

    if (password == '' || confirmPassword == "") {
      return res.json({ success: false, message: 'Both field are required' })
    }
    if (password !== confirmPassword) {
      return res.json({ success: false, message: 'Paswords are not matching' })
    }
    const user = await User.findOne({ email })
    console.log('google user is ', user);

    if (!user) {
      console.log('user not found');

      return res.json({ success: false, message: "User not found" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    user.hashedPassword = hashedPassword
    await user.save()
    return res.json({ success: true, message: "Passwrd set successfully" })
  } catch (error) {
    console.log('error is', error)
    return res.json({ success: false, message: "error in fetching email" })
  }
}

//getOtp page
const getOtp = async (req, res) => {
  try {
    console.log('from get otp');
    return res.render('user/otp');
  } catch (error) {
    console.log('Error rendering OTP page:', error);
    res.status(500).send('Internal Server Error');
  }
};


//  Send OTP
const sendOTP = async (req, res) => {
  console.log('from send otp');

  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 1 * 60 * 1000 }; // 5-minute expiry

    // Send email with OTP
    await transporter.sendMail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 1 minutes.`,
    });

    console.log("OTP sent successfully");

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};


//otp verification
const varifyOtp = async (req, res) => {
  console.log('from varify otp');

  let { otp } = req.body;
  console.log('req.body otp is ', otp);


  console.log('session otp is ', req.session.otp);

  try {
    if (!req.session.otp || !req.session.userData) {
      return res.json({ success: false, message: "OTP expired. Please register again." });
    }

    console.log('typ of session otp is ', typeof (req.session.otp));

    console.log('otp is ', otp);
    if (otp !== req.session.otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // OTP is correct → Hash password & save user
    const isVerified = true
    const { name, email, password, phone } = req.session.userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ phone, name, email, hashedPassword, isVerified });
    await newUser.save();

    // Clear session
    req.session.otp = null;
    req.session.userData = null;

    return res.json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.log('error happened', error);
    return res.json({ success: false, message: 'some thing went wrong' })
  }
}

//resend OTP
const resendOtp = async (req, res) => {
  console.log('from resent otp page');
  console.log(req.session.userData);

  try {
    const email = req.session.userData?.email;
    if (!email) return res.status(400).json({ message: "Email is required" });
    req.session.userData.otp = null
    const newOtp = generateOTP();
    req.session.otp = newOtp;
    otpStore[email] = { otp: newOtp, expiresAt: Date.now() + 60 * 1000 }; // 1 minute validity

    await transporter.sendMail({
      to: email,
      subject: "Your New OTP Code",
      text: `Your new OTP is ${newOtp}. It expires in 1 minute.`,
    });
    console.log('new otp send succesfully');

    res.json({ message: "New OTP sent successfully", expiresAt: otpStore[email].expiresAt });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};


// get login
const getLogin = async (req, res) => {
  res.render("user/userLogin", { errorMessage: null });
};

//Handle post login

const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    //finding the url to redirect
    const redirectTo = req.session.redirectTo || "/user/home";
    console.log('redirectTo', redirectTo);
    delete req.session.redirectTo;
    const user = await User.findOne({ email });


    if (!user) {
      return res.render("user/userLogin", { errorMessage: "You are not registered" });
    } else {
      const isMatch = await bcrypt.compare(password, user.hashedPassword);
      console.log(isMatch);

      if (isMatch) {
        req.session.user = user
        req.session.save((err) => {
          if (err) {
            console.log('errror in saving user' + err);
          }
        })
        return res.redirect(redirectTo);
      } else {
        res.render("user/userLogin", {
          errorMessage: "Password is not Matching",
        });
      }
    }
  } catch (error) {
    console.log("error in finding user");
    console.log(error);
  }
};

const getHome = async (req, res) => {
  const categories = await category.find({ isDeleted: false, categoryName: { $in: ['Mens', 'Womens', 'Kids'] } }).limit(3)
  console.log(categories + 'categories');

  console.log('category images', categories[0].images);

  categories.forEach(item => item.images.forEach(image => image.replace(/\\/g, '/')))
  // console.log('category images after updata',categories[0].images);

  const womenCategory = await category.findOne({ isDeleted: false, categoryName: 'Womens' }, { _id: 1 })
  //console.log('womenCategory is'+womenCategory.id);
  const womenProducts = await Product.find({ isDeleted: false, categoryId: womenCategory.id });
  //   womenProducts.forEach(product => {
  //   product.images = product.images.map(image => image.replace(/\\/g, '/'));
  //  });
  // console.log(womenProducts[0].images[0])

  const mensCategory = await category.findOne({ isDeleted: false, categoryName: 'Mens' }, { _id: 1 })

  const mensProducts = await Product.find({ isDeleted: false, categoryId: mensCategory.id }).limit(3)
  mensProducts.forEach(product => {
    product.images = product.images.map(image => image.replace(/\\/g, '/'));
  });


  const kidsCategory = await category.findOne({ isDeleted: false, categoryName: 'Kids' }, { _id: 1 })
  console.log('kids category id is' + kidsCategory.id);
  const kidsProducts = await Product.find({ isDeleted: false, categoryId: kidsCategory.id }).limit(3)
  console.log('kids products are ' + kidsProducts);
  console.log('kids images are ', kidsProducts[0].images);

  console.log('user found', req.session.user);
  let cartCount = 0
  if (req.session.user) {
    const user = req.session.user
    const userId = user._id
    const cart = await Cart.findOne({ userId })
    if (cart) {
      cartCount = cart.items.length
      console.log('cart count is ', cartCount);
    }


  }

  res.render("user/home", {
    errorMessage: null, cartCount: 2,
    page: "home",
    cartCount: cartCount || '',
    categoryId: null, priceRange: null, sort: null, query: null,
    user: req.session.user || '',
    categories, womenProducts
    , mensProducts, kidsProducts
  });

};

const otpStore = {}; //  OTP store temporarly





const getAccount = async (req, res) => {
  console.log('from user profile');
  const userId = req.session.user._id
  console.log('user Id is ' + userId);

  //fetch user
  try {
    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) })
    console.log('user is ', user);

    if (!user) {
      console.log('user not exist');
      res.redirect('/user/home')
    } else {
      const addresses = await Address.find({ userId })

      //fetching orders
      const orders = await Order.find({ userId }).populate('items.productId').sort({ createdAt: -1 })
      if (!orders) {
        console.log("orders are not found");

        res.json({ success: false, message: "orders are not found" })
      }

      const cancelReasons = ['reason1', 'reason2', 'reason3']

      //get cart count
      let cartCount = 0
      const cart = await Cart.findOne({ userId })
      if (cart) {
        cartCount = cart.items.length
        console.log('cart count is ', cartCount);
      } else {
        console.log('cart not fount');

      }


      res.render('../views/user/account',
        {
          errorMessage: null,
          categoryId: null,
          page: 'Accounts',
          priceRange: null,
          cartCount,
          user,
          addresses,
          orders,
          cancelReasons,

          sort: null, query: null
        })
    }
  } catch (error) {
    console.log('error in fetching user' + error);
    res.redirect('/user/home')
  }
}

//add address
const addAddress = async (req, res) => {
  console.log('from add adress');
  const { label, line1, line2, city, state, zip, country, phone } = req.body
  console.log(` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`);
  const isDefault = req.body.isDefault || false
  console.log(`is defsult is ${isDefault}`);

  try {
    const userId = req.session.user._id
    console.log('user is ', userId);

    // If isDefault is true, update all other addresses to false for the same user
    if (isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
      const newAddress = new Address({ userId, line1, line2, phone, city, state, zip, country, isDefault })
      await newAddress.save()
      console.log('adress saved as default');

      return res.status(201).json({ message: "Address added successfully", });

    } else {
      const newAddress = new Address({ userId, line1, line2, phone, city, state, zip, country, isDefault })
      await newAddress.save()
      console.log('adress is saves as not default');
      return res.status(201).json({ message: "Address added successfully", });

    }

  } catch (error) {
    console.log('error in fetching adress', error);
    return res.json({ success: false, message: 'error in fetching adress' })
  }
}

//edit adress
const editAddress = async (req, res) => {

  const addressId = req.params.editAddressId
  console.log('address id is ', addressId);

  const { label, line1, line2, city, state, zip, country, phone } = req.body
  console.log(`Address id is ${addressId} ant type is ${typeof (addressId)}`);
  console.log(` label is ${label} line1 is ${line1} line2 is ${line2} city is ${city} state is ${state} zip is ${zip} country is ${country} phone is ${phone}`);
  const isDefault = req.body.isDefault || false
  console.log(`is defsult is ${isDefault}`);
  const userId = req.session.user._id
  try {
    console.log('euser id is ', userId);


    const address = await Address.findOne({ _id: new mongoose.Types.ObjectId(addressId) });

    if (!address) {
      console.log('address not found');

      return res.json({ success: false, message: 'address not found' })
    } else {
      console.log('address fount');
      if (isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
      }
      address.label = label,
        address.line1 = line1
      address.line2 = line2
      address.city = city
      address.state = state
      address.zip = zip
      address.country = country
      address.phone = phone

      await address.save()
      console.log('adress saved successfully');
      return res.json({ success: true, message: "Addres edited successfully" })
    }
  } catch (error) {
    return res.json({ success: false, message: 'error in fetching address' })
  }
}

//delete address
const deleteAddress = async (req, res) => {
  console.log('from user delete adress');
  const addressId = req.params.addressId
  console.log('addressid is'), addressId;

  try {

    const address = await Address.findOneAndDelete({ _id: addressId })
    if (!address) {
      console.log('address not fount');
      return res.json({ success: false, message: 'Address not Found' })
    } else {
      console.log('account deleted success fully');
      return res.json({ success: true, message: 'Address Deleted Successfully' })
    }
  } catch (error) {
    console.log('error in fetching address', error);

    res.json({ success: false, message: 'error in fetching address' })
  }
}
//edit profile'

const updateUser = async (req, res) => {
  console.log('from user update');

  const { fullName, email, phone, dob } = req.body
  const userId = req.session.user._id
  console.log(`fulname is ${fullName} .email is ${email} ,phone is ${phone} ,dob is ${dob} userid is ${userId}`);

  try {
    const user = await User.findOne({ _id: userId })
    console.log(`user found`);

    if (!user) {
      console.log('user not found');
      return res.json({ success: false, message: 'user not found' })

    } else {
      user.fullName = fullName
      user.email = email
      user.phone = phone
      user.dob = dob
      user.save()
      console.log('user saved succes fully');
      return res.json({ success: true, message: "user profile updated" })
    }

  } catch (error) {
    console.log('error in fetching user');
    return res.json({ success: false, message: "error in fetching user" })

  }
}
const getCart = async (req, res) => {
  let cartCount = 0
  console.log('this is from get cart');
  try {
    const user = req.session.user
    const userId = user._id
    console.log('user id is ', userId);
    let title

    let cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        model: 'Product',
        select: 'productName price images stock'
      })
    if (!cart) {
      console.log('No existing cart');
      try {
        cart = new Cart({ userId: userId, items: [] })
        console.log('new empty cart is created');

      } catch (error) {
        console.log('error in creating new cart' + error);

      }
      await cart.save();

    }

    console.log("Cart Items:", JSON.stringify(cart.items, null, 2));
    cart.items.forEach(item => {
      if (item.productId.images && item.productId.images.length > 0) {
        item.productId.images = item.productId.images.map(image => image.replace(/\\/g, '/'));
      }
    });
    cartCount = cart.items.length
    title = cart.items.length > 0 ? `Displaying your ${cartCount} cart itmes` : 'Your cart is empty'

    return res.render('../views/user/cart', {
      errorMessage: null,
      categoryId: null,
      priceRange: null,
      cart,
      title,
      cartCount,
      user: req.session.user || '',
      sort: null, query: null
    })

  } catch (error) {
    console.log('error n fetching cart', error);
    res.json({ success: false, message: 'Error in fetching cart' })

  }

}

const addToCart = async (req, res) => {
  console.log('from add to cart');
  try {
    const user = req.session.user;
    const userId = user._id;
    const { productId } = req.body;
    console.log('product id is ',productId);
    
    const quantity = req.body.quantity || 1;
    const subTotal = req.body.subTotal

    if (!user) {
      return res.json({ success: false, message: "User not resistered" })
    }
    console.log('quantity is ', quantity);

    // Find the product and check stock
    const product = await Product.findOne({_id:productId});

    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }

    const productStock = product.stock;

    // Check if requested quantity exceeds available stock
    if (quantity > productStock) {
      return res.json({ success: false, message: 'Out of stock' });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create a new cart if it doesn't exist
      cart = new Cart({ userId, items: [{ productId, quantity }] });
    } else {
      // Check if the product is already in the cart
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

      if (itemIndex > -1) {

        cart.items[itemIndex].quantity += quantity;


        if (cart.items[itemIndex].quantity > productStock) {
          return res.json({ success: false, message: 'Out of stock' });
        }
      } else {
        // Add the product to the cart if it's not already in
        cart.items.push({ productId, quantity, subTotal });
      }
    }

    // Save the cart after ensuring quantity is valid
    await cart.save();

    console.log("Product added to cart!");

    // Response after successfully adding to cart
    res.json({ success: true, message: "Product added to cart!" });

  } catch (error) {
    console.log('Error in Adding Cart', error);
    res.json({ success: false, message: "Something went wrong!" });
  }
};


const deleteCart = async (req, res) => {
  console.log("From delete Cart");
  const { productId } = req.params
  const userId = req.session.user._id

  console.log(`userId id ${userId} and product Id is ${productId}`);
  try {
    const cart = await Cart.findOne({ userId })
    if (!cart) {
      console.log("can't find cart");

    } else {
      console.log('cart found');
      cart.items = cart.items.filter(item => item.productId.toString() !== productId)

      await cart.save()
      console.log('removed from cart');
      return res.json({ success: true, message: 'deleted from cart' })

    }
  } catch (error) {
    console.log("error in fetching cart");
    res.json({ success: false, message: 'Error in ffetching cart' })
  }

}

const updateCart = async (req, res) => {
  console.log('from updateCart');
  console.log('Received Params:', req.params);  // Log received params

  const { productId } = req.params;
  const quantity = parseInt(req.params.quantity);

  // Validate request parameters
  if (!productId || isNaN(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: "Invalid request data" });
  }

  try {
    console.log(`Updating product ${productId} with quantity ${quantity}`);
    const userId = req.session.user._id;

    // Find cart and product

    const product = await Product.findById(productId);
    const cart = await Cart.findOne({ userId });
    const price = product.price
    const subTotal = price * quantity
    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const productStock = product.stock;

    // Find item in cart
    const item = cart.items.find(item => item.productId.toString() === productId);

    if (!item) {
      return res.json({ success: false, message: "Item not found in your cart" });
    }

    console.log('Item found in cart');

    // Ensure quantity does not exceed stock before updating
    if (quantity > productStock) {
      console.log('Out of stock, requested quantity:', quantity);
      return res.json({ success: false, message: "Out of stock" });
    }

    // Update quantity
    item.quantity = quantity;
    item.subTotal = subTotal

    // Save cart update
    await cart.save();
    console.log('Cart saved successfully');

    return res.status(200).json({ success: true, message: "Cart updated successfully" });

  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  console.log('from user forgot password');

  const { currentPassword, newPassword, confirmPassword } = req.body
  console.log('currentPassword,newPassword,confirmPassword', currentPassword, newPassword, confirmPassword);

  try {
    const userId = req.session.user._id
    console.log('User id is ', userId);
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.json({ success: false, message: 'user not found' })
    }
    const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword)
    console.log('Is match ', isMatch);

    if (!isMatch) {
      return res.json({ success: false, message: 'Wrong Password' })
    }
    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: 'Password is not matching' })
    }
    console.log('user found', user);

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = newHashedPassword
    await user.save()
    console.log('new Uswr is ', user);

    return res.json({ success: false, message: 'Password updated successfully' })

  } catch (error) {
    console.log(error, "This is the error");
    return res.json({ success: false, message: 'Error in fetching user' })
  }

}

const getCheckout = async (req, res) => {
  console.log("this is from user checkout page");
  const userId = req.session.user._id
  if (!userId) {
    return res.json({ success: false, message: "user not fount" })
  }
  const user = await User.findOne({ _id: userId })
  if (!user) {
    console.log('User is not found');

    return res.json({ success: false, message: "user not found" })
  }


  const cart = await Cart.findOne({ userId }).populate('items.productId')
  if (cart) {
    cartCount = cart.items.length
    console.log('cart count is ', cartCount);
  } else {
    console.log('cart not fount');

  }

  const shipping = 'shipping charge'
  let totalAmount = 0;
  let subTotal = 0
  let cartItems = cart.items.map(item => {
    subTotal = item.productId.price * item.quantity;
    totalAmount += subTotal;

    return {
      productName: item.productId.productName,
      price: item.productId.price,
      quantity: item.quantity,
      subTotal,
      totalAmount,
      shipping,
      images: item.productId.images
    };
  })
  //fetching address

  const addresses = await Address.find({ userId })
  if (!addresses) {
    return res.json({ success: false, message: "You dont have any saved address" })
  }

  return res.render('user/userCkeckout', {
    categoryId: null,
    priceRange: null,
    cartCount: cartCount || '',
    user: req.session.user || '',
    sort: null, query: null,
    addresses: addresses || "",
    user,
    cartItems,

    totalAmount
  })
}

const placeOrder = async (req, res) => {
  console.log('from place order');

  try {
    const { paymentMethod, paymentDetails, totalAmount } = req.body
    let addressId = req.body.addressId?.trim();
    //validatiing essential fields
    if (addressId == '' || paymentMethod == '' || totalAmount == '') {
      console.log('missing reuired fileds', addressId, paymentMethod, paymentDetails, totalAmount);

      return res.status(400).send('Missing required fields');
    }
    console.log("address id ", addressId, ' type ', typeof (addressId));
    addressId = new mongoose.Types.ObjectId(addressId)
    console.log("address id ", addressId, 'new type ', typeof (addressId));
    console.log('paymentDetails', paymentDetails);
    let { upiId, cardNumber, expiry, cvv, cardName } = paymentDetails
    if (paymentMethod == 'Credit Card') {
      if (cardNumber == '' || expiry == '' || cvv == '' || cardName == '') {
        return res.json({ success: false, message: 'Payment details are missing' })
      }
    } else if (paymentMethod == 'UPI') {
      upiId = paymentDetails?.upiId;
      if (!upiId) {
        return res.json({ success: false, message: 'UPI id is missing' })
      }
      console.log(upiId);

    } else { }


    //fetching full address from database

    const address = await Address.findById(addressId);
    if (!address) {
      console.log('address is not found');
      return res.json({ success: false, message: 'Selected address is not found' })
    }
    //getting cartItems
    // console.log('user is ',req.session.user);

    const userId = req.session.user._id
    const cart = await Cart.findOne({ userId })
    console.log('cart is ', cart);

    console.log('Cart items are ', cart.items);

    if (!cart) {
      return res.json({ success: false, message: "Cart  is not found" })
    }

    //checking product availability
    let items = cart.items

    for (let item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      if (product.stock < item.quantity) {
        console.log('the product is out of stock from route');
        
        return res.status(400).json({
          success: false,
          message: ` ${product.productName} is out of stock`
        });
      }
    }

    const createdAt = new Date();
    const deliveryDate = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000); // Add 5 days


    //creating new order document
    const order = new Order({
      userId: req.session.user._id,
      address,
      paymentMethod,
      totalAmount,
      status: paymentMethod === 'COD' ? 'Pending' : 'Processing',
      paymentDetails: paymentMethod == 'Credit Card' ? {
        cardNumber,
        expiry,
        cvv,
        cardName
      } : paymentMethod == 'UPI' ? {
        upiId
      } : null,

      items: cart.items,
      createdAt,
      deliveryDate
    })
    await order.save()
    for (let item of cart.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // making cart empty
    await Cart.updateOne({ userId }, { $set: { items: [] } });

    console.log('order save succesfully,order._id', order._id);

    return res.json({
      success: true,
      message: "Order completed successfully",
      orderId: order._id  //this line sends the ID to frontend
    });


  } catch (error) {
    console.log('error in placing order', error);
    return res.json({ success: false, message: "Error in placing order" })
  }

}

const getOrderSuccess = async (req, res) => {
  try {
    console.log('from order success page');
    const orderId = req.query.orderId;
    console.log("order id is ", orderId);
    console.log('type of order id ', typeof (orderId))


    const order = await Order.findOne({ _id: orderId }).populate('items.productId')
    console.log('order.items', order.items);



    res.render('user/orderSuccess', { title: 'Order Success', order })
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong');
  }
}

//user get all orders page

const getOrders = async (req, res) => {
  console.log('from user all orders page');
  try {
    const userId = req.session.user._id
    if (!userId) {
      console.log("user not found");

      res.json({ success: false, message: "User not found" })
    }
    const orders = await Order.find({ userId }).populate('items.productId').sort({ createdAt: -1 })
    if (!orders) {
      console.log("orders are not found");

      res.json({ success: false, message: "orders are not found" })
    }
    console.log('your orders are ', orders);

    //get cart count
    const cart = await Cart.findOne({ userId }).populate('items.productId')
    if (cart) {
      cartCount = cart.items.length
      console.log('cart count is ', cartCount);
    } else {
      console.log('cart not fount');

    }

    res.render('user/userOrders', {
      title: "see Your All-Orders",
      orders,
      categoryId: null,
      priceRange: null,
      cartCount: cartCount || '',
      user: req.session.user || '',
      sort: null, query: null,
    })
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "error in fetching orders" })
  }
}

//get order details page
const getOrderDetails = async (req, res) => {
  console.log('from user order details page');
  try {
    const orderId = req.params.orderId
    console.log(' orderId ', orderId);

    //fetching orders
    const order = await Order.findOne({ _id: orderId }).populate('items.productId')
    if (!order) {
      res.json({ success: false, message: "Order not found" })
    }
    res.render('user/orderDetails', { title: "order details page", order })
  } catch (error) {
    console.log('error:', error);
    res.json({ success: false, message: "Error in fetching order detais" })
  }
}

//delete order
const deleteOrder = async (req, res) => {
  console.log('form order delete route');
  try {
    let orderId = req.params.orderId
    console.log('order id ', orderId);
    if (!orderId) {
      console.log('order id is not fount');
      return res.json({ success: false, message: "order id is not getting" })
    }
    orderId = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({ _id: orderId })
    order.status = "cancelled"
    order.save()

    // restoring stock

    for(item of order.items){
      const product=await Product.findById(item.productId)
      console.log(`user cancelling before restoring ${product.productName} is ${product.stock}`);
      product.stock=product.stock+item.quantity
       await product.save()
       console.log(`after restoring ${product.productName} is ${product.stock}`);
    }

    console.log('order cancelled succeccfully');
    return res.json({ success: true, message: 'Order cancelled successfully' })

  } catch (error) {
    console.log('error is ', error);
    return res.json({ success: false, message: "error in deleteing cart" })
  }
}

const logout=async (req,res)=>{
  console.log('from user logout');
  try {
    req.session.user=null
    return res.json({success:true,message:'User Logout Successfull'})
  } catch (error) {
    console.log(error);
    res.json({success:false,message:"Error in user logout"})
  }

}
module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  getHome,
  sendOTP,
  varifyOtp,
  resendOtp,
  getAccount,
  getCart,
  addToCart,
  getCheckout,
  deleteCart,
  updateCart,
  addAddress,
  updateUser,
  editAddress,
  deleteAddress,
  changePassword,
  getOtp,
  getSetPassword,
  postSetPassword,
  placeOrder,
  getOrderSuccess,
  getOrders,
  getOrderDetails,
  deleteOrder,
  logout
}

