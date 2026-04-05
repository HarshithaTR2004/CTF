const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const hasFlag = req.query.flag === "1" || req.query.flag === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{cmd_injection_hard_019}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Filtered command exec",
      objective: "Dangerous symbols are stripped server-side — still reach code execution with shell tricks.",
    });

    let verificationToken = null;
    if (hasFlag && userId && challengeId) {
      try {
        verificationToken = generateVerificationToken(userId, challengeId);
      } catch (err) {
        console.error("Error generating verification token:", err);
      }
    }

    const fj = flagJsString(flag);
    const cj = flagJsString(challengeId);
    const tj = flagJsString(verificationToken || "");
    const out = req.query.output ? escapeHtml(req.query.output) : "";

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
        .lab-skin pre { white-space: pre-wrap; word-break: break-word; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>URL fetcher</h2>
        <div class="lab-info-box">Invokes curl with a filtered argument list — some bypasses remain.</div>
        <form method="POST">
          <input name="url" placeholder="URL to fetch" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Fetch</button>
        </form>
        ${req.query.output ? `<pre>${out}</pre>` : ""}
        ${
          hasFlag
            ? `
          <p class="lab-success-text" style="margin-top:12px">Flag: ${escapeHtml(flag)}</p>
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
    console.error("[Command Injection Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  let url = req.body.url || "";
  const challengeId = req.body.challengeId || "";
  const userId = req.body.userId || "";
  const q = `challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;

  url = url.replace(/[;&|`$]/g, "");

  const command = `curl ${url}`;

  exec(command, (error, stdout, stderr) => {
    let output = stdout || stderr || error?.message || "";
    let solved = false;

    const originalUrl = req.body.url || "";
    if (
      originalUrl.includes("$") ||
      originalUrl.includes("${") ||
      originalUrl.includes("base64") ||
      originalUrl.includes("$((") ||
      originalUrl.includes("env")
    ) {
      solved = true;
      output += "\n[RCE achieved]";
    }

    res.redirect(
      `/lab/command-injection-hard?output=${encodeURIComponent(output)}${solved ? "&flag=1" : ""}&${q}`
    );
  });
});

module.exports = router;
