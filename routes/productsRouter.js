const express = require("express");
const router = express.Router();
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");
const isOwnerLoggedIn = require("../middlewares/isOwnerLoggedIn");

// Create Product
router.post("/create", isOwnerLoggedIn, upload.single("image"), async function (req, res) {
  try {
    const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

    if (!req.file || !req.file.buffer) {
      req.flash("error", "Please upload a product image.");
      return res.redirect("/owners/create-product");
    }

    if (!name || !price) {
      req.flash("error", "Product name and price are required.");
      return res.redirect("/owners/create-product");
    }

    const numPrice = Number(price);
    const numDiscount = Number(discount) || 0;

    if (isNaN(numPrice) || numPrice <= 0) {
      req.flash("error", "Price must be a valid positive number.");
      return res.redirect("/owners/create-product");
    }

    if (numDiscount < 0 || numDiscount >= numPrice) {
      req.flash("error", "Discount cannot be negative or greater than or equal to the price.");
      return res.redirect("/owners/create-product");
    }

    await productModel.create({
      image: req.file.buffer,
      name: name.trim(),
      price: numPrice,
      discount: numDiscount,
      bgcolor: bgcolor || "#f4f4f5",
      panelcolor: panelcolor || "#ffffff",
      textcolor: textcolor || "#18181b",
    });

    req.flash("success", "Product created successfully!");
    res.redirect("/owners/admin");
  } catch (err) {
    console.error("Product creation error:", err);
    req.flash("error", "Failed to create product. " + err.message);
    res.redirect("/owners/create-product");
  }
});

// Delete Single Product
router.get("/delete/:id", isOwnerLoggedIn, async function (req, res) {
  try {
    const productId = req.params.id;
    const deleted = await productModel.findByIdAndDelete(productId);
    if (!deleted) {
      req.flash("error", "Product not found.");
    } else {
      req.flash("success", `Product "${deleted.name}" deleted successfully.`);
    }
    res.redirect("/owners/admin");
  } catch (err) {
    console.error("Product delete error:", err);
    req.flash("error", "Failed to delete product.");
    res.redirect("/owners/admin");
  }
});

// Delete All Products
router.get("/delete-all", isOwnerLoggedIn, async function (req, res) {
  try {
    await productModel.deleteMany({});
    req.flash("success", "All products have been deleted.");
    res.redirect("/owners/admin");
  } catch (err) {
    console.error("Delete all products error:", err);
    req.flash("error", "Failed to delete products.");
    res.redirect("/owners/admin");
  }
});

module.exports = router;