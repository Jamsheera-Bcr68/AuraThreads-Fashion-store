const userAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    req.session.redirectTo = req.originalUrl;
    console.log(req.session.redirectTo);

    res.redirect("/user/login");
  }
};
module.exports = userAuth;
