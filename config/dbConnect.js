// dbConnect.js
const mongoose = require('mongoose');

const dbConnect = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/ecommerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('DB connected successfully');
    } catch (error) {
        console.log('Database Error:', error);
    }
}

module.exports = dbConnect;
