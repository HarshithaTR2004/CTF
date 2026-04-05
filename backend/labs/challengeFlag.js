const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");

/**
 * Load the canonical flag for this lab from the challenge record so multiple
 * challenges can share the same lab route with different correctAnswer values.
 */
async function resolveFlagForLab(challengeId, fallbackFlag) {
  if (!challengeId || !mongoose.Types.ObjectId.isValid(challengeId)) {
    return fallbackFlag || "FLAG{invalid_challenge_id}";
  }
  const c = await Challenge.findById(challengeId).select("correctAnswer").lean();
  const ans = c && c.correctAnswer ? String(c.correctAnswer).trim() : "";
  return ans || fallbackFlag || "FLAG{challenge_not_found}";
}

/** Safe embedding in HTML text */
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safe embedding in JS string literals */
function flagJsString(flag) {
  return JSON.stringify(flag == null ? "" : String(flag));
}

module.exports = { resolveFlagForLab, escapeHtml, flagJsString };
