const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");

let mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (process.env.NODE_ENV === "production" && !mongoURI) {
  throw new Error("MONGODB_URI must be configured in production.");
}

if (!mongoURI) {
  mongoURI = "mongodb://127.0.0.1:27017/scatch";
}

// If connection string is just host/port without database, append /scatch
if (mongoURI.startsWith("mongodb://") && !mongoURI.includes("/scatch") && !mongoURI.includes("?")) {
  const parts = mongoURI.split("/");
  // e.g. "mongodb://127.0.0.1:27017" has parts length 3
  if (parts.length === 3 || (parts.length === 4 && parts[3] === "")) {
    mongoURI = mongoURI.replace(/\/$/, "") + "/scatch";
  }
}

const connectionPromise = mongoose
  .connect(mongoURI)
  .then(function () {
    console.log(`Connected to MongoDB successfully: ${mongoURI.replace(/\/\/.*@/, "//***:***@")}`);
    dbgr("Connected");
    return mongoose.connection;
  })
  .catch(function (err) {
    console.error("MongoDB connection error:", err.message);
    dbgr(err);
    throw err;
  });

module.exports = connectionPromise;