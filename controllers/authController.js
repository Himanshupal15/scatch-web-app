const userModel = require("../models/user-model");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async function (req, res) {
  try {
    let { email, password, fullname } = req.body;

    if (!email || !password || !fullname) {
      req.flash("error", "All fields are required.");
      return res.redirect("/");
    }

    email = email.trim().toLowerCase();
    fullname = fullname.trim();

    if (password.length < 6) {
      req.flash("error", "Password must be at least 6 characters long.");
      return res.redirect("/");
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      req.flash("error", "This email is already registered. Please login.");
      return res.redirect("/");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const createdUser = await userModel.create({
      email,
      password: hashedPassword,
      fullname,
    });

    const token = generateToken(createdUser);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.flash("success", "Account created successfully! Welcome to Scatch.");
    return res.redirect("/shop");
  } catch (err) {
    console.error("Registration error:", err);
    req.flash("error", "Unable to create account. Please try again.");
    return res.redirect("/");
  }
};

module.exports.loginUser = async function (req, res) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      req.flash("error", "Email and password are required.");
      return res.redirect("/");
    }

    email = email.trim().toLowerCase();

    const user = await userModel.findOne({ email });
    if (!user) {
      req.flash("error", "Email or password is incorrect.");
      return res.redirect("/");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Email or password is incorrect.");
      return res.redirect("/");
    }

    const token = generateToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.flash("success", `Welcome back, ${user.fullname}!`);
    return res.redirect("/shop");
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error", "Unable to process your login. Please try again.");
    return res.redirect("/");
  }
};
