const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

router.get("/", async (req, res) => {
  try {
    const profileUserId = req.query.profileUserId || "2";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{idor_basic_004}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · IDOR",
      objective: "Enumerate numeric identifiers until you reach a profile that should not be exposed to you.",
    });

    const profiles = {
      1: { id: 1, username: "alice", email: "alice@example.com", role: "admin", flag },
      2: { id: 2, username: "bob", email: "bob@example.com", role: "user" },
      3: { id: 3, username: "charlie", email: "charlie@example.com", role: "user" },
    };

    const profile = profiles[profileUserId];
    const isExploited = profileUserId === "1" && profile && profile.flag;

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
        .lab-skin .container { max-width: 820px; }
        .lab-skin .profile { padding: 16px; background: color-mix(in srgb, var(--lab-bg) 40%, var(--lab-surface)); margin: 18px 0; border-radius: calc(var(--lab-radius) * 0.55); border: 1px solid var(--lab-border); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>User directory</h2>
        <div class="lab-info-box">Direct object references are exposed via <code>profileUserId</code>.</div>
        <form method="GET">
          <input name="profileUserId" placeholder="Profile user ID" value="${escapeHtml(String(profileUserId))}" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">View profile</button>
        </form>
        ${
          profile
            ? `
          <div class="profile">
            <h3>Profile #${profile.id}</h3>
            <p>Username: ${escapeHtml(profile.username)}</p>
            <p>Email: ${escapeHtml(profile.email)}</p>
            <p>Role: ${escapeHtml(profile.role)}</p>
            ${
              profile.flag && isExploited
                ? `
              <p class="success lab-success-text" style="margin-top:10px">Flag: ${escapeHtml(flag)}</p>
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
            : "<p style=\"color:var(--lab-muted)\">Profile not found.</p>"
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[IDOR Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
