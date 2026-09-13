const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const ownerModel = require("../models/owner-model");
const productModel = require("../models/product-model");
const isOwnerLoggedIn = require("../middlewares/isOwnerLoggedIn");
const { generateOwnerToken } = require("../utils/generateToken");

// Owner Login Page
router.get("/login", function (req, res) {
  if (req.cookies && req.cookies.ownerToken) {
    return res.redirect("/owners/admin");
  }
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("owner-login", { error, success, loggedin: false });
});

// Owner Login Action
router.post("/login", async function (req, res) {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      req.flash("error", "Email and password are required.");
      return res.redirect("/owners/login");
    }

    email = email.trim().toLowerCase();

    const owner = await ownerModel.findOne({ email });
    if (!owner) {
      req.flash("error", "Invalid admin credentials.");
      return res.redirect("/owners/login");
    }

    // Support both hashed passwords and legacy plain text gracefully
    let isMatch = false;
    if (owner.password.startsWith("$2a$") || owner.password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, owner.password);
    } else {
      isMatch = password === owner.password;
      // Upgrade plain text password to bcrypt hash on successful login
      if (isMatch) {
        const salt = await bcrypt.genSalt(10);
        owner.password = await bcrypt.hash(password, salt);
        await owner.save();
      }
    }

    if (!isMatch) {
      req.flash("error", "Invalid admin credentials.");
      return res.redirect("/owners/login");
    }

    const ownerToken = generateOwnerToken(owner);
    res.cookie("ownerToken", ownerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.flash("success", `Welcome back to Admin Dashboard, ${owner.fullname}!`);
    res.redirect("/owners/admin");
  } catch (err) {
    console.error("Owner login error:", err);
    req.flash("error", "Unable to process login. Please try again.");
    res.redirect("/owners/login");
  }
});

// Owner Logout
router.get("/logout", function (req, res) {
  res.clearCookie("ownerToken");
  req.flash("success", "Admin logged out successfully.");
  res.redirect("/owners/login");
});

// Admin creation via web app is explicitly disabled for security
router.post("/create", function (req, res) {
  const message = "Administrator accounts cannot be created via the web application. Please provision administrators using the server CLI: npm run create-admin";
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.status(403).json({ error: "Forbidden", message });
  }
  return res.status(403).render("owner-login", {
    error: [message],
    success: [],
    loggedin: false,
  });
});

router.get("/create", function (req, res) {
  req.flash("error", "Administrator accounts cannot be created via the web app. Use the server CLI: npm run create-admin");
  return res.redirect("/owners/login");
});

// Admin Dashboard - View all products
router.get("/admin", isOwnerLoggedIn, async function (req, res) {
  try {
    const products = await productModel.find().sort({ _id: -1 });
    const success = req.flash("success");
    const error = req.flash("error");
    res.render("admin", {
      products,
      owner: req.owner,
      success,
      error,
      loggedin: true,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    req.flash("error", "Failed to load admin dashboard.");
    res.redirect("/shop");
  }
});

// Create Product Page
router.get("/create-product", isOwnerLoggedIn, function (req, res) {
  const success = req.flash("success");
  const error = req.flash("error");
  res.render("createproducts", {
    success,
    error,
    owner: req.owner,
    loggedin: true,
  });
});

module.exports = router;