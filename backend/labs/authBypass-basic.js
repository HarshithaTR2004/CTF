const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const users = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "user", password: "password", role: "user" },
];

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{jwt_bypass_007}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Authentication",
      objective: "Weak comparison or logic lets you escalate to an administrative session — find the bypass.",
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
        .lab-skin .container { max-width: 520px; }
        .lab-skin .stack input { width: 100%; box-sizing: border-box; margin: 10px 0; }
        .lab-skin .stack button { width: 100%; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel stack">
        <h2>Staff login</h2>
        <div class="lab-info-box">Validation is not as strict as it looks — read the code paths carefully.</div>
        <form method="POST">
          <input name="username" placeholder="Username" required />
          <input name="password" type="password" placeholder="Password" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Login</button>
        </form>
        ${req.query.error ? `<p class="error lab-error-text">${escapeHtml(req.query.error)}</p>` : ""}
        ${
          isSuccess
            ? `
          <p class="success lab-success-text">Admin session. Flag: ${escapeHtml(flag)}</p>
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
    console.error("[Auth Bypass Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  const { username, password, challengeId, userId } = req.body;
  const q = `challengeId=${encodeURIComponent(challengeId || "")}&userId=${encodeURIComponent(userId || "")}`;

  const user = users.find((u) => {
    return u.username == username && u.password == password;
  });

  if (user && user.role === "admin") {
    return res.redirect(`/lab/auth-bypass-basic?success=1&${q}`);
  }

  if (user) {
    return res.redirect(`/lab/auth-bypass-basic?error=${encodeURIComponent("User logged in but not admin")}&${q}`);
  }

  res.redirect(`/lab/auth-bypass-basic?error=${encodeURIComponent("Invalid credentials")}&${q}`);
});

module.exports = router;
