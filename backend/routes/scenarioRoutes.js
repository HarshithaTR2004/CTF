const express = require("express");
const Scenario = require("../models/Scenario");
const Challenge = require("../models/Challenge");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new scenario (Admin/Instructor only)
router.post("/", auth, async (req, res) => {
  try {
    // In a real app, add role-based authorization here (e.g., req.user.role === "admin")
    const scenario = new Scenario(req.body);
    await scenario.save();
    res.status(201).json(scenario);
  } catch (err) {
    res.status(400).json({ msg: "Failed to create scenario", error: err.message });
  }
});

// Get all scenarios
router.get("/", auth, async (req, res) => {
  try {
    const scenarios = await Scenario.find().populate("challenges", "title category difficulty points");
    res.json(scenarios);
  } catch (err) {
    console.error("Error fetching scenarios:", err);
    res.status(500).json({ msg: "Failed to fetch scenarios", error: err.message });
  }
});

// Get a single scenario by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id).populate("challenges", "title category difficulty points description");
    if (!scenario) {
      return res.status(404).json({ msg: "Scenario not found" });
    }
    res.json(scenario);
  } catch (err) {
    console.error("Error fetching scenario:", err);
    res.status(500).json({ msg: "Failed to fetch scenario", error: err.message });
  }
});

module.exports = router;