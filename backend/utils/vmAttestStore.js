const crypto = require("crypto");
const Challenge = require("../models/Challenge");

/** Pending browser-issued tokens: attestToken -> { userId, challengeId, expiresAt } */
const pendingAttest = new Map();

/** After VM callback: "userId:challengeId" -> expiresAt */
const vmSubmitEligible = new Map();

const PENDING_TTL_MS = 45 * 60 * 1000;
const ELIGIBLE_TTL_MS = 20 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingAttest.entries()) {
    if (v.expiresAt < now) pendingAttest.delete(k);
  }
  for (const [k, exp] of vmSubmitEligible.entries()) {
    if (exp < now) vmSubmitEligible.delete(k);
  }
}, 60 * 1000);

function createPendingVmAttest(userId, challengeId) {
  const attestToken = crypto.randomBytes(32).toString("hex");
  pendingAttest.set(attestToken, {
    userId: String(userId),
    challengeId: String(challengeId),
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
  return attestToken;
}

/**
 * VM unlock wrapper (curl) calls this with shared header secret.
 * Validates pending token + unlockKey vs DB, then allows one flag submit.
 */
async function processVmAttestCallback(attestToken, unlockKey, vmSecret) {
  const expected = process.env.CYBERRANGEX_VM_SECRET || "";
  if (!expected || vmSecret !== expected) {
    return { ok: false, status: 403, msg: "Invalid VM attestation secret." };
  }
  if (!attestToken || unlockKey == null || String(unlockKey).trim() === "") {
    return { ok: false, status: 400, msg: "Missing attestToken or unlockKey." };
  }

  const pending = pendingAttest.get(attestToken);
  if (!pending) {
    return { ok: false, status: 400, msg: "Unknown or expired attest token. Reload the challenge page." };
  }
  if (pending.expiresAt < Date.now()) {
    pendingAttest.delete(attestToken);
    return { ok: false, status: 400, msg: "Attest token expired. Reload the challenge page." };
  }

  const challenge = await Challenge.findById(pending.challengeId).select("vmConfig");
  if (!challenge || !challenge.vmConfig?.enabled) {
    return { ok: false, status: 404, msg: "Challenge not found or not a VM challenge." };
  }

  const expectedKey =
    challenge.vmConfig.unlockKey != null ? String(challenge.vmConfig.unlockKey).trim() : "";
  const got = String(unlockKey).trim();
  if (!expectedKey || expectedKey !== got) {
    return { ok: false, status: 400, msg: "unlockKey does not match this challenge." };
  }

  pendingAttest.delete(attestToken);
  const slot = `${pending.userId}:${pending.challengeId}`;
  vmSubmitEligible.set(slot, Date.now() + ELIGIBLE_TTL_MS);
  return { ok: true, msg: "VM unlock recorded. Submit your flag in the browser." };
}

function consumeVmSubmitEligibility(userId, challengeId) {
  const slot = `${String(userId)}:${String(challengeId)}`;
  const exp = vmSubmitEligible.get(slot);
  if (!exp || exp < Date.now()) {
    if (exp) vmSubmitEligible.delete(slot);
    return false;
  }
  vmSubmitEligible.delete(slot);
  return true;
}

function isVmAttestSecretConfigured() {
  return Boolean(process.env.CYBERRANGEX_VM_SECRET && String(process.env.CYBERRANGEX_VM_SECRET).trim());
}

module.exports = {
  createPendingVmAttest,
  processVmAttestCallback,
  consumeVmSubmitEligibility,
  isVmAttestSecretConfigured,
};
