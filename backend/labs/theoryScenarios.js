/**
 * Workplace-style theory labs: each challenge gets a distinct activity layout.
 * Verification token = lowercase inner slug of FLAG{slug} (never sent in HTML/JSON spec).
 */

function proofToken(challenge) {
  const m = String(challenge.correctAnswer || "").match(/^FLAG\{([^}]+)\}$/i);
  if (m) return m[1].toLowerCase().replace(/\s+/g, "");
  return `proof${String(challenge._id).replace(/[^a-f0-9]/gi, "").slice(-10)}`;
}

function vidx(challenge, mod) {
  const hex = String(challenge._id).replace(/[^a-f0-9]/gi, "");
  const slice = hex.slice(-8) || "0";
  return parseInt(slice, 16) % mod;
}

function checklistFrom(filesToCat, extra = []) {
  const out = [{ id: "inventory", pattern: "^ls\\s*$", label: "Inventory the workspace (ls)" }];
  filesToCat.forEach((f, i) => {
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out.push({
      id: "cat_" + i,
      pattern: "^cat\\s+" + esc + "\\s*$",
      label: "Review evidence: cat " + f,
    });
  });
  extra.forEach((e, i) => {
    out.push({ id: "extra_" + i, pattern: e.pattern, label: e.label });
  });
  return out;
}

function buildCrypto(challenge) {
  const code = proofToken(challenge);
  const seed = challenge._id.toString().slice(-6).toUpperCase();
  const title = (challenge.title || "").toLowerCase();
  const cat = (challenge.category || "").toLowerCase();
  const isHex = title.includes("hex") || cat.includes("encoding") || vidx(challenge, 2) === 0;
  const plain = `crypto-${seed}`;
  const puzzle = isHex
    ? Buffer.from(plain, "utf8").toString("hex")
    : Buffer.from(plain, "utf8").toString("base64");
  const variant = vidx(challenge, 5);

  const variants = [
    {
      type: "Crypto — Analyst drop folder",
      instruction:
        "A partner team left ciphertext under ~/casefiles. Decode the blob, then record the LAB closeout token from vault/closeout.txt (you must open the files in the terminal).",
      vfs: {
        README: [
          "=== Encrypted case drop (SOC) ===",
          "1) ls",
          "2) cat case/README.txt && cat case/cipher.raw",
          "3) Decode cipher (Tools tab). Token is in vault/closeout.txt",
        ].join("\n"),
        "case/README.txt": "Cipher is in cipher.raw. Encoding: " + (isHex ? "HEX" : "BASE64") + ".",
        "case/cipher.raw": puzzle,
        "vault/closeout.txt": `ANALYST_SIGNOFF=ok\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["case/README.txt", "case/cipher.raw", "vault/closeout.txt"],
      puzzlePanel: "Decode case/cipher.raw → internal label crypto-******; token for verify is SUBMISSION_CODE.",
    },
    {
      type: "Crypto — Split artifact reassembly",
      instruction:
        "Two partial files hold hex/base64 fragments. Concatenate in order (see manifest), decode, then fetch the token from release/gate.txt.",
      vfs: {
        MANIFEST: "Order: fragments/a then fragments/b → decode as " + (isHex ? "hex" : "base64"),
        "fragments/a": puzzle.slice(0, Math.ceil(puzzle.length / 2)),
        "fragments/b": puzzle.slice(Math.ceil(puzzle.length / 2)),
        "release/gate.txt": `PIPELINE_OK=1\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["MANIFEST", "fragments/a", "fragments/b", "release/gate.txt"],
      puzzlePanel: "cat fragments/a fragments/b (paste together mentally) → decode → open release/gate.txt",
    },
    {
      type: "Crypto — Key custodian handoff",
      instruction:
        "Read keys/readme.txt, decode custodian/bundle using Tools, then read audit/token.txt for the submission code.",
      vfs: {
        "keys/readme.txt": "Bundle encoding: " + (isHex ? "hex" : "base64") + " of practice plaintext.",
        "custodian/bundle": puzzle,
        "audit/token.txt": `KMS_HANDOFF_COMPLETE\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["keys/readme.txt", "custodian/bundle", "audit/token.txt"],
      puzzlePanel: "Decode custodian/bundle; proof is SUBMISSION_CODE in audit/token.txt",
    },
    {
      type: "Crypto — Incident attachment scan",
      instruction:
        "Malware staging: inspect quarantine/attachment.enc (encoded note). Decode it, then escalate with ops/FLAG.txt.",
      vfs: {
        "quarantine/README": "Suspicious attachment — decode then open ops/FLAG.txt",
        "quarantine/attachment.enc": puzzle,
        "ops/FLAG.txt": `ESCALATION_CLEARED\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["quarantine/README", "quarantine/attachment.enc", "ops/FLAG.txt"],
      puzzlePanel: "Decode quarantine/attachment.enc; submit code from ops/FLAG.txt",
    },
    {
      type: "Crypto — Build pipeline artifact",
      instruction:
        "CI emitted build/secrets.b64 (or hex). Decode the intermediate artifact for context; submit using signing/proof.txt.",
      vfs: {
        "build/log.txt": "Secret material encoding: " + (isHex ? "hex" : "base64"),
        "build/secrets.b64": puzzle,
        "signing/proof.txt": `SIGNING_STAMP=valid\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["build/log.txt", "build/secrets.b64", "signing/proof.txt"],
      puzzlePanel: "Decode build/secrets.b64; verification string in signing/proof.txt",
    },
  ];

  const pick = variants[variant];
  return {
    labKind: "crypto",
    encodeKind: isHex ? "hex" : "base64",
    type: pick.type,
    instruction: pick.instruction,
    puzzle: pick.puzzlePanel,
    expected: code,
    placeholder: "paste SUBMISSION_CODE value",
    vfs: pick.vfs,
    objectives: [
      "Run ls and open each path listed in the mission checklist.",
      "Decode ciphertext using the Tools tab (or external tools).",
      "Locate SUBMISSION_CODE= in your evidence files and paste it into Lab verification.",
    ],
    checklist: checklistFrom(pick.files),
  };
}

/** Security governance, risk, identity, and resilience (theory workspace). */
function buildGovernance(challenge) {
  const code = proofToken(challenge);
  const title = challenge.title || "Challenge";
  const variant = vidx(challenge, 8);

  const variants = [
    {
      type: "GRC — Shift handoff package",
      instruction:
        "You are taking over an analyst shift. Read handoff/README, triage tickets/QUEUE.md, then close with hr/shift_close.txt (contains SUBMISSION_CODE).",
      vfs: {
        "handoff/README": "Read QUEUE then shift_close for billing token.",
        "tickets/QUEUE.md": `P1: Vendor VPN anomaly — ref ${title.slice(0, 24)}\nP2: Policy review pending`,
        "hr/shift_close.txt": `SHIFT=ended\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["handoff/README", "tickets/QUEUE.md", "hr/shift_close.txt"],
    },
    {
      type: "Identity — Access certification batch",
      instruction:
        "Complete quarterly access review: read iam/campaign.json summary, then record SUBMISSION_CODE from iam/signoff.txt.",
      vfs: {
        "iam/campaign.json": `{"app":"ERP","orphan_accounts":3,"campaign":"${title.slice(0, 20)}"}`,
        "iam/signoff.txt": `CERT_OK\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "iam/campaign.json", "iam/signoff.txt"],
    },
    {
      type: "Threat Ops — Detection engineering ticket",
      instruction:
        "Review detection/SIGMA_draft.yml context; release SUBMISSION_CODE from eng/merge_approval.txt.",
      vfs: {
        "detection/SIGMA_draft.yml": `title: Suspicious ${title.slice(0, 18)}\nstatus: test`,
        "eng/merge_approval.txt": `MERGE=approved\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "detection/SIGMA_draft.yml", "eng/merge_approval.txt"],
    },
    {
      type: "Zero Trust — Policy exception request",
      instruction:
        "Evaluate zt/policy_exception.md; finance approval token is in zt/cfo_release.txt.",
      vfs: {
        "zt/policy_exception.md": `Requestor notes: aligns with course topic — ${title}`,
        "zt/cfo_release.txt": `SUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "zt/policy_exception.md", "zt/cfo_release.txt"],
    },
    {
      type: "Resilience — Tabletop inject log",
      instruction:
        "Facilitator log in ir/tabletop.log — follow up with ir/hotwash_token.txt for lab completion.",
      vfs: {
        "ir/tabletop.log": `[T+0] Inject: ${title}\n[T+30] Comms check ok`,
        "ir/hotwash_token.txt": `SUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "ir/tabletop.log", "ir/hotwash_token.txt"],
    },
    {
      type: "Security awareness — Phishing case file",
      instruction:
        "Review mail/phish_case.msg metadata; SOC closure code in mail/closure.txt.",
      vfs: {
        "mail/phish_case.msg": `Subject: Urgent: ${title}\nX-Originating-IP: 203.0.113.9`,
        "mail/closure.txt": `USER_RETRAINED\nSUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "mail/phish_case.msg", "mail/closure.txt"],
    },
    {
      type: "Risk — Third-party assessment worksheet",
      instruction:
        "Read vendor/risk_notes.txt; submit SUBMISSION_CODE from vendor/board_signoff.txt.",
      vfs: {
        "vendor/risk_notes.txt": `Vendor review tied to learning objective: ${title}`,
        "vendor/board_signoff.txt": `SUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "vendor/risk_notes.txt", "vendor/board_signoff.txt"],
    },
    {
      type: "Executive briefing — Talking points prep",
      instruction:
        "Review exec/talking_points.md; communications stamp in exec/comms_token.txt.",
      vfs: {
        "exec/talking_points.md": `Slide deck hook: ${title}`,
        "exec/comms_token.txt": `SUBMISSION_CODE=${code}\n`,
      },
      files: ["README", "exec/talking_points.md", "exec/comms_token.txt"],
    },
  ];

  const pick = variants[variant];
  return {
    labKind: "governance",
    type: pick.type,
    instruction: pick.instruction,
    puzzle: "Workplace files — token only after checklist",
    expected: code,
    placeholder: "SUBMISSION_CODE from signoff file",
    vfs: {
      README: [
        "=== Enterprise security workspace ===",
        "Complete every checklist step in the terminal.",
        "Verification = paste SUBMISSION_CODE (not the challenge title).",
      ].join("\n"),
      ...pick.vfs,
    },
    objectives: [
      "Run ls, then open each path in the checklist (cat).",
      "Read context like a real handoff — the grade token is SUBMISSION_CODE=...",
      "Paste that code into Lab verification to unlock flag reveal in the parent app.",
    ],
    checklist: checklistFrom(pick.files),
  };
}

const DOMAIN_CRYPTO_THEORY = "Cryptography & PKI Theory";
const DOMAIN_GOV_THEORY = "Security Governance & Risk Foundations";

function buildLab(challenge) {
  const domain = challenge.domain || "";
  if (domain === DOMAIN_CRYPTO_THEORY) return buildCrypto(challenge);
  return buildGovernance(challenge);
}

module.exports = { buildLab, proofToken, DOMAIN_CRYPTO_THEORY, DOMAIN_GOV_THEORY };
