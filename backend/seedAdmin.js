const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const ADMIN_EMAIL = "admin@cyberrangex.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_USERNAME = "Admin";

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex")
  .then(async () => {
    console.log("MongoDB connected for admin seed");

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role === "admin") {
        console.log("Admin user already exists:", ADMIN_EMAIL);
      } else {
        existing.role = "admin";
        await existing.save();
        console.log("Updated existing user to admin:", ADMIN_EMAIL);
      }
      process.exit(0);
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      points: 0,
      streak: 0,
      xp: 0,
    });

    console.log("Admin user created successfully");
    console.log("Email:", ADMIN_EMAIL);
    console.log("Password:", ADMIN_PASSWORD);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Admin seed error:", err);
    process.exit(1);
  });
