const express = require("express");
const router = express.Router();
const isloggedin = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");

// Home / Auth page
router.get("/", function (req, res) {
  if (req.cookies && req.cookies.token) {
    return res.redirect("/shop");
  }
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("index", { error, success, loggedin: false });
});

// Shop / Catalog page
router.get("/shop", isloggedin, async function (req, res) {
  try {
    const { sort, collection, filter } = req.query;
    const query = {};

    if (collection === "discounted" || filter === "discount") {
      query.discount = { $gt: 0 };
    }

    let productsQuery = productModel.find(query);
    if (sort === "newest") {
      productsQuery = productsQuery.sort({ _id: -1 });
    }

    const products = await productsQuery;
    const success = req.flash("success");
    const error = req.flash("error");

    res.render("shop", {
      products,
      success,
      error,
      loggedin: true,
      sort,
      collection,
      filter,
    });
  } catch (err) {
    console.error("Shop page error:", err);
    res.render("shop", {
      products: [],
      success: [],
      error: ["Unable to load products."],
      loggedin: true,
      sort: "",
      collection: "",
      filter: "",
    });
  }
});

// Cart page
router.get("/cart", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email }).populate("cart.product");

    // Clean up any cart items where the product no longer exists in DB
    const originalLength = user.cart ? user.cart.length : 0;
    const validCart = (user.cart || []).filter((item) => item && item.product && item.product._id);

    if (validCart.length !== originalLength) {
      user.cart = validCart;
      await user.save();
    }

    const itemsTotal = validCart.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.product.price) || 0;
      const discount = Number(item.product.discount) || 0;
      return sum + Math.max(0, price - discount) * quantity;
    }, 0);

    const bill = itemsTotal > 0 ? itemsTotal + 20 : 0;
    const success = req.flash("success");
    const error = req.flash("error");

    res.render("cart", {
      user,
      bill,
      itemsTotal,
      loggedin: true,
      success,
      error,
    });
  } catch (err) {
    console.error("Cart error:", err);
    req.flash("error", "Unable to load cart");
    res.redirect("/shop");
  }
});

// AJAX Update Cart Quantity
router.post("/cart/update-quantity", isloggedin, async function (req, res) {
  try {
    const { productId, action } = req.body;
    let user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const cartItemIndex = user.cart.findIndex((item) => {
      return item.product ? item.product.toString() === productId : item.toString() === productId;
    });

    if (cartItemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    const cartItem = user.cart[cartItemIndex];
    let quantity = Number(cartItem.quantity) || 1;

    if (action === "increase") quantity++;
    else if (action === "decrease") quantity--;

    if (quantity <= 0) {
      user.cart.splice(cartItemIndex, 1);
    } else {
      cartItem.quantity = quantity;
    }

    await user.save();
    await user.populate("cart.product");

    const validCart = (user.cart || []).filter((item) => item && item.product);
    const itemsTotal = validCart.reduce((sum, item) => {
      const q = Number(item.quantity) || 1;
      const price = Number(item.product.price) || 0;
      const discount = Number(item.product.discount) || 0;
      return sum + Math.max(0, price - discount) * q;
    }, 0);
    const bill = itemsTotal > 0 ? itemsTotal + 20 : 0;

    const updatedCartItem = validCart.find((item) =>
      item.product ? item.product._id.toString() === productId : false
    );

    const itemSubtotal =
      updatedCartItem && updatedCartItem.product
        ? (Number(updatedCartItem.product.price) - Number(updatedCartItem.product.discount || 0)) *
          (Number(updatedCartItem.quantity) || 0)
        : 0;

    res.json({
      success: true,
      itemQuantity: updatedCartItem ? Number(updatedCartItem.quantity) || 0 : 0,
      itemSubtotal,
      itemsTotal,
      bill,
      removed: !updatedCartItem,
    });
  } catch (err) {
    console.error("Update quantity error:", err);
    res.status(500).json({ success: false });
  }
});

// Add to Cart
router.get("/addtocart/:id", isloggedin, async function (req, res) {
  try {
    const productId = req.params.id;
    const product = await productModel.findById(productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }

    let user = await userModel.findOne({ email: req.user.email });
    let cartItem = user.cart.find((item) => {
      return item.product ? item.product.toString() === productId : item.toString() === productId;
    });

    if (cartItem) {
      cartItem.quantity = (Number(cartItem.quantity) || 1) + 1;
    } else {
      user.cart.push({ product: productId, quantity: 1 });
    }

    await user.save();
    req.flash("success", `Added "${product.name}" to cart`);
    res.redirect("/shop");
  } catch (err) {
    console.error("Add to cart error:", err);
    req.flash("error", "Failed to add product to cart");
    res.redirect("/shop");
  }
});

// Remove from Cart
router.get("/cart/remove/:id", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.id;

    user.cart = user.cart.filter((item) => {
      const pid = item.product ? (item.product._id ? item.product._id.toString() : item.product.toString()) : item.toString();
      return pid !== productId;
    });

    await user.save();
    req.flash("success", "Item removed from cart");
    res.redirect("/cart");
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.redirect("/cart");
  }
});

// Increase quantity via GET link
router.get("/cart/increase/:id", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.id;
    const cartItem = user.cart.find((item) => {
      const pid = item.product ? (item.product._id ? item.product._id.toString() : item.product.toString()) : item.toString();
      return pid === productId;
    });

    if (cartItem) {
      cartItem.quantity = (Number(cartItem.quantity) || 1) + 1;
      await user.save();
    }
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
});

// Decrease quantity via GET link
router.get("/cart/decrease/:id", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.id;
    const cartItemIndex = user.cart.findIndex((item) => {
      const pid = item.product ? (item.product._id ? item.product._id.toString() : item.product.toString()) : item.toString();
      return pid === productId;
    });

    if (cartItemIndex !== -1) {
      const cartItem = user.cart[cartItemIndex];
      const currentQty = Number(cartItem.quantity) || 1;
      const newQty = currentQty - 1;
      if (newQty <= 0) {
        user.cart.splice(cartItemIndex, 1);
      } else {
        cartItem.quantity = newQty;
      }
      await user.save();
    }
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
});

// Checkout Order
router.post("/cart/checkout", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email }).populate("cart.product");
    const validCart = (user.cart || []).filter((item) => item && item.product);

    if (validCart.length === 0) {
      req.flash("error", "Your cart is empty. Please add products first.");
      return res.redirect("/cart");
    }

    const items = validCart.map((item) => ({
      productId: item.product._id,
      name: item.product.name,
      price: item.product.price,
      discount: item.product.discount || 0,
      quantity: Number(item.quantity) || 1,
      subtotal:
        (Number(item.product.price) - Number(item.product.discount || 0)) * (Number(item.quantity) || 1),
    }));

    const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const platformFee = 20;
    const totalAmount = itemsTotal + platformFee;

    const order = {
      orderId: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items,
      itemsTotal,
      platformFee,
      totalAmount,
      status: "Confirmed",
    };

    user.orders.unshift(order);
    user.cart = [];
    await user.save();

    req.flash("success", `🎉 Order placed successfully! Order ID: ${order.orderId}`);
    res.redirect("/account");
  } catch (err) {
    console.error("Checkout error:", err);
    req.flash("error", "Unable to complete order. Please try again.");
    res.redirect("/cart");
  }
});

// Account / Orders page
router.get("/account", isloggedin, async function (req, res) {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    const success = req.flash("success");
    const error = req.flash("error");
    res.render("account", { user, loggedin: true, success, error });
  } catch (err) {
    console.error(err);
    res.redirect("/shop");
  }
});

// Logout
router.get("/logout", function (req, res) {
  res.clearCookie("token");
  req.flash("success", "You have been logged out successfully.");
  res.redirect("/");
});

module.exports = router;