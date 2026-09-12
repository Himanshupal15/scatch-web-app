const jwt = require("jsonwebtoken");
const ownerModel = require("../models/owner-model");
const { getSecretKey } = require("../utils/generateToken");

module.exports = async function (req, res, next) {
  if (!req.cookies || !req.cookies.ownerToken) {
    req.flash("error", "Admin access required. Please login.");
    return res.redirect("/owners/login");
  }

  try {
    const decoded = jwt.verify(req.cookies.ownerToken, getSecretKey());
    const owner = await ownerModel.findOne({ email: decoded.email }).select("-password");

    if (!owner) {
      res.clearCookie("ownerToken");
      req.flash("error", "Admin account not found. Please log in again.");
      return res.redirect("/owners/login");
    }

    req.owner = owner;
    next();
  } catch (err) {
    res.clearCookie("ownerToken");
    req.flash("error", "Admin session expired. Please login again.");
    return res.redirect("/owners/login");
  }
};
