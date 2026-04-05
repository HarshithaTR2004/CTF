const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const accounts = {
  victim: { email: "victim@example.com", role: "user", token: null },
  attacker: { email: "attacker@example.com", role: "user", token: null },
};

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const isExploited = isSuccess && req.query.email === "attacker@example.com";
    const flag = await resolveFlagForLab(challengeId, "FLAG{csrf_advanced_010}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · CSRF takeover",
      objective: "Forge a request that changes the victim mailbox to one you control — no second factor here.",
    });

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
    const emailVal = escapeHtml(req.query.email || "");

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(skin.docTitle)}</title>
      ${skin.fontLink}
      <style>${skin.globalCss} .lab-skin .container { max-width: 800px; }</style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Profile email</h2>
        <p style="color:var(--lab-muted)">Victim session: <strong>victim@example.com</strong></p>
        <form method="POST" action="/lab/csrf-medium/update">
          <input name="email" placeholder="New email" value="${emailVal.replace(/"/g, "&quot;")}" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Update email</button>
        </form>
        ${
          isExploited
            ? `
          <p class="lab-success-text" style="margin-top:14px">Email updated. Flag: ${escapeHtml(flag)}</p>
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
            : isSuccess
              ? `<p class="lab-success-text">Email updated.</p>`
              : ""
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[CSRF Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/update", (req, res) => {
  const { email, challengeId, userId } = req.body;
  const q = `challengeId=${encodeURIComponent(challengeId || "")}&userId=${encodeURIComponent(userId || "")}`;
  if (email) {
    accounts.victim.email = email;
    res.redirect(`/lab/csrf-medium?success=1&email=${encodeURIComponent(email)}&${q}`);
  } else {
    res.redirect(`/lab/csrf-medium?${q}`);
  }
});

module.exports = router;
