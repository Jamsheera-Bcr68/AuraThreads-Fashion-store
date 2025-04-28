const mongoose=require('mongoose')
const transactionShema=new mongoose.Schema({
    amount: Number,
    type: String, // "credit" or "debit"
    date: { type: Date, default: Date.now },
    description: String
})

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    balance: { type: Number, default: 0 },
    transactions: [transactionShema]
  });
  
  module.exports = mongoose.model('Wallet', walletSchema);