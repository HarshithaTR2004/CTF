const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Get challenge guide for a specific challenge
router.get("/:key", (req, res) => {
  try {
    const guidePath = path.join(__dirname, "../challengeGuide.json");
    const guideData = JSON.parse(fs.readFileSync(guidePath, "utf8"));
    
    const guideKey = req.params.key;
    if (guideData[guideKey]) {
      res.json(guideData[guideKey]);
    } else {
      res.status(404).json({ msg: "Challenge guide not found" });
    }
  } catch (err) {
    console.error("Error loading challenge guide:", err);
    res.status(500).json({ msg: "Failed to load challenge guide" });
  }
});

// Get all challenge guides
router.get("/", (req, res) => {
  try {
    const guidePath = path.join(__dirname, "../challengeGuide.json");
    const guideData = JSON.parse(fs.readFileSync(guidePath, "utf8"));
    res.json(guideData);
  } catch (err) {
    console.error("Error loading challenge guides:", err);
    res.status(500).json({ msg: "Failed to load challenge guides" });
  }
});

module.exports = router;

