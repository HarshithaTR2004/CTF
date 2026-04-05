const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

let currentPassword = "changeme";

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{csrf_basic_003}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · CSRF",
      objective: "This form has no anti-CSRF token. Complete a state-changing action the victim could be tricked into performing.",
    });

    let verificationToken = null;
    if (isSuccess && userId && challengeId) {
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
        .lab-skin .container { max-width: 640px; }
        .lab-skin .hint { color: var(--lab-accent2); margin: 10px 0; font-size: 14px; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Account · password change</h2>
        <p class="hint">Session hint — current password label: <strong>${escapeHtml(currentPassword)}</strong></p>
        <form method="POST" action="/lab/csrf-basic/change">
          <input name="newPassword" placeholder="New password" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Change password</button>
        </form>
        ${
          isSuccess
            ? `
          <div class="success lab-success-text" style="margin-top:14px">Password changed. Flag: ${escapeHtml(flag)}</div>
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
        <p class="lab-desc-snippet" style="margin-top:16px">No CSRF token on POST — think cross-site form submission.</p>
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[CSRF Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/change", (req, res) => {
  const { newPassword, challengeId, userId } = req.body;
  if (newPassword) {
    currentPassword = newPassword;
    res.redirect(
      `/lab/csrf-basic?success=1&challengeId=${encodeURIComponent(challengeId || "")}&userId=${encodeURIComponent(userId || "")}`
    );
  } else {
    res.redirect(
      `/lab/csrf-basic?challengeId=${encodeURIComponent(challengeId || "")}&userId=${encodeURIComponent(userId || "")}`
    );
  }
});

module.exports = router;
