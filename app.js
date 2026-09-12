require("dotenv").config();

if (process.env.NODE_ENV === "production") {
  const requiredEnvVars = ["MONGODB_URI", "JWT_KEY", "EXPRESS_SESSION_SECRET"];
  const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing production environment variables: ${missingEnvVars.join(", ")}`);
  }
}

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");

// Database connection
const db = require("./config/mongoose-connection");

// Routers
const ownersRouter = require("./routes/ownersRouter");
const productsRouter = require("./routes/productsRouter");
const usersRouter = require("./routes/usersRouter");
const indexRouter = require("./routes/index");

// Proxy trust for cloud deployment platforms (Render, Heroku, Railway)
app.set("trust proxy", 1);

// Core Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Global view variables
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.isOwner = Boolean(req.cookies && req.cookies.ownerToken);
  res.locals.isUser = Boolean(req.cookies && req.cookies.token);
  next();
});

// Route Handlers
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/", indexRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).render("index", {
    error: ["The page you requested was not found."],
    success: [],
    loggedin: false,
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });
}

module.exports = app;