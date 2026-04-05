const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const users = {
  1: { id: 1, username: "alice", role: "admin", permissions: ["read", "write", "admin"] },
  2: { id: 2, username: "bob", role: "user", permissions: ["read"] },
  3: { id: 3, username: "charlie", role: "user", permissions: ["read"] },
};

router.get("/", async (req, res) => {
  try {
    const targetUserId = req.query.userId || "2";
    const action = req.query.action || "view";
    const challengeId = req.query.challengeId || "";
    const userIdForToken = req.query.userIdForToken || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{idor_chain_hard_017}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · IDOR chain",
      objective: "Combine object reference bugs with a dangerous action mode to touch an admin row you should not control.",
    });

    const base = users[targetUserId];
    const user = base && targetUserId === "1" ? { ...base, flag } : base;
    const currentUser = users[2];

    const isExploited = action === "edit" && targetUserId === "1" && user && user.flag;

    let verificationToken = null;
    if (isExploited && userIdForToken && challengeId) {
      try {
        verificationToken = generateVerificationToken(userIdForToken, challengeId);
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
        .lab-skin .user-info { padding: 16px; background: color-mix(in srgb, var(--lab-bg) 40%, var(--lab-surface)); margin: 18px 0; border: 1px solid var(--lab-border); border-radius: calc(var(--lab-radius) * 0.55); }
        .lab-skin select { max-width: 320px; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Admin directory</h2>
        <p style="color:var(--lab-muted)">Signed in as <strong>${escapeHtml(currentUser.username)}</strong> (${escapeHtml(currentUser.role)})</p>
        <form method="GET">
          <input name="userId" placeholder="Target user ID" value="${escapeHtml(String(targetUserId))}" />
          <select name="action">
            <option value="view" ${action === "view" ? "selected" : ""}>View</option>
            <option value="edit" ${action === "edit" ? "selected" : ""}>Edit role</option>
          </select>
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userIdForToken" value="${escapeHtml(String(userIdForToken))}" />
          <button type="submit">Run</button>
        </form>
        ${
          user
            ? `
          <div class="user-info">
            <h3>User #${user.id}: ${escapeHtml(user.username)}</h3>
            <p>Role: ${escapeHtml(user.role)}</p>
            <p>Permissions: ${escapeHtml(user.permissions.join(", "))}</p>
            ${
              isExploited
                ? `
              <p class="lab-success-text">Escalation path hit. Flag: ${escapeHtml(user.flag)}</p>
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
            : "<p style=\"color:var(--lab-muted)\">User not found.</p>"
        }
        ${req.query.error ? `<p class="lab-error-text">${escapeHtml(req.query.error)}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[IDOR Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
