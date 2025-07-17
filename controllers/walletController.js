const Wallet=require('../model/walletModel');
const statusCodes = require('../utils/statusCodes');
const statusMessages = require('../utils/statusMessages');

const Cart=require('../model/cartModel')



// get wallet
const getWallet = async (req, res) => {
  console.log("from user wallet");

  try {
    const userId = req.session.user._id;
    if (!userId) {
      return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: 'Please login first' });
    }
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Wallet') });
    }
    let cart = []
    let cartCount = 0
    if (userId) {
      cart = await Cart.findOne({ userId });
      if (cart) {
        cartCount = cart.length || 0
      }
    }

    const debitLength = wallet.transactions.filter(
      (transaction) => transaction.type == "debit",
    ).length;
    const creditLength = wallet.transactions.filter(
      (transaction) => transaction.type == "credit",
    ).length;

    const recentTransactions = wallet.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // sort newest first
      .slice(0, 3);

    res.render("user/wallet", {
      categoryId: null,
      priceRange: null,
      cartCount,
      sort: "",
      query: "",
      title: "your Wallet",
      user: req.session.user,
      wallet,
      recentTransactions,
      debitLength,
      creditLength,
    });
  } catch (error) {
    console.log("error is ", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

//add money to wallet
const addMoney = async (req, res) => {
  console.log("from add money to wallet ");
  try {
    let { amount } = req.body;
    console.log("req.body ", req.body);

    if (!amount) {
      console.log("enter an amount");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: "Enter a amount" });
    }
    const userId = req.session.user._id;
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.log("Wallet is not found");
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Wallet')});
    }

    wallet.balance = wallet.balance + parseInt(amount);
    wallet.transactions.push({
      type: "credit",
      amount: parseInt(amount),
      date: new Date(),
      description: "Fund Added",
    });
    await wallet.save();
    return res.status(statusCodes.OK).json({ success: true, message: "Fund Added succesfully", balance: wallet.balance });
  } catch (error) {
    console.log("error is ", error);
    return res,status(statusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: statusMessages.SERVER_ERROR });
  }
};

const getTransactions=async(req,res)=>{
    console.log('fron user transactions');
    try {
            const userId = req.session.user._id;
    if (!userId) {
      return res.status(statusCodes.UNAUTHORIZED).json({ success: false, message: 'Please login first' });
    }
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(statusCodes.NOT_FOUND).json({ success: false, message: statusMessages.NOT_FOUND('Wallet') });
    }
    let cart = []
    let cartCount = 0
    if (userId) {
      cart = await Cart.findOne({ userId });
      if (cart) {
        cartCount = cart.length || 0
      }
    }

    const transactions=wallet.transactions.sort((a,b)=>b.date-a.date)
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
     const paginatedTransactions = transactions.slice(skip, skip + limit);
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

        res.render('user/transactions', {
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
       categoryId: null,
      priceRange: null,
      cartCount,
      sort: "",
      query: "",
      title: "your Wallet",
      user: req.session.user,
    });

    } catch (error) {
        console.log(error);
        return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:statusMessages.SERVER_ERROR})
    }
}

module.exports={
    getWallet,
    addMoney,
    getTransactions
}