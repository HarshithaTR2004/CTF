// In-memory store for challenge verification tokens
// Format: Map<token, { userId, challengeId, expiresAt }>
const verificationTokens = new Map();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of verificationTokens.entries()) {
    if (data.expiresAt < now) {
      verificationTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a verification token when challenge is successfully solved in lab
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {string} Verification token
 */
function generateVerificationToken(userId, challengeId) {
  const token = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes expiry
  
  verificationTokens.set(token, {
    userId,
    challengeId,
    expiresAt,
    createdAt: Date.now()
  });
  
  return token;
}

/**
 * Verify and consume a verification token
 * @param {string} token - Verification token
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {boolean} True if token is valid
 */
function verifyAndConsumeToken(token, userId, challengeId) {
  if (!token) return false;
  
  const tokenData = verificationTokens.get(token);
  
  if (!tokenData) {
    return false; // Token doesn't exist
  }
  
  // Check if token matches user and challenge
  if (tokenData.userId !== userId || tokenData.challengeId !== challengeId) {
    return false; // Token doesn't match
  }
  
  // Check if token expired
  if (tokenData.expiresAt < Date.now()) {
    verificationTokens.delete(token);
    return false; // Token expired
  }
  
  // Token is valid - consume it (delete so it can't be reused)
  verificationTokens.delete(token);
  return true;
}

/**
 * Check token validity without consuming it.
 * Used to safely reveal the flag after a lab/VM verification step.
 */
function isTokenValid(token, userId, challengeId) {
  if (!token) return false;
  const tokenData = verificationTokens.get(token);
  if (!tokenData) return false;
  if (tokenData.userId !== userId || tokenData.challengeId !== challengeId) return false;
  if (tokenData.expiresAt < Date.now()) {
    verificationTokens.delete(token);
    return false;
  }
  return true;
}

/**
 * Check if a token exists (without consuming it) - for validation
 */
function tokenExists(token) {
  if (!token) return false;
  const tokenData = verificationTokens.get(token);
  if (!tokenData) return false;
  if (tokenData.expiresAt < Date.now()) {
    verificationTokens.delete(token);
    return false;
  }
  return true;
}

module.exports = {
  generateVerificationToken,
  verifyAndConsumeToken,
  isTokenValid,
  tokenExists
};
