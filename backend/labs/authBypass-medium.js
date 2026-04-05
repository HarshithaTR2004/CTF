const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const secret = "weak_secret_key_123";

router.get("/", async (req, res) => {
  try {
    const token = req.query.token || "";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{jwt_bypass_007}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · JWT manipulation",
      objective: "Forge or tweak bearer claims so the portal believes you are admin.",
    });

    let userInfo = null;

    if (token) {
      try {
        userInfo = jwt.verify(token, secret);
      } catch (err) {
        try {
          userInfo = jwt.decode(token, { complete: true });
          if (userInfo && userInfo.payload) {
            userInfo = userInfo.payload;
          }
        } catch (e) {
          userInfo = { error: "Invalid token" };
        }
      }
    }

    const isExploited = userInfo && userInfo.role === "admin" && !userInfo.error;

    let verificationToken = null;
    if (isExploited && userId && challengeId) {
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
        .lab-skin .token-info { padding: 16px; background: color-mix(in srgb, var(--lab-bg) 45%, var(--lab-surface)); margin: 18px 0; border-radius: calc(var(--lab-radius) * 0.55); border: 1px solid var(--lab-border); }
        .lab-skin .token-info pre { margin: 0; font-size: 13px; overflow: auto; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Token gate</h2>
        <form method="GET">
          <input name="token" placeholder="Paste JWT" value="${token.replace(/"/g, "&quot;")}" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Verify</button>
        </form>
        ${
          userInfo
            ? `
          <div class="token-info">
            <pre>${escapeHtml(JSON.stringify(userInfo, null, 2))}</pre>
            ${
              isExploited
                ? `
              <p class="lab-success-text" style="margin-top:12px">Admin claim accepted. Flag: ${escapeHtml(flag)}</p>
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
        `
            : ""
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[Auth Bypass Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
