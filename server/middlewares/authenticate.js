module.exports.authenticate = (req, res, next) => {
  console.log(req.session, "ap");
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};
