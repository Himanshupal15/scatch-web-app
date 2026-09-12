const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const ownerModel = require("../models/owner-model");

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🧪 Test server running at ${baseUrl}`);

  let userCookie = "";
  let ownerCookie = "";

  function extractCookie(res) {
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      return setCookie.split(";")[0];
    }
    return "";
  }

  try {
    // 1. GET /
    console.log("▶ Testing GET / (Home page)...");
    const resHome = await fetch(`${baseUrl}/`);
    if (resHome.status !== 200) throw new Error(`Home failed with status ${resHome.status}`);
    console.log("  ✅ Home page returned 200");

    // 2. POST /users/register
    console.log("▶ Testing User Registration...");
    const testEmail = `test_${Date.now()}@example.com`;
    const regParams = new URLSearchParams({
      fullname: "Test Shopper",
      email: testEmail,
      password: "password123",
    });
    const resReg = await fetch(`${baseUrl}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regParams.toString(),
      redirect: "manual",
    });
    if (resReg.status !== 302) throw new Error(`Registration failed with status ${resReg.status}`);
    userCookie = extractCookie(resReg);
    console.log("  ✅ User registration successful, received auth cookie");

    // 3. GET /shop
    console.log("▶ Testing GET /shop (Protected)...");
    const resShop = await fetch(`${baseUrl}/shop`, {
      headers: { Cookie: userCookie },
    });
    if (resShop.status !== 200) throw new Error(`Shop failed with status ${resShop.status}`);
    const shopHtml = await resShop.text();
    if (!shopHtml.includes("SCATCH")) throw new Error("Shop HTML missing SCATCH header");
    console.log("  ✅ Shop page rendered successfully");

    // 4. Add to Cart
    console.log("▶ Testing Add to Cart...");
    const firstProduct = await productModel.findOne();
    if (!firstProduct) throw new Error("No products found to add to cart");
    const resAddToCart = await fetch(`${baseUrl}/addtocart/${firstProduct._id}`, {
      headers: { Cookie: userCookie },
      redirect: "manual",
    });
    if (resAddToCart.status !== 302) throw new Error(`Add to cart failed with status ${resAddToCart.status}`);
    console.log(`  ✅ Product "${firstProduct.name}" added to cart`);

    // 5. GET /cart
    console.log("▶ Testing GET /cart...");
    const resCart = await fetch(`${baseUrl}/cart`, {
      headers: { Cookie: userCookie },
    });
    if (resCart.status !== 200) throw new Error(`Cart returned status ${resCart.status}`);
    const cartHtml = await resCart.text();
    if (!cartHtml.includes("Order Summary")) throw new Error("Cart missing Order Summary");
    console.log("  ✅ Cart page rendered with item");

    // 6. Update Cart Quantity via AJAX
    console.log("▶ Testing AJAX /cart/update-quantity...");
    const resUpdateQty = await fetch(`${baseUrl}/cart/update-quantity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        productId: firstProduct._id.toString(),
        action: "increase",
      }),
    });
    const updateJson = await resUpdateQty.json();
    if (!updateJson.success || updateJson.itemQuantity !== 2) {
      throw new Error(`Quantity update unexpected response: ${JSON.stringify(updateJson)}`);
    }
    console.log("  ✅ Cart quantity updated to 2 via AJAX");

    // 7. POST /cart/checkout
    console.log("▶ Testing Checkout Order...");
    const resCheckout = await fetch(`${baseUrl}/cart/checkout`, {
      method: "POST",
      headers: { Cookie: userCookie },
      redirect: "manual",
    });
    if (resCheckout.status !== 302) throw new Error(`Checkout failed with status ${resCheckout.status}`);
    console.log("  ✅ Checkout completed, redirected to /account");

    // 8. GET /account
    console.log("▶ Testing GET /account (Order History)...");
    const resAccount = await fetch(`${baseUrl}/account`, {
      headers: { Cookie: userCookie },
    });
    if (resAccount.status !== 200) throw new Error(`Account returned status ${resAccount.status}`);
    const accountHtml = await resAccount.text();
    if (!accountHtml.includes("Order History")) throw new Error("Account missing Order History");
    if (!accountHtml.includes("ORD-")) throw new Error("Account missing generated Order ID");
    console.log("  ✅ Account page displays verified confirmed order!");

    // 9. Enforce: Web Admin Creation is Blocked
    console.log("▶ Testing that admin CANNOT be created via web app (/owners/create)...");
    const resBlockedCreate = await fetch(`${baseUrl}/owners/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        fullname: "Unauthorized Admin",
        email: "unauthorized@scatch.com",
        password: "unauthorized_password",
      }),
    });
    if (resBlockedCreate.status !== 403) {
      throw new Error(`Expected status 403 Forbidden for web admin creation, got ${resBlockedCreate.status}`);
    }
    const blockedJson = await resBlockedCreate.json();
    if (!blockedJson.error) {
      throw new Error("Expected error payload for blocked web admin creation");
    }
    console.log("  ✅ Web admin creation successfully blocked with 403 Forbidden");

    // 10. Admin Login (with CLI-provisioned admin)
    console.log("▶ Testing Admin Login (/owners/login)...");
    const ownerParams = new URLSearchParams({
      email: "admin@scatch.com",
      password: "admin123",
    });
    const resOwnerLogin = await fetch(`${baseUrl}/owners/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: ownerParams.toString(),
      redirect: "manual",
    });
    if (resOwnerLogin.status !== 302) throw new Error(`Owner login returned status ${resOwnerLogin.status}`);
    ownerCookie = extractCookie(resOwnerLogin);
    console.log("  ✅ Admin login successful, owner token received");

    // 11. Admin Dashboard
    console.log("▶ Testing GET /owners/admin...");
    const resAdmin = await fetch(`${baseUrl}/owners/admin`, {
      headers: { Cookie: ownerCookie },
    });
    if (resAdmin.status !== 200) throw new Error(`Admin dashboard returned status ${resAdmin.status}`);
    const adminHtml = await resAdmin.text();
    if (!adminHtml.includes("Inventory Catalog")) throw new Error("Admin missing Inventory Catalog header");
    console.log("  ✅ Admin dashboard rendered catalog successfully");

    // 12. Create New Product via Admin
    console.log("▶ Testing Product Creation (POST /products/create)...");
    const dummyImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const boundary = "----WebKitFormBoundaryTest7MA4YWxkTrZu0gW";
    let body = "";
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="name"\r\n\r\nTest Luxury Bag\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="price"\r\n\r\n2999\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="discount"\r\n\r\n300\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="bgcolor"\r\n\r\n#e0f2fe\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="panelcolor"\r\n\r\n#ffffff\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="textcolor"\r\n\r\n#0369a1\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="image"; filename="test.png"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, "utf8"),
      dummyImage,
      Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
    ]);

    const resCreateProd = await fetch(`${baseUrl}/products/create`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Cookie: ownerCookie,
      },
      body: bodyBuffer,
      redirect: "manual",
    });
    if (resCreateProd.status !== 302) throw new Error(`Product create returned status ${resCreateProd.status}`);
    console.log("  ✅ Admin created new product 'Test Luxury Bag'");

    // Verify product was created and then delete it
    const createdProd = await productModel.findOne({ name: "Test Luxury Bag" });
    if (!createdProd) throw new Error("Created product not found in database");

    // 13. Delete product
    console.log("▶ Testing Product Deletion...");
    const resDeleteProd = await fetch(`${baseUrl}/products/delete/${createdProd._id}`, {
      headers: { Cookie: ownerCookie },
      redirect: "manual",
    });
    if (resDeleteProd.status !== 302) throw new Error(`Delete product returned ${resDeleteProd.status}`);
    const checkDeleted = await productModel.findById(createdProd._id);
    if (checkDeleted) throw new Error("Product was not deleted from database");
    console.log("  ✅ Product deleted successfully by admin");

    // 14. Logout tests
    console.log("▶ Testing User Logout...");
    const resUserLogout = await fetch(`${baseUrl}/logout`, { redirect: "manual" });
    if (resUserLogout.status !== 302) throw new Error("User logout failed");
    console.log("  ✅ User logout returned 302 redirect");

    console.log("▶ Testing Owner Logout...");
    const resOwnerLogout = await fetch(`${baseUrl}/owners/logout`, { redirect: "manual" });
    if (resOwnerLogout.status !== 302) throw new Error("Owner logout failed");
    console.log("  ✅ Owner logout returned 302 redirect");

    console.log("\n==========================================");
    console.log("🎉 ALL 14 TEST CASES PASSED SUCCESSFULLY!");
    console.log("==========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runTests();
