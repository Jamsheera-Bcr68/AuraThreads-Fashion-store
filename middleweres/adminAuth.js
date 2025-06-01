// middleware/auth.js
const adminAuth = (req, res, next) => {
  if (req.session && req.session.admin) {
    next(); // Continue to the next middleware or route
  } else {
    res.redirect("/admin/login");
  }
};
module.exports = adminAuth;
