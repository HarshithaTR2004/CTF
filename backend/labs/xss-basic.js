const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

router.get("/", async (req, res) => {
  try {
    const name = req.query.name || "";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{reflected_xss_basic_001}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Reflected XSS",
      objective: "Inject a script payload via the name field so the app reflects executable markup and reveals your challenge flag.",
    });

    const hasXSS =
      name.includes("<script>") || name.includes("</script>") || name.includes("javascript:");

    let verificationToken = null;
    if (hasXSS && userId && challengeId) {
      try {
        verificationToken = generateVerificationToken(userId, challengeId);
      } catch (err) {
        console.error("[XSS Basic] Error generating verification token:", err);
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
        .lab-skin .result p { margin: 0; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Reflected input</h2>
        <div class="lab-info-box">
          <strong>Task:</strong> Exploit reflected XSS. Your input is echoed below without sanitization.
        </div>
        <form method="GET" action="/lab/xss-basic">
          <label for="name">Enter your name:</label><br><br>
          <input type="text" id="name" name="name" placeholder="Try: &lt;script&gt;alert('XSS')&lt;/script&gt;" value="${name.replace(/"/g, "&quot;")}">
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Submit</button>
        </form>
        <div class="result">
          <h3>Result</h3>
          <p>Hello ${name}</p>
        </div>
        ${
          hasXSS
            ? `
          <div class="success lab-success-text">
            <p>✓ XSS detected. Flag: ${escapeHtml(flag)}</p>
            <p>Submit this flag in the main CyberRangeX answer box for points.</p>
          </div>
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
    console.error("[XSS Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
