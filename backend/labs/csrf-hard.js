const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

let csrfToken = "random_token_" + Math.random().toString(36);

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{csrf_samesite_hard_016}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · CSRF token weakness",
      objective: "A token is present but validation may be shallow — find how to satisfy the check without a live session read.",
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
        .lab-skin .container { max-width: 800px; }
        .lab-skin .token-line { color: var(--lab-accent2); font-family: var(--lab-font); font-size: 13px; word-break: break-all; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Wire transfer</h2>
        <p class="token-line">CSRF token (leaked to page): ${escapeHtml(csrfToken)}</p>
        <form method="POST" action="/lab/csrf-hard/transfer">
          <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}" />
          <input name="amount" placeholder="Amount" required />
          <input name="recipient" placeholder="Recipient" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Transfer</button>
        </form>
        ${
          isSuccess
            ? `
          <p class="lab-success-text" style="margin-top:14px">Transfer recorded. Flag: ${escapeHtml(flag)}</p>
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
        ${req.query.error ? `<p class="lab-error-text">${escapeHtml(req.query.error)}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[CSRF Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/transfer", (req, res) => {
  const { csrfToken: token, amount, recipient, challengeId, userId } = req.body;
  const q = `challengeId=${encodeURIComponent(challengeId || "")}&userId=${encodeURIComponent(userId || "")}`;

  if (!token || (token !== csrfToken && !token.includes("random_token"))) {
    return res.redirect(`/lab/csrf-hard?error=${encodeURIComponent("Invalid CSRF token")}&${q}`);
  }

  if (amount && recipient) {
    res.redirect(`/lab/csrf-hard?success=1&${q}`);
  } else {
    res.redirect(`/lab/csrf-hard?error=${encodeURIComponent("Missing fields")}&${q}`);
  }
});

module.exports = router;
