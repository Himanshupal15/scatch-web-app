const express = require("express");
const router = express.Router();
const isloggedin = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");


router.get("/",function(req,res){
    let error = req.flash("error");
    res.render("index",{error,loggdin:false});
});

router.get("/shop",isloggedin, async function(req,res){
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
  res.render("shop", { products, success, loggedin: true, sort, collection, filter });
});

router.get("/cart",isloggedin, async function(req,res){
    let user = await userModel
    .findOne({email:req.user.email})
    .populate("cart.product");

    const cartItems = user.cart || [];
    const itemsTotal = cartItems.reduce((sum, item) => {
        if (!item.product) return sum;
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.product.price) || 0;
        const discount = Number(item.product.discount) || 0;
        return sum + ((price - discount) * quantity);
    }, 0);

    const bill = itemsTotal > 0 ? itemsTotal + 20 : 0;
    res.render("cart",{user,bill, itemsTotal});
});

router.post("/cart/update-quantity", isloggedin, async function(req, res) {
    try {
        const { productId, action } = req.body;
        let user = await userModel.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const cartItemIndex = user.cart.findIndex(item => item.product ? item.product.toString() === productId : item.toString() === productId);
        if (cartItemIndex === -1) return res.status(404).json({ success: false, message: 'Item not found' });

        const cartItem = user.cart[cartItemIndex];
        let quantity = Number(cartItem.quantity) || 1;

        if (action === 'increase') quantity++;
        else if (action === 'decrease') quantity--;

        if (quantity <= 0) {
            // remove item
            user.cart.splice(cartItemIndex, 1);
        } else {
            cartItem.quantity = quantity;
        }

        await user.save();

        // ensure populated product details for totals
        await user.populate('cart.product');
        const cartItems = user.cart || [];
        const itemsTotal = cartItems.reduce((sum, item) => {
            if (!item.product) return sum;
            const q = Number(item.quantity) || 1;
            const price = Number(item.product.price) || 0;
            const discount = Number(item.product.discount) || 0;
            return sum + ((price - discount) * q);
        }, 0);
        const bill = itemsTotal > 0 ? itemsTotal + 20 : 0;

        const updatedCartItem = user.cart.find(item => item.product ? item.product._id.toString() === productId : item.toString() === productId);
        const itemSubtotal = updatedCartItem && updatedCartItem.product ? ((Number(updatedCartItem.product.price) - Number(updatedCartItem.product.discount)) * (Number(updatedCartItem.quantity) || 0)) : 0;

        res.json({
            success: true,
            itemQuantity: updatedCartItem ? Number(updatedCartItem.quantity) || 0 : 0,
            itemSubtotal,
            itemsTotal,
            bill,
            removed: !updatedCartItem
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.get("/addtocart/:id", isloggedin, async function(req, res){
   let user = await userModel.findOne({email:req.user.email});
   const productId = req.params.id;
   let cartItem = user.cart.find(item => {
      return item.product ? item.product.toString() === productId : item.toString() === productId;
   });

   if (cartItem) {
       cartItem.quantity = (Number(cartItem.quantity) || 1) + 1;
   } else {
       user.cart.push({ product: productId, quantity: 1 });
   }

   await user.save();
   req.flash("success","Added to cart");
   res.redirect("/shop");
});

router.get("/cart/remove/:id", isloggedin, async function(req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.id;
    user.cart = user.cart.filter(item => {
        return item.product ? item.product.toString() !== productId : item.toString() !== productId;
    });
    await user.save();
    res.redirect("/cart");
});

router.get("/cart/increase/:id", isloggedin, async function(req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.id;
    const cartItem = user.cart.find(item => item.product ? item.product.toString() === productId : item.toString() === productId);
    if (cartItem) {
        cartItem.quantity = (Number(cartItem.quantity) || 1) + 1;
        await user.save();
    }
    res.redirect("/cart");
});

router.get("/cart/decrease/:id", isloggedin, async function(req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.id;
    const cartItemIndex = user.cart.findIndex(item => item.product ? item.product.toString() === productId : item.toString() === productId);
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
});

router.get("/account", isloggedin, async function(req, res) {
    const user = await userModel.findOne({ email: req.user.email });
    res.render("account", { user, loggedin: true });
});

router.get("/logout", isloggedin, function(req, res) {
    res.clearCookie("token");
    res.redirect("/");
});


module.exports = router;  