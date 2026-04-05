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
    const flag = await resolveFlagForLab(challengeId, "FLAG{cmd_injection_medium_013}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Command chaining",
      objective: "Filename is passed to a shell one-liner — chain commands to reach sensitive paths.",
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
        <h2>File reader utility</h2>
        <div class="lab-info-box">Runs: <code>cat &lt;your input&gt;</code></div>
        <form method="POST">
          <input name="filename" placeholder="Filename to read" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Read</button>
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
    console.error("[Command Injection Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  const filename = req.body.filename || "";
  const challengeId = req.body.challengeId || "";
  const userId = req.body.userId || "";
  const q = `challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;

  const command = `cat ${filename}`;

  exec(command, (error, stdout, stderr) => {
    let output = stdout || stderr || error?.message || "";
    let solved = false;

    if (filename.includes(";") || filename.includes("&&") || filename.includes("||")) {
      solved = true;
      if (filename.includes("/etc/passwd") || filename.includes("flag")) {
        output += "\n[File contents retrieved]";
      }
    }

    res.redirect(
      `/lab/command-injection-medium?output=${encodeURIComponent(output)}${solved ? "&flag=1" : ""}&${q}`
    );
  });
});

module.exports = router;
