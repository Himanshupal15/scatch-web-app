const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");
const { getSecretKey } = require("../utils/generateToken");

module.exports = async function (req, res, next) {
  if (!req.cookies || !req.cookies.token) {
    req.flash("error", "You need to login first");
    return res.redirect("/");
  }

  try {
    const decoded = jwt.verify(req.cookies.token, getSecretKey());
    const user = await userModel.findOne({ email: decoded.email }).select("-password");

    if (!user) {
      res.clearCookie("token");
      req.flash("error", "Account not found. Please log in again.");
      return res.redirect("/");
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie("token");
    req.flash("error", "Session expired or invalid. Please login again.");
    return res.redirect("/");
  }
};