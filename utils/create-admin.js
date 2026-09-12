require("dotenv").config();

const readline = require("readline");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const ownerModel = require("../models/owner-model");
const db = require("../config/mongoose-connection");

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  let fullname = "";
  let email = "";
  let password = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) fullname = args[++i];
    else if (args[i] === "--email" && args[i + 1]) email = args[++i];
    else if (args[i] === "--password" && args[i + 1]) password = args[++i];
    else if (!args[i].startsWith("--")) {
      if (!fullname) fullname = args[i];
      else if (!email) email = args[i];
      else if (!password) password = args[i];
    }
  }

  return { fullname, email, password };
}

async function createAdmin() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once("open", resolve));
    }

    console.log("\n=============================================");
    console.log("🛡️  SCATCH SECURE ADMIN PROVISIONING CLI");
    console.log("=============================================\n");

    let { fullname, email, password } = parseArgs();

    if (!fullname) {
      fullname = await askQuestion("Enter Admin Full Name: ");
    }
    if (!email) {
      email = await askQuestion("Enter Admin Email: ");
    }
    if (!password) {
      password = await askQuestion("Enter Secure Password (min 6 chars): ");
    }

    fullname = fullname ? fullname.trim() : "";
    email = email ? email.trim().toLowerCase() : "";

    if (!fullname || !email || !password) {
      console.error("\n❌ Error: Full name, email, and password are required.");
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("\n❌ Error: Password must be at least 6 characters long.");
      process.exit(1);
    }

    const existing = await ownerModel.findOne({ email });
    if (existing) {
      console.log(`\n⚠️  An administrator with email "${email}" already exists.`);
      const update = await askQuestion("Do you want to reset their password? (y/N): ");
      if (update.toLowerCase() === "y" || update.toLowerCase() === "yes") {
        const salt = await bcrypt.genSalt(10);
        existing.password = await bcrypt.hash(password, salt);
        existing.fullname = fullname;
        await existing.save();
        console.log(`\n✅ Administrator "${fullname}" (<${email}>) password updated successfully!`);
        process.exit(0);
      } else {
        console.log("\nAborted. Existing administrator account was not modified.");
        process.exit(0);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await ownerModel.create({
      fullname,
      email,
      password: hashedPassword,
    });

    console.log(`\n🎉 Administrator "${fullname}" (<${email}>) created successfully!`);
    console.log("👉 You can now sign in at http://localhost:3000/owners/login\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Failed to create administrator:", err.message);
    process.exit(1);
  }
}

createAdmin();
