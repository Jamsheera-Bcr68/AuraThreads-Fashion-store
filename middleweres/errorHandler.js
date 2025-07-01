// const errorHandler = (err, req, res, next) => {
//   console.log("from error handler");

//   console.log("error is ", err);
//   const status = err.status || 500;
//   const message = err.message || "Some thing went wrong";
//   return res.status(status).json({ success: false, message });
// };

const errorHandler = (err, req, res, next) => {
  console.log("from error handler");
  console.log("error is ", err);

  const status = err.status || 500;
  const message = err.message || "Something went wrong";

  // If request is from browser (not API), render EJS view
  if (req.accepts('html')) {
    return res.status(status).render('error', {
      status,
      message,
    });
  }

  // Fallback: JSON for API or non-browser requests
  return res.status(status).json({ success: false, message });
};




module.exports = errorHandler;
