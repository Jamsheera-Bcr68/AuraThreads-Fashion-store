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
