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

  try {
    let { email, password, phone } = req.body;
    console.log(`emil is${email} password is ${password} and phone is ${phone}`);

    let hashedPassword = await bcrypt.hash(password, 10);
    console.log('hashed pwd' + hashedPassword);

    const userExist = await User.findOne({ email });


    if (userExist) {
      console.log("User already exists");
      return res.render("user/userLogin", {
        errorMessage: "User Already registered",
      });
    } else {
      // Generate OTP
      console.log('User not existing');

      const otp = generateOTP()
      req.session.otp = otp //store otp in session
      req.session.userData = { email, password,phone }; // Store user data temporarily

      //send otp through email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Account Verification",
        text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
      };

       await transporter.sendMail(mailOptions);
       console.log('otp send to email');
       return res.json({success:true,message:'check your mail for OTP'})
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

const varifyOtp = async (req, res) => {
  console.log('from varify otp');
  
  let { otp } = req.body;
  console.log('req.body otp is ',otp);
  
 
  console.log('session otp is ',req.session.otp);
  
  try {
    if (!req.session.otp || !req.session.userData) {
      return res.json({ success: false, message: "Session expired. Please register again." });
    }
  
    console.log('typ of session otp is ',typeof(req.session.otp));
    
    console.log('otp is ',otp);
    if (otp !== req.session.otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // OTP is correct → Hash password & save user
    const isVerified=true
    const { name, email, password,phone } = req.session.userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ phone,name, email, hashedPassword,isVerified });
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
      return res.render("user/userLogin", { error: "Error in finding user" });
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


//  Send OTP
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 2 * 60 * 1000 }; // 5-minute expiry

    // Send email with OTP
    await transporter.sendMail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 1 minutes.`,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};


//  Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    // Check if OTP was previously generated
    if (!otpStore[email]) {
      return res
        .status(400)
        .json({ message: "No OTP request found for this email" });
    }

    const newOtp = generateOTP();
    otpStore[email] = { otp: newOtp, expiresAt: Date.now() + 1 * 60 * 1000 };

    // Send new OTP email
    await transporter.sendMail({
      to: email,
      subject: "Your New OTP Code",
      text: `Your new OTP is ${newOtp}. It expires in 1 minutes.`,
    });

    res.json({ message: "New OTP sent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

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
      //   user.addresses= [{
      //     name: "John Doe",
      //     street: "123 Main Street",
      //     city: "New York",
      //     state: "NY",
      //     zip: "10001",
      //     phone: "+1 234 567 890"
      // }];


      const orders = [
        {
          _id: "1",
          itemCount: 3,
          total: 45.99,
          estimatedDelivery: new Date("2025-03-25"),
          status: "Shipped"
        },
        {
          _id: "2",
          itemCount: 2,
          total: 29.49,
          estimatedDelivery: new Date("2025-03-27"),
          status: "Processing"
        },
        {
          _id: "3",
          itemCount: 5,
          total: 79.99,
          estimatedDelivery: new Date("2025-03-30"),
          status: "Delivered"
        }
      ];
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
        select: 'productName price images'
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
    const quantity = req.body.quantity || 1;

    console.log('quantity is ', quantity);

    // Find the product and check stock
    const product = await Product.findById(productId);

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
        cart.items.push({ productId, quantity });
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
    const cart = await Cart.findOne({ userId });
    const product = await Product.findById(productId);

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

}

module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  getHome,
  sendOTP,
  varifyOtp,
  resendOTP,
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
  getOtp
}

