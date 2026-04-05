const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const db = {
  users: [
    { id: 1, username: "admin", password: "secret123", role: "admin" },
    { id: 2, username: "alice", password: "pass123", role: "user" },
    { id: 3, username: "bob", password: "password", role: "user" },
  ],
  secrets: [
    { id: 1, name: "database_password", value: "[redacted]" },
    { id: 2, name: "api_key", value: "sk_test_123456" },
  ],
};

router.get("/", async (req, res) => {
  try {
    const id = req.query.id || "1";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{union_sqli_medium_009}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · UNION SQLi",
      objective: "The id parameter is concatenated into SQL — pivot with UNION to surface hidden columns.",
    });

    let result;
    const isExploited = id.includes("UNION") || id.includes("union");
    if (isExploited) {
      result = {
        ...db.users[0],
        flag,
      };
    } else {
      result = db.users.find((u) => u.id == id) || { error: "User not found" };
    }

    let verificationToken = null;
    if (isExploited && result.flag && userId && challengeId) {
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
        .lab-skin pre { font-size: 13px; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>User lookup API</h2>
        <div class="lab-info-box">Query shape: <code>SELECT * FROM users WHERE id = '&lt;input&gt;'</code></div>
        <form method="GET">
          <input name="id" placeholder="User ID" value="${id.replace(/"/g, "&quot;")}" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Fetch</button>
        </form>
        <h3 style="font-family:var(--lab-heading)">Raw row</h3>
        <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
        ${
          result && result.flag
            ? `
          <p class="lab-success-text" style="margin-top:12px">Flag: ${escapeHtml(result.flag)}</p>
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
    console.error("[SQLi Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
