const express = require("express");
const Challenge = require("../models/Challenge");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Log that routes are being loaded
console.log("[ChallengeRoutes] ========================================");
console.log("[ChallengeRoutes] Loading challenge routes...");
console.log("[ChallengeRoutes] ========================================");

/* ================= CREATE CHALLENGE (generic, not admin-specific) ================= */
router.post("/", auth, async (req, res) => {
  try {
    const challenge = new Challenge(req.body);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) {
    console.error("Failed to create challenge:", err);
    res.status(400).json({ msg: "Failed to create challenge", error: err.message });
  }
});

/* ================= GET ALL CHALLENGES ================= */
router.get("/", auth, async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .select("title category difficulty description points domain vmConfig labPath _id")
      .sort({ domain: 1, difficulty: 1, title: 1 });

    console.log(`[Challenges API] Fetched ${challenges.length} challenges for user ${req.user.id}`);

    return res.json(challenges);
  } catch (err) {
    console.error("[Challenges API] Error fetching challenges:", err);
    res.status(500).json({ msg: "Failed to fetch challenges", error: err.message });
  }
});

/* ================= GET CHALLENGES BY DOMAIN ================= */
// CRITICAL: This route MUST come before /:id route to avoid conflicts
console.log("[ChallengeRoutes] ✅ Registering GET /domain/:domain route");
router.get("/domain/:domain", auth, async (req, res) => {
  try {
    const domain = decodeURIComponent(req.params.domain);
    console.log(`[Challenges API] GET /domain/${req.params.domain} -> decoded: "${domain}"`);
    console.log(`[Challenges API] User ID: ${req.user?.id}`);
    
    // Try exact match first
    let challenges = await Challenge.find({ domain })
      .select("title category difficulty description points domain vmConfig labPath _id")
      .sort({ difficulty: 1, title: 1 });

    console.log(`[Challenges API] Found ${challenges.length} challenges for domain: "${domain}"`);
    
    if (challenges.length === 0) {
      // Log available domains for debugging
      const allDomains = await Challenge.distinct("domain");
      console.log(`[Challenges API] Available domains in database:`, allDomains);
      console.log(`[Challenges API] Requested domain "${domain}" not found. Available:`, allDomains);
      
      // Try case-insensitive match
      const caseInsensitiveMatch = allDomains.find(d => 
        d.toLowerCase() === domain.toLowerCase()
      );
      
      if (caseInsensitiveMatch) {
        console.log(`[Challenges API] Found case-insensitive match: "${caseInsensitiveMatch}"`);
        challenges = await Challenge.find({ domain: caseInsensitiveMatch })
          .select("title category difficulty description points domain vmConfig labPath _id")
          .sort({ difficulty: 1, title: 1 });
      }
    }

    return res.json(challenges);
  } catch (err) {
    console.error("[Challenges API] Error fetching challenges by domain:", err);
    res.status(500).json({ msg: "Failed to fetch challenges", error: err.message });
  }
});

/* ================= VM ATTEST (must be before GET /:id) ================= */
const {
  createPendingVmAttest,
  processVmAttestCallback,
  isVmAttestSecretConfigured,
} = require("../utils/vmAttestStore");

router.post("/vm-attest/callback", async (req, res) => {
  try {
    const vmSecret = req.get("X-Cyberrangex-Vm-Secret") || "";
    const { attestToken, unlockKey } = req.body || {};
    const result = await processVmAttestCallback(attestToken, unlockKey, vmSecret);
    const status = result.status || (result.ok ? 200 : 400);
    if (result.ok) {
      return res.json({ status: "ok", msg: result.msg });
    }
    return res.status(status).json({ status: "error", msg: result.msg });
  } catch (err) {
    console.error("[vm-attest/callback]", err);
    return res.status(500).json({ msg: "Server error during VM attestation." });
  }
});

router.get("/:id/vm-attest", auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id).select("vmConfig");
    if (!challenge) return res.status(404).json({ msg: "Challenge not found" });
    if (!challenge.vmConfig?.enabled) {
      return res.status(400).json({ msg: "Not a VM challenge." });
    }
    const unlockKey =
      challenge.vmConfig.unlockKey != null ? String(challenge.vmConfig.unlockKey).trim() : "";
    if (!unlockKey) {
      return res.status(500).json({ msg: "Challenge VM config missing unlockKey." });
    }
    const attestToken = createPendingVmAttest(req.user.id, challenge._id.toString());
    return res.json({
      attestToken,
      unlockKey,
      attestPendingMinutes: 45,
      submitWindowMinutes: 20,
      serverAttestConfigured: isVmAttestSecretConfigured(),
      unlockExample: `/usr/local/bin/unlock_flag ${unlockKey} ${attestToken}`,
    });
  } catch (err) {
    console.error("GET /:id/vm-attest:", err);
    return res.status(500).json({ msg: "Failed to issue VM attest token." });
  }
});

/* ================= GET SINGLE CHALLENGE ================= */
router.get("/:id", auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id).select(
      "title category difficulty description points hints correctAnswer labPath domain vmConfig vmFlag"
    );

    if (!challenge) return res.status(404).json({ msg: "Challenge not found" });

    const isPrivileged =
      req.user && (req.user.role === "admin" || req.user.role === "instructor");

    const response = {
      _id: challenge._id,
      title: challenge.title,
      category: challenge.category,
      domain: challenge.domain,
      difficulty: challenge.difficulty,
      description: challenge.description,
      points: challenge.points,
      hints: challenge.hints,
      labPath: challenge.labPath || null,
      vmConfig: challenge.vmConfig || null,
      // VM flags are secrets: only admins/instructors should see them.
      vmFlag: isPrivileged ? challenge.vmFlag || null : null,
    };

    // Only admins/instructors can see the correct answer from the API
    if (isPrivileged) {
      response.correctAnswer = challenge.correctAnswer;
    }

    res.json(response);
  } catch (err) {
    console.error("Error fetching challenge:", err);
    res.status(500).json({ msg: "Invalid challenge ID" });
  }
});

/* ================= SUBMIT ANSWER ================= */
router.post("/:id/verify-vm", auth, async (req, res) => {
  return res.status(410).json({
    status: "deprecated",
    msg: "VM challenges no longer accept pasted flags for verification. Run /usr/local/bin/unlock_flag <unlockId> <attestToken> inside the VM (attest token is on the challenge page), then submit your flag.",
  });
});

/* ================= REVEAL FLAG (after verification) ================= */
router.post("/:id/reveal", auth, async (req, res) => {
  try {
    const { verificationToken } = req.body;
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ msg: "Challenge not found" });

    const userId = req.user.id;
    const { isTokenValid } = require("../utils/challengeVerification");

    if (!isTokenValid(verificationToken, userId, challenge._id.toString())) {
      return res.status(400).json({
        msg: "Verification required before revealing the flag.",
        status: "verification_required",
      });
    }

    return res.json({
      status: "revealed",
      flag: challenge.correctAnswer,
    });
  } catch (err) {
    console.error("Error revealing flag:", err);
    return res.status(500).json({ msg: "Server error while revealing flag." });
  }
});

router.post("/:id/submit", auth, async (req, res) => {
  try {
    const { answer, verificationToken } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ msg: "Please provide an answer.", status: "invalid" });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ msg: "Challenge not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Prevent double reward for same challenge
    if (user.completedChallenges.includes(challenge._id)) {
      return res.json({ msg: "Challenge already completed", status: "completed" });
    }

    // Non-VM: lab issues verificationToken. VM: unlock_flag in container calls back with shared secret → one-time submit eligibility (or legacy verificationToken).
    const { verifyAndConsumeToken } = require("../utils/challengeVerification");
    const { consumeVmSubmitEligibility } = require("../utils/vmAttestStore");

    let verificationOk = false;

    if (challenge.vmConfig?.enabled) {
      if (verificationToken) {
        verificationOk = verifyAndConsumeToken(
          verificationToken,
          req.user.id,
          challenge._id.toString()
        );
      }
      if (!verificationOk) {
        verificationOk = consumeVmSubmitEligibility(req.user.id, challenge._id.toString());
      }
      if (!verificationOk) {
        return res.status(400).json({
          msg: "Run unlock_flag in the VM with your attest token from this page first, then submit the flag within ~20 minutes.",
          status: "vm_attest_required",
        });
      }
    } else {
      if (!verificationToken) {
        if (challenge.labPath) {
          return res.status(400).json({
            msg: "This challenge requires solving it in the lab environment first. Please complete the challenge in the lab to get a verification token.",
            status: "verification_required",
          });
        }
        return res.status(400).json({
          msg: "Solve the lab environment first to get a verification token.",
          status: "verification_required",
        });
      }

      verificationOk = verifyAndConsumeToken(
        verificationToken,
        req.user.id,
        challenge._id.toString()
      );

      if (!verificationOk) {
        return res.status(400).json({
          msg: "Invalid or expired verification token. Please complete the verification step again.",
          status: "invalid_token",
        });
      }
    }

    const normalizedSubmitted = answer.trim().toLowerCase();
    const normalizedCorrect = (challenge.correctAnswer || "").trim().toLowerCase();

    const isCorrect = normalizedSubmitted === normalizedCorrect;

    if (!isCorrect) {
      return res.status(400).json({
        msg: "Incorrect answer, try again.",
        status: "incorrect",
      });
    }

    // IMPORTANT: Points are ONLY awarded here, after:
    // 1) (Non-VM) lab verification token is validated, or (VM) VM attested unlock from container
    // 2) Flag is validated as correct
    // 3) User hasn't already completed the challenge
    // This is the ONLY place in the codebase where points are awarded for challenges
    const reward = challenge.points || 0;
    user.points = (user.points || 0) + reward;
    user.xp = (user.xp || 0) + reward;
    user.completedChallenges.push(challenge._id);
    await user.save();

    return res.json({
      msg: "Correct answer! Reward granted.",
      status: "correct",
      xpAwarded: reward,
      totalPoints: user.points,
      totalXp: user.xp,
    });
  } catch (err) {
    console.error("Error during answer submission:", err);
    res.status(500).json({ msg: "Server error during answer submission" });
  }
});

console.log("[ChallengeRoutes] ✅ Challenge routes loaded successfully");
console.log("[ChallengeRoutes] ========================================");
module.exports = router;
