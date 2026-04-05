const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{log_analysis_basic_058}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Forensics · Static artifact hunt",
      objective: "The flag for this challenge is embedded in this document in non-obvious ways — treat it like a disk image triage without leaving the browser.",
    });

    let verificationToken = null;
    if (userId && challengeId) {
      try {
        verificationToken = generateVerificationToken(userId, challengeId);
      } catch (err) {
        console.error("Error generating verification token:", err);
      }
    }

    const tj = flagJsString(verificationToken || "");
    const cj = flagJsString(challengeId);
    const fj = flagJsString(flag);

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
        .lab-skin .flag { color: var(--lab-bg); background: var(--lab-bg); position: absolute; left: -9999px; }
        .lab-skin .hidden { opacity: 0.02; font-size: 1px; color: var(--lab-muted); }
        .lab-skin pre { background: color-mix(in srgb, var(--lab-bg) 50%, var(--lab-surface)); padding: 14px; border-radius: calc(var(--lab-radius) * 0.5); border: 1px solid var(--lab-border); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Evidence browser</h2>
        <div class="lab-info-box">Use developer tools: DOM tree, comments, inline styles, and console output.</div>
        <div class="flag">${escapeHtml(flag)}</div>
        <p style="color:var(--lab-muted)">Metadata and transport headers may also carry artifacts in real casework — here, focus on the page itself.</p>
        <div class="hidden">${escapeHtml(flag)}</div>
        <pre>Tip: view-source or Elements panel — look for off-screen and near-invisible nodes.</pre>
        </div>
      </div>
      <script>
        console.log("Forensics lab instance:", ${cj});
        (function() {
          const token = ${tj};
          if (window.parent && window.parent !== window && token) {
            window.parent.postMessage({
              type: 'LAB_READY',
              challengeId: ${cj},
              verificationToken: token
            }, '*');
          }
        })();
      </script>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[Forensics Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
