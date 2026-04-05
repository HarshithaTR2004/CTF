const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Get current logged-in user profile
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ msg: "Failed to load profile" });
  }
});

// Update current user profile (username only; email can be added with verification later)
router.put("/", auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ msg: "Username is required" });
    }
    const trimmed = username.trim();
    if (!trimmed.length) {
      return res.status(400).json({ msg: "Username cannot be empty" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username: trimmed },
      { new: true, runValidators: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ msg: err.message || "Validation failed" });
    }
    res.status(500).json({ msg: "Failed to update profile" });
  }
});

module.exports = router;
