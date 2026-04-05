const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuthMiddleware");
const User = require("../models/User");
const Challenge = require("../models/Challenge");

// @route   GET /api/admin/users
// @desc    Get all users with their progress + difficulty breakdown
// @access  Private (Admin only)
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find().select("-password").populate({
      path: "completedChallenges",
      select: "title points difficulty category",
    }).lean();

    const enriched = users.map((u) => {
      const summary = {
        easy: 0,
        medium: 0,
        hard: 0,
        totalCompleted: 0,
        totalPoints: u.points || 0,
        totalXp: u.xp || 0,
      };

      (u.completedChallenges || []).forEach((ch) => {
        summary.totalCompleted += 1;
        if (ch.difficulty && summary[ch.difficulty] !== undefined) {
          summary[ch.difficulty] += 1;
        }
      });

      return {
        ...u,
        progressSummary: summary,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("Admin get users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET /api/admin/challenges
// @desc    List all challenges for admin management (full details)
// @access  Private (Admin only)
router.get("/challenges", adminAuth, async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .sort({ createdAt: -1 });
    res.json(challenges);
  } catch (err) {
    console.error("Admin get challenges error:", err);
    res.status(500).json({ msg: "Failed to load challenges" });
  }
});

// @route   GET /api/admin/challenges/metadata
// @desc    Get reusable metadata for admin challenge management
// @access  Private (Admin only)
router.get("/challenges/metadata", adminAuth, async (req, res) => {
  try {
    const [domains, categories] = await Promise.all([
      Challenge.distinct("domain"),
      Challenge.distinct("category"),
    ]);

    res.json({
      domains: (domains || []).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      categories: (categories || []).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      difficulties: ["easy", "medium", "hard"],
      vmTypes: ["linux", "kali", "windows", "other"],
    });
  } catch (err) {
    console.error("Admin get challenge metadata error:", err);
    res.status(500).json({ msg: "Failed to load challenge metadata" });
  }
});

// @route   GET /api/admin/challenges/:id
// @desc    Get a single challenge by ID
// @access  Private (Admin only)
router.get("/challenges/:id", adminAuth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ msg: "Challenge not found" });
    }
    res.json(challenge);
  } catch (err) {
    console.error("Admin get challenge error:", err);
    res.status(500).json({ msg: "Failed to load challenge" });
  }
});

// @route   POST /api/admin/challenges
// @desc    Create a new challenge
// @access  Private (Admin only)
router.post("/challenges", adminAuth, async (req, res) => {
  try {
    const {
      title,
      domain,
      category,
      difficulty,
      points,
      correctAnswer,
      description,
      hints,
      labPath,
      vmConfig,
      vmFlag,
    } = req.body;

    if (!title || !domain || !category || !difficulty || points == null || !correctAnswer) {
      return res.status(400).json({ msg: "Missing required fields: title, domain, category, difficulty, points, correctAnswer" });
    }

    const difficultyMap = {
      BASIC: "easy",
      basic: "easy",
      EASY: "easy",
      easy: "easy",
      MEDIUM: "medium",
      medium: "medium",
      HARD: "hard",
      hard: "hard",
    };

    const normalizedDifficulty = difficultyMap[difficulty] || "easy";

    const hintsArray =
      typeof hints === "string"
        ? hints
            .split("\n")
            .map((h) => h.trim())
            .filter(Boolean)
        : Array.isArray(hints)
        ? hints
        : [];

    const challengeData = {
      title,
      domain,
      category,
      difficulty: normalizedDifficulty,
      description: description || "",
      points: Number(points),
      correctAnswer,
      hints: hintsArray,
    };

    // Add optional fields if provided
    if (labPath) {
      challengeData.labPath = labPath;
    }

    if (vmFlag) {
      challengeData.vmFlag = vmFlag;
    }

    if (vmConfig && vmConfig.enabled) {
      challengeData.vmConfig = {
        enabled: true,
        vmUrl: vmConfig.vmUrl || null,
        vmType: vmConfig.vmType || null,
        sshAccess: vmConfig.sshAccess || null,
        webTerminal: vmConfig.webTerminal || null,
        resetEndpoint: vmConfig.resetEndpoint || null,
        credentials: vmConfig.credentials || null,
      };
    }

    const challenge = new Challenge(challengeData);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) {
    console.error("Admin create challenge error:", err);
    res.status(400).json({ msg: "Failed to create challenge", error: err.message });
  }
});

// @route   PUT /api/admin/challenges/:id
// @desc    Update a challenge
// @access  Private (Admin only)
router.put("/challenges/:id", adminAuth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ msg: "Challenge not found" });
    }

    const {
      title,
      domain,
      category,
      difficulty,
      points,
      correctAnswer,
      description,
      hints,
      labPath,
      vmConfig,
      vmFlag,
    } = req.body;

    // Update fields if provided
    if (title !== undefined) challenge.title = title;
    if (domain !== undefined) challenge.domain = domain;
    if (category !== undefined) challenge.category = category;
    if (difficulty !== undefined) {
      const difficultyMap = {
        BASIC: "easy",
        basic: "easy",
        EASY: "easy",
        easy: "easy",
        MEDIUM: "medium",
        medium: "medium",
        HARD: "hard",
        hard: "hard",
      };
      challenge.difficulty = difficultyMap[difficulty] || difficulty;
    }
    if (points !== undefined) challenge.points = Number(points);
    if (correctAnswer !== undefined) challenge.correctAnswer = correctAnswer;
    if (description !== undefined) challenge.description = description;
    if (hints !== undefined) {
      challenge.hints = typeof hints === "string"
        ? hints.split("\n").map((h) => h.trim()).filter(Boolean)
        : Array.isArray(hints) ? hints : [];
    }
    if (labPath !== undefined) challenge.labPath = labPath || null;
    if (vmFlag !== undefined) challenge.vmFlag = vmFlag || null;
    if (vmConfig !== undefined) {
      if (vmConfig.enabled) {
        challenge.vmConfig = {
          enabled: true,
          vmUrl: vmConfig.vmUrl || null,
          vmType: vmConfig.vmType || null,
          sshAccess: vmConfig.sshAccess || null,
          webTerminal: vmConfig.webTerminal || null,
          resetEndpoint: vmConfig.resetEndpoint || null,
          credentials: vmConfig.credentials || null,
        };
      } else {
        challenge.vmConfig = null;
      }
    }

    await challenge.save();
    res.json(challenge);
  } catch (err) {
    console.error("Admin update challenge error:", err);
    res.status(400).json({ msg: "Failed to update challenge", error: err.message });
  }
});

// @route   DELETE /api/admin/challenges/:id
// @desc    Delete a challenge
// @access  Private (Admin only)
router.delete("/challenges/:id", adminAuth, async (req, res) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id);
    res.json({ msg: "Challenge deleted" });
  } catch (err) {
    console.error("Admin delete challenge error:", err);
    res.status(500).json({ msg: "Delete failed" });
  }
});

module.exports = router;