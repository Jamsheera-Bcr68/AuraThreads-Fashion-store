const errorHandler = (err, req, res, next) => {
  console.log("from error handler");

  console.log("error is ", err);
  const status = err.status || 500;
  const message = err.message || "Some thing went wrong";
  return res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
