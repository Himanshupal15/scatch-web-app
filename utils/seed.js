require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const productModel = require("../models/product-model");
const ownerModel = require("../models/owner-model");
const bcrypt = require("bcrypt");
const db = require("../config/mongoose-connection");

const sampleBags = [
  {
    name: "Classic Italian Leather Tote",
    price: 3499,
    discount: 500,
    bgcolor: "#f1ede6",
    panelcolor: "#ffffff",
    textcolor: "#1f2937",
    imageFile: "1bag.png",
  },
  {
    name: "Nordic Minimalist Backpack",
    price: 2899,
    discount: 300,
    bgcolor: "#e5e7eb",
    panelcolor: "#ffffff",
    textcolor: "#111827",
    imageFile: "2bag.png",
  },
  {
    name: "Canvas Weekender Duffel",
    price: 4200,
    discount: 600,
    bgcolor: "#dbeafe",
    panelcolor: "#ffffff",
    textcolor: "#1e3a8a",
    imageFile: "3bag 1.png",
  },
  {
    name: "Urban Sleek Crossbody",
    price: 1999,
    discount: 250,
    bgcolor: "#fce7f3",
    panelcolor: "#ffffff",
    textcolor: "#831843",
    imageFile: "4bag.png",
  },
  {
    name: "Executive Leather Briefcase",
    price: 5499,
    discount: 800,
    bgcolor: "#fef3c7",
    panelcolor: "#ffffff",
    textcolor: "#78350f",
    imageFile: "5bag.png",
  },
  {
    name: "Casual Vintage Satchel",
    price: 2499,
    discount: 350,
    bgcolor: "#e0e7ff",
    panelcolor: "#ffffff",
    textcolor: "#312e81",
    imageFile: "6bag.png",
  },
  {
    name: "Voyager Travel Duffel",
    price: 3999,
    discount: 400,
    bgcolor: "#dcfce7",
    panelcolor: "#ffffff",
    textcolor: "#14532d",
    imageFile: "7bag.png",
  },
  {
    name: "Monochrome Studio Sling",
    price: 1799,
    discount: 199,
    bgcolor: "#f3f4f6",
    panelcolor: "#ffffff",
    textcolor: "#18181b",
    imageFile: "image 80.png",
  },
];

async function seedDatabase() {
  try {
    // Wait for connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once("open", resolve));
    }

    console.log("🌱 Seeding database...");

    // Seed Owner if none exists
    const existingOwner = await ownerModel.findOne();
    if (!existingOwner) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);
      await ownerModel.create({
        fullname: "Store Admin",
        email: "admin@scatch.com",
        password: hashedPassword,
        gstin: "27AAAAA0000A1Z5",
      });
      console.log("✅ Seeded default admin account: admin@scatch.com / admin123");
    } else {
      console.log("ℹ️ Admin account already exists.");
    }

    // Seed Products if none exist or force flag is passed
    const existingCount = await productModel.countDocuments();
    const force = process.argv.includes("--force");

    if (existingCount === 0 || force) {
      if (force && existingCount > 0) {
        await productModel.deleteMany({});
        console.log("🧹 Cleared existing products.");
      }

      const productsToInsert = [];
      const imagesDir = path.join(__dirname, "../public/images");

      for (const item of sampleBags) {
        const filePath = path.join(imagesDir, item.imageFile);
        let imageBuffer = Buffer.from("");
        if (fs.existsSync(filePath)) {
          imageBuffer = fs.readFileSync(filePath);
        }

        productsToInsert.push({
          name: item.name,
          price: item.price,
          discount: item.discount,
          bgcolor: item.bgcolor,
          panelcolor: item.panelcolor,
          textcolor: item.textcolor,
          image: imageBuffer,
        });
      }

      await productModel.insertMany(productsToInsert);
      console.log(`✅ Seeded ${productsToInsert.length} luxury bags into the store.`);
    } else {
      console.log(`ℹ️ Catalog already has ${existingCount} products.`);
    }

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedDatabase();
