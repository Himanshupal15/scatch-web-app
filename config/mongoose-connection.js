const mongoose = require("mongoose");
const config = require("config");
const dbgr = require("debug")("development:mongoose");

let mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (process.env.NODE_ENV === "production" && !mongoURI) {
  throw new Error("MONGODB_URI must be configured in production.");
}

if (!mongoURI) {
  try {
    mongoURI = config.has("MONGODB_URI") ? config.get("MONGODB_URI") : "mongodb://127.0.0.1:27017/scatch";
  } catch (e) {
    mongoURI = "mongodb://127.0.0.1:27017/scatch";
  }
}

// If connection string is just host/port without database, append /scatch
if (mongoURI.startsWith("mongodb://") && !mongoURI.includes("/scatch") && !mongoURI.includes("?")) {
  const parts = mongoURI.split("/");
  // e.g. "mongodb://127.0.0.1:27017" has parts length 3
  if (parts.length === 3 || (parts.length === 4 && parts[3] === "")) {
    mongoURI = mongoURI.replace(/\/$/, "") + "/scatch";
  }
}

mongoose
  .connect(mongoURI)
  .then(function () {
    console.log(`Connected to MongoDB successfully: ${mongoURI.replace(/\/\/.*@/, "//***:***@")}`);
    dbgr("Connected");
  })
  .catch(function (err) {
    console.error("MongoDB connection error:", err.message);
    dbgr(err);
  });

module.exports = mongoose.connection;