const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const Challenge = require("./models/Challenge");

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require("./routes/authRoutes");
const challengeRoutes = require("./routes/challengeRoutes");
const profileRoutes = require("./routes/profileRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const challengeGuideRoutes = require("./routes/challengeGuideRoutes");
const scenarioRoutes = require("./routes/scenarioRoutes"); // New scenario routes
const adminRoutes = require("./routes/adminRoutes");
const vmRoutes = require("./routes/vmRoutes");
const { vmTerminalFrameProxy, attachVmTerminalWsProxy, serveTerminalFrameRoot } = require("./vm-terminal-proxy");

// Health check for connectivity (tunnel, nginx, backend) — no auth required
app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, msg: "backend reachable" });
});

app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/challenge-guide", challengeGuideRoutes);
app.use("/api/scenarios", scenarioRoutes); // Use scenario routes
app.use("/api/admin", adminRoutes);

// VM terminal frame: explicit GET so "Cannot GET" never happens (e.g. when middleware path differs)
app.get("/api/vm/terminal-frame/:domain/:difficulty", (req, res) => {
  const domain = (req.params.domain || "linux").toLowerCase();
  const difficulty = (req.params.difficulty || "easy").toLowerCase();
  if (!["ad", "linux", "pentest"].includes(domain) || !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).send("Invalid domain or difficulty");
  }
  serveTerminalFrameRoot(domain, difficulty, req, res);
});
app.get("/api/vm/terminal-frame/:domain/:difficulty/", (req, res) => {
  const domain = (req.params.domain || "linux").toLowerCase();
  const difficulty = (req.params.difficulty || "easy").toLowerCase();
  if (!["ad", "linux", "pentest"].includes(domain) || !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).send("Invalid domain or difficulty");
  }
  serveTerminalFrameRoot(domain, difficulty, req, res);
});
// Proxy for subpaths (e.g. /api/vm/terminal-frame/pentest/easy/ws, static assets)
app.use("/api/vm/terminal-frame", vmTerminalFrameProxy);

// Explicit GET /api/vm/terminal first so the VM panel always works (avoids "Cannot GET" from router/mount order)
app.get("/api/vm/terminal", (req, res) => {
  const domain = (req.query.domain || "linux").toLowerCase();
  const difficulty = (req.query.difficulty || "easy").toLowerCase();
  const VM_PORTS = {
    ad: { easy: { web: 4260, ssh: 2221 }, medium: { web: 4270, ssh: 2222 }, hard: { web: 4280, ssh: 2223 } },
    linux: { easy: { web: 4200, ssh: 2220 }, medium: { web: 4210, ssh: 2230 }, hard: { web: 4220, ssh: 2240 } },
    pentest: { easy: { web: 4230, ssh: 2250 }, medium: { web: 4240, ssh: 2260 }, hard: { web: 4250, ssh: 2270 } },
  };
  const VM_LABELS = { ad: "Active Directory", linux: "Linux Privilege Escalation", pentest: "VM Lab" };
  const ports = VM_PORTS[domain]?.[difficulty] || VM_PORTS.linux.easy;
  const domainName = VM_LABELS[domain] || "VM Lab";
  const sshCmd = `ssh user@localhost -p ${ports.ssh}`;
  const webTerminalUrl = `http://localhost:${ports.web}`;
  // Use backend-proxied URL so iframe loads VM terminal from same origin (works when backend is on server)
  const iframeSrc = `/api/vm/terminal-frame/${domain}/${difficulty}/`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>VM Lab - ${domainName}</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#1e293b;color:#e2e8f0;padding:.75rem;min-height:100vh;display:flex;flex-direction:column}h1{font-size:1rem;margin:0 0 .5rem;color:#f8fafc}.card{background:#334155;border-radius:6px;padding:.6rem .75rem;margin-bottom:.5rem}.card h2{font-size:.8rem;margin:0 0 .25rem;color:#94a3b8}code{background:#475569;padding:.15em .35em;border-radius:4px;font-size:.8em}a{color:#38bdf8}.creds{margin-top:.25rem;font-size:.8rem}.note{font-size:.75rem;color:#94a3b8;margin-top:.5rem}.terminal-wrap{flex:1;min-height:280px;background:#0f172a;border-radius:6px;overflow:hidden;margin-top:.5rem;position:relative}.terminal-wrap iframe{width:100%;height:100%;min-height:280px;border:none}.terminal-fallback{display:none;padding:1rem;color:#94a3b8;font-size:.85rem;position:absolute;inset:0;background:#0f172a;overflow:auto}.terminal-fallback.visible{display:block}.terminal-fallback strong{color:#f8fafc}.terminal-fallback a{color:#38bdf8}</style></head><body><h1>🖥️ ${domainName} — ${difficulty}</h1><div class="card"><h2>Docker VM credentials</h2><div class="creds"><strong>Username:</strong> user &nbsp; <strong>Password:</strong> password123</div><p class="note" style="margin:.25rem 0 0">SSH: <code>${sshCmd}</code> &nbsp;·&nbsp; <a href="${webTerminalUrl}" target="_blank" rel="noopener">Open terminal in new tab</a></p></div><div class="terminal-wrap"><iframe id="vm-term" src="${iframeSrc}" title="Docker VM Web Terminal (ttyd)" referrerpolicy="no-referrer"></iframe><div id="fallback" class="terminal-fallback"><p><strong>“localhost didn’t send any data” / terminal not loading</strong></p><p>The VM container may not be running or the web terminal (ttyd) is not ready yet.</p><p><strong>Fix:</strong> From the project root run:</p><p><code>docker compose -f vms/docker-compose.vms.yml up -d</code></p><p>Wait ~30 seconds for containers to start, then <a href="javascript:location.reload()">refresh this page</a>.</p><p>Or try <a href="${webTerminalUrl}" target="_blank" rel="noopener">opening the terminal in a new tab</a> (${webTerminalUrl}).</p></div></div><p class="note">The terminal above is the <strong>Docker container VM</strong> (ttyd). If you see an error, start the VM containers (see above) then refresh.</p><script>(function(){var f=document.getElementById("fallback"),iframe=document.getElementById("vm-term"),t=setTimeout(function(){f.classList.add("visible");},8000);iframe.onload=function(){clearTimeout(t);};})();</script></body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.use("/api/vm", vmRoutes);

// Lab Routes - Lazy-loaded to reduce startup memory (24 lab modules)
const labRoutes = [
  ["/lab/theory", "./labs/theory"],
  ["/lab/xss-basic", "./labs/xss-basic"],
  ["/lab/xss-medium", "./labs/xss-medium"],
  ["/lab/xss-hard", "./labs/xss-hard"],
  ["/lab/sqli-basic", "./labs/sqli-basic"],
  ["/lab/sqli-medium", "./labs/sqli-medium"],
  ["/lab/sqli-hard", "./labs/sqli-hard"],
  ["/lab/csrf-basic", "./labs/csrf-basic"],
  ["/lab/csrf-medium", "./labs/csrf-medium"],
  ["/lab/csrf-hard", "./labs/csrf-hard"],
  ["/lab/idor-basic", "./labs/idor-basic"],
  ["/lab/idor-medium", "./labs/idor-medium"],
  ["/lab/idor-hard", "./labs/idor-hard"],
  ["/lab/file-upload-basic", "./labs/fileUpload-basic"],
  ["/lab/file-upload-medium", "./labs/fileUpload-medium"],
  ["/lab/file-upload-hard", "./labs/fileUpload-hard"],
  ["/lab/command-injection-basic", "./labs/commandInjection-basic"],
  ["/lab/command-injection-medium", "./labs/commandInjection-medium"],
  ["/lab/command-injection-hard", "./labs/commandInjection-hard"],
  ["/lab/auth-bypass-basic", "./labs/authBypass-basic"],
  ["/lab/auth-bypass-medium", "./labs/authBypass-medium"],
  ["/lab/auth-bypass-hard", "./labs/authBypass-hard"],
  ["/lab/forensics-basic", "./labs/forensics-basic"],
  ["/lab/forensics-medium", "./labs/forensics-medium"],
  ["/lab/forensics-hard", "./labs/forensics-hard"],
];
const labCache = {};
labRoutes.forEach(([path, mod]) => {
  app.use(path, (req, res, next) => {
    if (labCache[path]) return labCache[path](req, res, next);
    try {
      const router = require(mod);
      labCache[path] = router;
      router(req, res, next);
    } catch (err) {
      console.warn("Lab load failed:", path, err.message);
      res.status(503).send("Lab temporarily unavailable.");
    }
  });
});

// Redirect /lab/:challengeId to the configured labPath for that challenge
app.get("/lab/:challengeId", async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId).select("labPath");
    if (!challenge || !challenge.labPath) {
      return res.status(404).send("Lab not found for this challenge");
    }

    const labPath = challenge.labPath;
    const base = process.env.LAB_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
    const target =
      labPath.startsWith("http://") || labPath.startsWith("https://")
        ? labPath
        : `${base}${labPath.startsWith("/") ? "" : "/"}${labPath}`;

    return res.redirect(target);
  } catch (err) {
    console.error("Error resolving lab path:", err);
    return res.status(500).send("Server error resolving lab path");
  }
});

// VM Lab panel - served by backend so iframe never hits external localhost (avoids "refused to connect")
// Port mapping must match seed: ad, linux, pentest × easy, medium, hard
const VM_PORT_MAP = {
  ad: { easy: { web: 4260, ssh: 2221 }, medium: { web: 4270, ssh: 2222 }, hard: { web: 4280, ssh: 2223 } },
  linux: { easy: { web: 4200, ssh: 2220 }, medium: { web: 4210, ssh: 2230 }, hard: { web: 4220, ssh: 2240 } },
  pentest: { easy: { web: 4230, ssh: 2250 }, medium: { web: 4240, ssh: 2260 }, hard: { web: 4250, ssh: 2270 } },
};
const VM_NAMES = { ad: "Active Directory", linux: "Linux Privilege Escalation", pentest: "Pentest Lab" };

app.get("/vm-terminal", (req, res) => {
  const domain = (req.query.domain || "linux").toLowerCase();
  const difficulty = (req.query.difficulty || "easy").toLowerCase();
  const ports = VM_PORT_MAP[domain]?.[difficulty] || VM_PORT_MAP.linux.easy;
  const domainName = VM_NAMES[domain] || "VM Lab";
  const host = req.get("host") || "localhost";
  const protocol = req.protocol || "http";
  const baseUrl = `${protocol}://${host}`;
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
    body { margin: 0; font-family: system-ui, sans-serif; background: #1e293b; color: #e2e8f0; padding: 1.5rem; min-height: 100vh; }
    h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #f8fafc; }
    .card { background: #334155; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .card h2 { font-size: 0.9rem; margin: 0 0 0.5rem; color: #94a3b8; }
    code { background: #475569; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
    a { color: #38bdf8; }
    .creds { margin-top: 0.5rem; }
    .note { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>🖥️ ${domainName} — ${difficulty}</h1>
  <div class="card">
    <h2>SSH access</h2>
    <p><code>${sshCmd}</code></p>
    <div class="creds"><strong>Username:</strong> user &nbsp; <strong>Password:</strong> password123</div>
  </div>
  <div class="card">
    <h2>Web terminal (when VM is running)</h2>
    <p>If you have started the VM lab (e.g. via Docker), open: <a href="${webTerminalUrl}" target="_blank" rel="noopener">${webTerminalUrl}</a></p>
  </div>
  <p class="note">Solve the challenge in the VM, find the flag, and submit it in the answer box on the left.</p>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Test route
app.get("/", (req, res) => {
  res.send("CyberRangeX Backend is Running");
});

// Debug route to list all registered challenge routes
app.get("/debug/routes", (req, res) => {
  try {
    const routes = [];
    if (challengeRoutes && challengeRoutes.stack) {
      challengeRoutes.stack.forEach((middleware) => {
        if (middleware.route) {
          const methods = Object.keys(middleware.route.methods).join(", ").toUpperCase();
          routes.push({
            method: methods,
            path: `/api/challenges${middleware.route.path}`,
          });
        } else if (middleware.name === 'router') {
          // Handle nested routers
          middleware.handle.stack.forEach((nested) => {
            if (nested.route) {
              const methods = Object.keys(nested.route.methods).join(", ").toUpperCase();
              routes.push({
                method: methods,
                path: `/api/challenges${nested.route.path}`,
              });
            }
          });
        }
      });
    }
    res.json({ 
      routes, 
      totalRoutes: routes.length,
      message: "Available challenge routes",
      note: "If /domain/:domain is missing, the server needs to be restarted"
    });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack });
  }
});

// New endpoint to serve code files
app.get("/code", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ msg: "File path is required" });
  }

  const baseDir = path.resolve(__dirname, ".."); // Project root: cyberrangex/backend
  const allowedDirs = [
    path.join(baseDir, "lab"),
    path.join(baseDir, "test"),
    path.join(baseDir, "solution"),
    path.join(baseDir, "exploit"),
  ];

  const fullPath = path.resolve(baseDir, filePath);

  // Security check: ensure the resolved path is within one of the allowed directories
  const isPathAllowed = allowedDirs.some(dir => fullPath.startsWith(dir));

  if (!isPathAllowed) {
    console.warn(`Unauthorized file access attempt: ${filePath}`);
    return res.status(403).json({ msg: "Unauthorized file access" });
  }

  try {
    const codeContent = await fs.promises.readFile(fullPath, "utf8");
    res.send(codeContent);
  } catch (err) {
    console.error("Error reading code file:", err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Code file not found" });
    }
    res.status(500).json({ msg: "Server error reading code file" });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
attachVmTerminalWsProxy(server);
