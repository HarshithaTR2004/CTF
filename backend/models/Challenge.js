const mongoose = require("mongoose");

// Simplified challenge model for non-CTF flow.
// Each challenge is solved by submitting a correct answer, and users
// are rewarded XP/points when they solve it.
const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true, // e.g. XSS, SQL Injection, etc. (subcategory within domain)
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    required: true,
    min: 0,
  },
  // Answer that is considered correct. Kept simple on purpose –
  // can later be extended to support multiple correct answers, regex, etc.
  correctAnswer: {
    type: String,
    required: true,
  },
  // Optional hints for the challenge.
  hints: {
    type: [String],
    default: [],
  },
  // Path to the interactive lab environment (e.g., "/lab/xss-basic")
  // If provided, the challenge will show an interactive lab instead of just answer submission
  labPath: {
    type: String,
    default: null,
  },
  // VM configuration for VM-based domains
  vmConfig: {
    type: {
      enabled: { type: Boolean, default: false },
      vmUrl: { type: String, default: null }, // URL to access the VM (VNC/Web interface)
      vmType: { type: String, default: null }, // e.g., "kali", "windows", "linux"
      sshAccess: { type: String, default: null }, // SSH command to access VM
      webTerminal: { type: String, default: null }, // Web terminal URL
      resetEndpoint: { type: String, default: null }, // Endpoint to reset VM state
      credentials: {
        type: {
          username: { type: String, default: null },
          password: { type: String, default: null },
        },
        default: null,
      },
      // VM-side unlock mechanism (no web verification UI).
      // `unlockKey` is an identifier that the VM-side unlocker uses to
      // copy the correct flag into a readable location.
      unlockKey: { type: String, default: null },
      unlockCommand: { type: String, default: null }, // Full command to run inside the VM
    },
    default: null,
  },
  // VM flag - the actual flag stored inside the VM (different from correctAnswer which is submitted)
  vmFlag: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Challenge", ChallengeSchema);
