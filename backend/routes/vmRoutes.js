const express = require("express");
const http = require("http");
const router = express.Router();
const { getTargetHostPort } = require("../vm-terminal-proxy");

// Valid domains and difficulties for the 3 VM-based CTF domains
const VALID_DOMAINS = ["ad", "linux", "pentest"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

// Port mapping (must match seed): ad, linux, pentest × easy, medium, hard
const VM_PORT_MAP = {
  ad: { easy: { web: 4260, ssh: 2221 }, medium: { web: 4270, ssh: 2222 }, hard: { web: 4280, ssh: 2223 } },
  linux: { easy: { web: 4200, ssh: 2220 }, medium: { web: 4210, ssh: 2230 }, hard: { web: 4220, ssh: 2240 } },
  pentest: { easy: { web: 4230, ssh: 2250 }, medium: { web: 4240, ssh: 2260 }, hard: { web: 4250, ssh: 2270 } },
};
const VM_NAMES = {
  ad: "Enterprise Directory Services Lab",
  linux: "Linux System Security Lab",
  pentest: "Penetration Testing & Red Team Lab",
};

/**
 * GET /api/vm/terminal
 * Serves the VM lab panel HTML (SSH instructions, credentials).
 * Query: domain=ad|linux|pentest, difficulty=easy|medium|hard
 * Use this URL in the iframe so the same backend that serves /api also serves the panel (avoids "Cannot GET").
 */
router.get("/terminal", (req, res) => {
  const domain = (req.query.domain || "linux").toLowerCase();
  const difficulty = (req.query.difficulty || "easy").toLowerCase();
  const ports = VM_PORT_MAP[domain]?.[difficulty] || VM_PORT_MAP.linux.easy;
  const domainName = VM_NAMES[domain] || "VM Lab";
  const sshCmd = `ssh user@localhost -p ${ports.ssh}`;
  const webTerminalUrl = `http://localhost:${ports.web}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VM Lab - ${domainName}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #1e293b; color: #e2e8f0; padding: 0.75rem; min-height: 100vh; display: flex; flex-direction: column; }
    h1 { font-size: 1rem; margin: 0 0 0.5rem; color: #f8fafc; }
    .card { background: #334155; border-radius: 6px; padding: 0.6rem 0.75rem; margin-bottom: 0.5rem; }
    .card h2 { font-size: 0.8rem; margin: 0 0 0.25rem; color: #94a3b8; }
    code { background: #475569; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.8em; }
    a { color: #38bdf8; }
    .creds { margin-top: 0.25rem; font-size: 0.8rem; }
    .note { font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; }
    .terminal-wrap { flex: 1; min-height: 280px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-top: 0.5rem; position: relative; }
    .terminal-wrap iframe { width: 100%; height: 100%; min-height: 280px; border: none; }
    .terminal-fallback { display: none; padding: 1rem; color: #94a3b8; font-size: 0.85rem; position: absolute; inset: 0; background: #0f172a; }
    .terminal-fallback.visible { display: block; }
  </style>
</head>
<body>
  <h1>🖥️ ${domainName} — ${difficulty}</h1>
  <div class="card">
    <h2>Docker VM credentials</h2>
    <div class="creds"><strong>Username:</strong> user &nbsp; <strong>Password:</strong> password123</div>
    <p class="note" style="margin: 0.25rem 0 0;">SSH: <code>${sshCmd}</code> &nbsp;·&nbsp; <a href="${webTerminalUrl}" target="_blank" rel="noopener">Open terminal in new tab</a></p>
  </div>
  <div class="terminal-wrap">
    <iframe id="vm-term" src="${webTerminalUrl}" title="Docker VM Web Terminal (ttyd)" referrerpolicy="no-referrer"></iframe>
    <div id="fallback" class="terminal-fallback">
      <p><strong>Docker VM terminal not reachable.</strong></p>
      <p>Start the VM container from the project root:</p>
      <p><code>docker compose -f vms/docker-compose.vms.yml up -d</code></p>
      <p>Then refresh this page. The terminal below is the <strong>actual Linux VM</strong> (ttyd) from the container.</p>
    </div>
  </div>
  <p class="note">The terminal above is the <strong>Docker container VM</strong> (ttyd). If blank, run: <code>docker compose -f vms/docker-compose.vms.yml up -d</code> then refresh.</p>
  <script>
    (function(){
      var f = document.getElementById('fallback');
      var iframe = document.getElementById('vm-term');
      var t = setTimeout(function(){ f.classList.add('visible'); }, 5000);
      iframe.onload = function(){ clearTimeout(t); };
    })();
  </script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

/**
 * POST /api/vm/reset/:domain/:difficulty
 * Reset VM state for the given domain and difficulty.
 * Used by: Active Directory (ad), Linux Privilege Escalation (linux), Full Machine Exploitation (pentest).
 * In a full setup this would trigger Docker/Proxmox to reset the VM snapshot.
 */
router.post("/reset/:domain/:difficulty", async (req, res) => {
  try {
    const domain = (req.params.domain || "").toLowerCase();
    const difficulty = (req.params.difficulty || "").toLowerCase();

    if (!VALID_DOMAINS.includes(domain)) {
      return res.status(400).json({
        success: false,
        msg: `Invalid domain. Use one of: ${VALID_DOMAINS.join(", ")}`,
      });
    }
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        msg: `Invalid difficulty. Use one of: ${VALID_DIFFICULTIES.join(", ")}`,
      });
    }

    // Stub: in production you would call your VM provider (Docker, Proxmox, etc.)
    console.log(`[VM] Reset requested: domain=${domain}, difficulty=${difficulty}`);

    return res.json({
      success: true,
      msg: `VM reset requested for ${domain}/${difficulty}. In a full deployment, the VM would be reverted to snapshot.`,
      domain,
      difficulty,
    });
  } catch (err) {
    console.error("[VM] Reset error:", err);
    res.status(500).json({ success: false, msg: "VM reset failed" });
  }
});

/**
 * GET /api/vm/status/:domain/:difficulty
 * Returns VM status by checking if the Docker container's web terminal (ttyd) is reachable.
 * Uses same target as terminal proxy (Docker service name or VM_TERMINAL_HOST or 127.0.0.1).
 */
router.get("/status/:domain/:difficulty", (req, res) => {
  const domain = (req.params.domain || "").toLowerCase();
  const difficulty = (req.params.difficulty || "").toLowerCase();
  if (!VALID_DOMAINS.includes(domain) || !VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ success: false, msg: "Invalid domain or difficulty" });
  }
  const ports = VM_PORT_MAP[domain]?.[difficulty] || VM_PORT_MAP.linux.easy;
  const { hostname, port } = getTargetHostPort(domain, difficulty);
  const sendStopped = () => {
    if (res.headersSent) return;
    res.json({
      success: true,
      domain,
      difficulty,
      status: "stopped",
      port: ports.web,
      message: "Start the VM container: docker compose -f vms/docker-compose.vms.yml up -d (from project root).",
    });
  };
  const check = http.get(`http://${hostname}:${port}/`, (resp) => {
    if (res.headersSent) return;
    res.json({
      success: true,
      domain,
      difficulty,
      status: "running",
      port: ports.web,
      message: "Docker VM container is running. Web terminal (ttyd) is reachable.",
    });
  });
  check.on("error", sendStopped);
  check.setTimeout(2000, () => {
    check.destroy();
    sendStopped();
  });
});

module.exports = router;
