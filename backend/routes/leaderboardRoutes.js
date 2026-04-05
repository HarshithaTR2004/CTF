const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Get leaderboard — sort by points (same as profile/dashboard) so ranking reflects solved challenges
router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find()
      .select("username points xp completedChallenges createdAt")
      .sort({ points: -1 })
      .limit(100)
      .lean();

    res.json(users);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ msg: "Failed to fetch leaderboard" });
  }
});

module.exports = router;

