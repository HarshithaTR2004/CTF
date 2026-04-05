const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

function buildMemoryDump(flag) {
  const encodedFlag = Buffer.from(flag).toString("base64");
  const hexFlag = Buffer.from(flag).toString("hex");
  return {
    processes: [
      { pid: 1001, name: "web_server", memory: "0x7f8a1c000000-0x7f8a1c100000" },
      { pid: 1002, name: "database", memory: "0x7f8b2d000000-0x7f8b2d200000" },
      { pid: 1003, name: "secret_process", memory: "0x7f8c3e000000-0x7f8c3e100000", data: hexFlag },
    ],
    strings: [
      "password=secret123",
      "noise_string_not_the_flag",
      `base64_data=${encodedFlag}`,
      "api_key=sk_test_abc123",
      `hex_string=${hexFlag}`,
    ],
    network: [
      {
        connection: "192.168.1.100:443",
        data: `GET /api/flag HTTP/1.1\nAuthorization: Bearer ${encodedFlag}`,
      },
    ],
  };
}

router.get("/", async (req, res) => {
  try {
    const section = req.query.section || "overview";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{memory_advanced_071}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Forensics · Memory triage",
      objective: "Decode artifacts from processes, strings, and PCAP snippets — the flag is split across encodings.",
    });
    const memoryDump = buildMemoryDump(flag);

    const flagSections = ["processes", "strings", "network"];
    let verificationToken = null;
    if (flagSections.includes(section) && userId && challengeId) {
      try {
        verificationToken = generateVerificationToken(userId, challengeId);
      } catch (err) {
        console.error("Error generating verification token:", err);
      }
    }

    const fj = flagJsString(flag);
    const cj = flagJsString(challengeId);
    const tj = flagJsString(verificationToken || "");
    const cq = encodeURIComponent(challengeId);
    const uq = encodeURIComponent(userId);

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(skin.docTitle)}</title>
      ${skin.fontLink}
      <style>
        ${skin.globalCss}
        .lab-skin .container { max-width: 1200px; }
        .lab-skin .nav { margin: 16px 0; }
        .lab-skin .nav a {
          padding: 10px 14px; margin: 4px 8px 4px 0; background: var(--lab-surface); color: var(--lab-text);
          text-decoration: none; display: inline-block; border: 1px solid var(--lab-border);
          border-radius: calc(var(--lab-radius) * 0.45);
        }
        .lab-skin .nav a.active {
          border-color: var(--lab-accent); color: var(--lab-accent); font-weight: 600;
        }
        .lab-skin pre { overflow-x: auto; font-size: 13px; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Volatile memory workspace</h2>
        <div class="nav">
          <a href="/lab/forensics-hard?section=overview&challengeId=${cq}&userId=${uq}" class="${section === "overview" ? "active" : ""}">Overview</a>
          <a href="/lab/forensics-hard?section=processes&challengeId=${cq}&userId=${uq}" class="${section === "processes" ? "active" : ""}">Processes</a>
          <a href="/lab/forensics-hard?section=strings&challengeId=${cq}&userId=${uq}" class="${section === "strings" ? "active" : ""}">Strings</a>
          <a href="/lab/forensics-hard?section=network&challengeId=${cq}&userId=${uq}" class="${section === "network" ? "active" : ""}">Network</a>
        </div>
        ${
          flagSections.includes(section)
            ? `
          <p class="lab-success-text" style="margin-top:8px">Deep section loaded — decode the evidence to recover your flag.</p>
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
        ${
          section === "overview"
            ? `
          <p style="color:var(--lab-muted)">Snapshot time: 2024-01-01 12:00:00 UTC</p>
          <p>Processes: ${memoryDump.processes.length} · String blobs: ${memoryDump.strings.length} · Flows: ${memoryDump.network.length}</p>
        `
            : ""
        }
        ${
          section === "processes"
            ? `
          <table>
            <tr><th>PID</th><th>Name</th><th>Range</th><th>Hex window</th></tr>
            ${memoryDump.processes
              .map(
                (p) => `
              <tr>
                <td>${p.pid}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.memory)}</td>
                <td>${escapeHtml(String(p.data || "N/A"))}</td>
              </tr>
            `
              )
              .join("")}
          </table>
        `
            : ""
        }
        ${section === "strings" ? `<pre>${escapeHtml(memoryDump.strings.join("\n"))}</pre>` : ""}
        ${
          section === "network"
            ? `<pre>${escapeHtml(memoryDump.network.map((n) => `${n.connection}\n${n.data}`).join("\n\n"))}</pre>`
            : ""
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[Forensics Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;
