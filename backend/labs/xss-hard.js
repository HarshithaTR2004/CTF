const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

router.get("/", async (req, res) => {
  try {
    let input = req.query.input || "";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{dom_xss_hard_014}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · XSS filter bypass",
      objective: "A naive blacklist strips a few tokens — craft a payload that survives normalization but still executes.",
    });

    const originalInput = input;
    input = input.replace(/script/gi, "");
    input = input.replace(/onerror/gi, "");
    input = input.replace(/onload/gi, "");

    const hasXSS =
      originalInput !== input &&
      (originalInput.includes("<") || originalInput.includes("on") || originalInput.includes("javascript:"));

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
        .lab-skin .container { max-width: 800px; }
        .lab-skin .output { margin: 18px 0; padding: 14px; background: color-mix(in srgb, var(--lab-bg) 40%, var(--lab-surface)); border-radius: calc(var(--lab-radius) * 0.5); border: 1px solid var(--lab-border); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Sanitizer probe</h2>
        <div class="lab-info-box">Output is filtered then injected into the DOM — find the gap.</div>
        <form method="GET">
          <input name="input" placeholder="Payload" value="${originalInput.replace(/"/g, "&quot;")}" style="max-width:100%;width:min(480px,100%)" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Test</button>
        </form>
        <div class="output">Echo: <span>${input}</span></div>
        ${
          hasXSS
            ? `
          <div class="lab-success-text" style="margin-top:12px">
            <p>Bypass registered. Flag: ${escapeHtml(flag)}</p>
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
    console.error("[XSS Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
