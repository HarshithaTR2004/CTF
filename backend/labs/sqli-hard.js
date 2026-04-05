const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const db = {
  users: [
    { id: 1, username: "admin", password: "admin", email: "admin@example.com" },
    { id: 2, username: "user1", password: "pass", email: "user1@example.com" },
  ],
};

router.get("/", async (req, res) => {
  try {
    const result =
      req.query.result ||
      "Enter a user ID and click Check User. Use time-based blind SQLi (e.g. 1 AND SLEEP(2)--).";
    const showFlag = req.query.flag === "1";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{blind_sqli_hard_015}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Blind SQLi",
      objective: "No direct data leak — infer truth with timing or boolean conditions, then unlock the flag.",
    });

    let verificationToken = null;
    if (showFlag && userId && challengeId) {
      try {
        verificationToken = generateVerificationToken(userId, challengeId);
      } catch (err) {
        console.error("Error generating verification token:", err);
      }
    }

    const fj = flagJsString(flag);
    const cj = flagJsString(challengeId);
    const tj = flagJsString(verificationToken || "");

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(skin.docTitle)}</title>
      ${skin.fontLink}
      <style>
        ${skin.globalCss}
        .lab-skin .container { max-width: 800px; }
        .lab-skin .result-box { margin: 18px 0; padding: 16px; background: color-mix(in srgb, var(--lab-bg) 45%, var(--lab-surface)); border-radius: calc(var(--lab-radius) * 0.5); border: 1px solid var(--lab-border); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Blind check endpoint</h2>
        <div class="lab-info-box">Responses are minimal — use delays and conditional errors as an oracle.</div>
        <form method="GET" action="/lab/sqli-hard/check">
          <input name="id" placeholder="e.g. 1 AND SLEEP(2)--" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Check user</button>
        </form>
        <div class="result-box ${showFlag ? "lab-success-text" : ""}">${escapeHtml(result)}</div>
        ${
          showFlag
            ? `
          <p class="lab-success-text">Flag: ${escapeHtml(flag)}</p>
          <script>
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'CHALLENGE_SOLVED',
                challengeId: ${cj},
                flag: ${fj},
                answer: ${fj},
                verificationToken: ${tj}
              }, '*');
            }
          </script>
        `
            : ""
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[SQLi Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.get("/check", (req, res) => {
  const id = String(req.query.id || "");
  const challengeId = req.query.challengeId || "";
  const userId = req.query.userId || "";
  const q = `challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;

  if (/SLEEP|AND\s*\(\s*SELECT/i.test(id)) {
    setTimeout(() => {
      res.redirect(
        `/lab/sqli-hard?result=${encodeURIComponent("Time-based blind SQLi detected. You extracted the flag.")}&flag=1&${q}`
      );
    }, 2000);
    return;
  }
  if (id.includes("' AND '1'='1") || id.includes("1=1")) {
    return res.redirect(
      `/lab/sqli-hard?result=${encodeURIComponent("Boolean condition true. Try time-based injection with SLEEP(2) to extract the flag.")}&${q}`
    );
  }
  const user = db.users.find((u) => u.id == id);
  res.redirect(
    `/lab/sqli-hard?result=${encodeURIComponent(user ? "User exists." : "User not found. Try: 1 AND SLEEP(2)--")}&${q}`
  );
});

module.exports = router;
