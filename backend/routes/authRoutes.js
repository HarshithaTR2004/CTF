const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-in-production";

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ msg: "Please provide all fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed });
    await user.save();

    // Generate token for immediate login after registration
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      msg: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        streak: user.streak || 0,
        xp: user.xp || 0
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ msg: err.message || "Server error during registration" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ msg: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log(`User ${user.username} logged in successfully`);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        streak: user.streak || 0,
        xp: user.xp || 0
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: err.message || "Server error during login" });
  }
});

// Admin Login
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ msg: "Please provide email and password" });
    }

    let user = await User.findOne({ email });

    // Dev convenience: auto-create default admin on first login attempt
    // so that `admin@cyberrangex.com` / `admin123` always works out of the box.
    // IMPORTANT: For production, prefer creating admins via a proper admin UI or
    // migration script and remove this block.
    if (!user && email === "admin@cyberrangex.com" && password === "admin123") {
      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({
        username: "Admin",
        email,
        password: hashed,
        role: "admin",
        points: 0,
        streak: 0,
        xp: 0,
      });
      console.log("Auto-created default admin user:", email);
    }

    if (!user) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    // Check if the user has admin role
    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied: Not an administrator" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log(`Admin ${user.username} logged in successfully`);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        streak: user.streak || 0,
        xp: user.xp || 0
      }
    });
  } catch (err) {
    console.error("Admin Login error:", err);
    res.status(500).json({ msg: err.message || "Server error during admin login" });
  }
});

module.exports = router;