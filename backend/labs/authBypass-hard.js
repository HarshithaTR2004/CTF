const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

let sessions = {};
let sessionCounter = 0;

router.get("/", async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.cookies?.sessionId || null;
    const action = req.query.action || "login";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{jwt_bypass_007}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Session fixation",
      objective: "Control the session identifier before the victim authenticates, then reuse that bucket.",
    });

    if (action === "login" && req.query.username && req.query.password) {
      const { username, password } = req.query;
      if (username === "admin" && password === "admin123") {
        const newSessionId = sessionId || `session_${++sessionCounter}`;
        sessions[newSessionId] = { username: "admin", role: "admin", authenticated: true };
        res.cookie("sessionId", newSessionId);
        return res.redirect(
          `/lab/auth-bypass-hard?sessionId=${encodeURIComponent(newSessionId)}&action=view&challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`
        );
      }
    }

    const session = sessionId ? sessions[sessionId] : null;

    const isExploited = session && session.role === "admin" && session.authenticated;

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

    const loginHref = `/lab/auth-bypass-hard?action=login&challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;

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
        .lab-skin .session-info { padding: 16px; background: color-mix(in srgb, var(--lab-bg) 45%, var(--lab-surface)); margin: 18px 0; border: 1px solid var(--lab-border); border-radius: calc(var(--lab-radius) * 0.55); }
        .lab-skin a { color: var(--lab-accent); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Session console</h2>
        ${
          action === "login"
            ? `
          <form method="GET">
            <input name="username" placeholder="Username" required />
            <input name="password" type="password" placeholder="Password" required />
            <input name="sessionId" placeholder="Session ID (optional)" />
            <input type="hidden" name="action" value="login" />
            <input type="hidden" name="challengeId" value="${challengeId}" />
            <input type="hidden" name="userId" value="${userId}" />
            <button type="submit">Login</button>
          </form>
        `
            : `
          ${
            session
              ? `
            <div class="session-info">
              <h3>Active session</h3>
              <p>Session ID: ${escapeHtml(String(sessionId))}</p>
              <p>Username: ${escapeHtml(session.username)}</p>
              <p>Role: ${escapeHtml(session.role)}</p>
              <p>Authenticated: ${session.authenticated}</p>
              ${
                isExploited
                  ? `
                <p class="lab-success-text">Admin session. Flag: ${escapeHtml(flag)}</p>
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
              : "<p style=\"color:var(--lab-muted)\">No session.</p>"
          }
          <p><a href="${loginHref}">Open login</a></p>
        `
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[Auth Bypass Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
