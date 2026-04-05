const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

function buildLogs(flag) {
  return [
    { timestamp: "2024-01-01 10:00:00", ip: "192.168.1.100", action: "LOGIN", user: "admin", status: "SUCCESS" },
    { timestamp: "2024-01-01 10:05:00", ip: "192.168.1.101", action: "LOGIN", user: "admin", status: "FAILED" },
    { timestamp: "2024-01-01 10:10:00", ip: "10.0.0.50", action: "FILE_ACCESS", file: "secret.txt", status: "SUCCESS" },
    { timestamp: "2024-01-01 10:15:00", ip: "192.168.1.100", action: "DOWNLOAD", file: "flag.txt", status: "SUCCESS" },
    { timestamp: "2024-01-01 10:20:00", ip: "172.16.0.25", action: "LOGIN", user: "attacker", status: "FAILED" },
    { timestamp: "2024-01-01 10:25:00", ip: "192.168.1.100", action: "EXPORT", data: flag, status: "SUCCESS" },
  ];
}

router.get("/", async (req, res) => {
  try {
    const filter = req.query.filter || "";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{memory_basic_063}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Forensics · Log correlation",
      objective: "Pivot through normalized log lines until the export row reveals the flag tied to this case.",
    });
    const logs = buildLogs(flag);

    let filteredLogs = logs;
    const foundFlag = filter && filteredLogs.some((log) => log.data === flag);
    if (filter) {
      filteredLogs = logs.filter((log) => JSON.stringify(log).toLowerCase().includes(filter.toLowerCase()));
    }

    let verificationToken = null;
    if (foundFlag && userId && challengeId) {
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
        .lab-skin .container { max-width: 1100px; }
        .lab-skin .nav a {
          padding: 10px 14px; margin: 4px 6px 4px 0; background: var(--lab-surface); color: var(--lab-text);
          text-decoration: none; display: inline-block; border-radius: calc(var(--lab-radius) * 0.45);
          border: 1px solid var(--lab-border);
        }
        .lab-skin .nav a:hover { border-color: var(--lab-accent); color: var(--lab-accent); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>SIEM export viewer</h2>
        <form method="GET">
          <input name="filter" placeholder="Filter (IP, user, action, path…)" value="${filter.replace(/"/g, "&quot;")}" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Apply filter</button>
        </form>
        ${
          foundFlag
            ? `
          <p class="lab-success-text" style="margin-top:14px">Sensitive export located. Flag: ${escapeHtml(flag)}</p>
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
        <table>
          <tr>
            <th>Timestamp</th>
            <th>IP</th>
            <th>Action</th>
            <th>User / file / data</th>
            <th>Status</th>
          </tr>
          ${filteredLogs
            .map(
              (log) => `
            <tr>
              <td>${escapeHtml(log.timestamp)}</td>
              <td>${escapeHtml(log.ip)}</td>
              <td>${escapeHtml(log.action)}</td>
              <td>${escapeHtml(String(log.user || log.file || log.data || "N/A"))}</td>
              <td>${escapeHtml(log.status)}</td>
            </tr>
          `
            )
            .join("")}
        </table>
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[Forensics Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
