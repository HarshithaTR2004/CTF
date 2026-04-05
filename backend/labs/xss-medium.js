const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const messages = [];

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{stored_xss_medium_008}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Stored XSS",
      objective: "Post a comment that persists and executes when others (or this page) render the thread.",
    });

    const hasXSS = messages.some((m) => /<script|javascript:|on\w+=/i.test(m));
    let verificationToken = null;
    if (hasXSS && userId && challengeId) {
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
        .lab-skin .container { max-width: 820px; }
        .lab-skin textarea { width: 100%; box-sizing: border-box; min-height: 100px; margin: 10px 0; }
        .lab-skin .message { padding: 12px; margin: 10px 0; background: color-mix(in srgb, var(--lab-bg) 35%, var(--lab-surface)); border-left: 4px solid var(--lab-accent); border-radius: calc(var(--lab-radius) * 0.45); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Comment thread</h2>
        <div class="lab-info-box">User HTML is echoed back into the page without encoding.</div>
        <form method="POST">
          <textarea name="message" placeholder="Leave a comment…" rows="4"></textarea>
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Post</button>
        </form>
        <h3 style="font-family:var(--lab-heading);margin-top:20px">Thread</h3>
        ${messages.map((msg) => `<div class="message">${msg}</div>`).join("")}
        ${
          hasXSS
            ? `
          <p class="lab-success-text" style="margin-top:14px">Stored XSS path hit. Flag: ${escapeHtml(flag)}</p>
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
    console.error("[XSS Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  const message = req.body.message || "";
  const challengeId = req.body.challengeId || req.query.challengeId || "";
  const userId = req.body.userId || req.query.userId || "";
  if (message) {
    messages.push(message);
  }
  res.redirect(
    `/lab/xss-medium?challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`
  );
});

module.exports = router;
