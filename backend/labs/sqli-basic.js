const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const users = [
  { username: "admin", password: "admin123" },
  { username: "user", password: "password" },
];

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{sqli_login_bypass_002}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · SQL injection",
      objective: "Break the login query by injecting SQL metacharacters so you authenticate without a valid password.",
    });
    const fj = flagJsString(flag);
    const cj = flagJsString(challengeId);
    const tj = flagJsString(req.query.token || "");

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(skin.docTitle)}</title>
      ${skin.fontLink}
      <style>
        ${skin.globalCss}
        .lab-skin .container { max-width: 520px; }
        .lab-skin .stack input { width: 100%; box-sizing: border-box; margin: 10px 0; }
        .lab-skin .stack button { width: 100%; margin-top: 8px; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel stack">
        <h2>Login form</h2>
        <div class="lab-info-box">The server builds SQL with string concatenation — classic injection surface.</div>
        <form method="POST">
          <input name="username" placeholder="Username" required />
          <input name="password" type="password" placeholder="Password" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Login</button>
        </form>
        ${req.query.error ? `<p class="error lab-error-text">${escapeHtml(req.query.error)}</p>` : ""}
        ${
          req.query.success
            ? `
          <p class="success lab-success-text">${escapeHtml(req.query.success)}</p>
          <p class="success lab-success-text">Flag: ${escapeHtml(flag)} — paste into Your Answer.</p>
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
    console.error("[SQLi Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", async (req, res) => {
  const { username, password } = req.body;
  const challengeId = req.query.challengeId || req.body.challengeId || "";
  const userId = req.query.userId || req.body.userId || "";

  const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

  const isExploited =
    query.includes("' OR '1'='1") ||
    query.includes("'--") ||
    query.includes("';--") ||
    username === "' OR '1'='1'--" ||
    username === "admin'--";

  let verificationToken = null;
  if (isExploited && userId && challengeId) {
    try {
      verificationToken = generateVerificationToken(userId, challengeId);
    } catch (err) {
      console.error("Error generating verification token:", err);
    }
  }

  const qBase = `challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;

  if (isExploited) {
    return res.redirect(
      `/lab/sqli-basic?success=${encodeURIComponent("Logged in successfully!")}&${qBase}&token=${encodeURIComponent(verificationToken || "")}`
    );
  }

  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    return res.redirect(`/lab/sqli-basic?success=${encodeURIComponent("Logged in successfully!")}&${qBase}`);
  }

  res.redirect(`/lab/sqli-basic?error=${encodeURIComponent("Invalid credentials")}&${qBase}`);
});

module.exports = router;
