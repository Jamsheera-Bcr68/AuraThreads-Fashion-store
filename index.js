const express = require("express");
const app = express();
const path = require("path");
const dbConnect = require("./config/dbConnect");
const product = require("./model/productModel");
const dotenv = require("dotenv").config();
const passport = require("./config/passport");
const session = require("express-session");
const flash = require("connect-flash");
const cors = require("cors");
const nocache = require("nocache");
const errorHandler = require("./middleweres/errorHandler");

const cookieParser = require("cookie-parser");
const morgan = require("morgan");

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
dbConnect();
app.use(cookieParser());
app.use(morgan('dev'));

app.use("/uploads", express.static("uploads"));

app.get('/', (req, res) => {
  res.redirect('/user/home');
});

// Set the view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files like CSS and images
app.use(express.static(path.join(__dirname, "public")));
app.use("/css", express.static(__dirname + "public/css"));
app.use("/js", express.static(__dirname + "public/js"));
app.use("/images", express.static(__dirname + "public/images"));
app.use(
  session({
    secret: "admin",
    resave: false,
    saveUninitialized: false,
  })
);



app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.use(nocache());

// Apply no-cache headers middleware
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

//using flash for temporarly storing messages when redirecting success,warning,failure situations
app.use(flash());
app.use((req, res, next) => {
  res.locals.errorMessage = req.flash("errorMessage");
  res.locals.successMessage = req.flash("successMessage");
  next();
});

//adminroute
const adminRoute = require("./routes/admin");
const userRoute = require("./routes/user");
const productRoute = require("./routes/product");
const searchRoute = require("./routes/search");

app.use("/admin", adminRoute);
app.use("/user", userRoute);

app.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("Google authentication successful!--------");
  res.redirect("/user/setPassword"); 
  },
);

userRoute.use((req, res, next) => {
  res.locals.user = req.session.user;  // or however you store user info
  next();
});


app.use("/product", productRoute);
app.use("/search", searchRoute);

app.use((req, res, next) => {
  const err = new Error("Page Not Found");
  err.status = 404;
  next(err); // Pass to errorHandler
});

app.use(errorHandler);

const HOST = '0.0.0.0';
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
