const jwt = require("jsonwebtoken");

const getSecretKey = () => {
  return process.env.JWT_KEY || process.env.JWT_SECRET || "scatch_jwt_secret_key_12345";
};

const generateToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id },
    getSecretKey(),
    { expiresIn: "7d" }
  );
};

const generateOwnerToken = (owner) => {
  return jwt.sign(
    { email: owner.email, id: owner._id, isOwner: true },
    getSecretKey(),
    { expiresIn: "7d" }
  );
};

module.exports.generateToken = generateToken;
module.exports.generateOwnerToken = generateOwnerToken;
module.exports.getSecretKey = getSecretKey;