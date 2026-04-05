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
    const flag = await resolveFlagForLab(challengeId, "FLAG{cmd_injection_basic_006}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Command injection",
      objective: "User input is concatenated into a shell ping — chain commands to reach the flag marker.",
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
        .lab-skin pre { background: color-mix(in srgb, var(--lab-bg) 50%, var(--lab-surface)); padding: 14px; border-radius: calc(var(--lab-radius) * 0.5); white-space: pre-wrap; border: 1px solid var(--lab-border); color: var(--lab-text); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Network diagnostic</h2>
        <div class="lab-info-box">Backend runs: <code>ping -c 3 &lt;your input&gt;</code> — metacharacters matter.</div>
        <form method="POST">
          <input name="host" placeholder="Host to ping (e.g. 8.8.8.8)" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Run ping</button>
        </form>
        ${req.query.output ? `<pre>${out}</pre>` : ""}
        ${
          hasFlag
            ? `
          <p class="success lab-success-text" style="margin-top:12px">Flag: ${escapeHtml(flag)}</p>
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
    console.error("[Command Injection Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  const host = req.body.host || "";
  const challengeId = req.body.challengeId || "";
  const userId = req.body.userId || "";

  const command = `ping -c 3 ${host}`;

  exec(command, (error, stdout, stderr) => {
    let output = stdout || stderr || error?.message || "";
    let solved = false;

    if (host.includes(";") || host.includes("|") || host.includes("&") || host.includes("`")) {
      solved = true;
      if (host.includes("cat") || host.includes("ls") || host.includes("whoami")) {
        output += "\n[Command executed successfully]";
      }
    }

    res.redirect(
      `/lab/command-injection-basic?output=${encodeURIComponent(output)}${solved ? "&flag=1" : ""}&challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`
    );
  });
});

module.exports = router;
