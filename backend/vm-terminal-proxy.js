/**
 * Proxies VM terminal (ttyd) through the backend so the browser iframe
 * loads the terminal from the same origin instead of localhost (which
 * would point to the user's machine and fail when backend runs on server).
 */
const http = require("http");
const httpProxy = require("http-proxy");

// Host ports when backend runs on host (e.g. node server.js)
const VM_PORTS = {
  ad: { easy: 4260, medium: 4270, hard: 4280 },
  linux: { easy: 4200, medium: 4210, hard: 4220 },
  pentest: { easy: 4230, medium: 4240, hard: 4250 },
};
// Docker service names when backend runs in Docker (same compose network as vms)
const VM_SERVICES = {
  ad: { easy: "vm-ad-easy", medium: "vm-ad-medium", hard: "vm-ad-hard" },
  linux: { easy: "vm-linux-easy", medium: "vm-linux-medium", hard: "vm-linux-hard" },
  pentest: { easy: "vm-pentest-easy", medium: "vm-pentest-medium", hard: "vm-pentest-hard" },
};
const TTYD_PORT_IN_CONTAINER = 4200;

function getPort(domain, difficulty) {
  const d = (domain || "linux").toLowerCase();
  const diff = (difficulty || "easy").toLowerCase();
  return VM_PORTS[d]?.[diff] ?? VM_PORTS.linux.easy;
}

/** When running in Docker with vms, use service name and internal port 4200. Optionally use VM_TERMINAL_HOST (e.g. host.docker.internal) when backend is in Docker and VMs are on host. */
function getTargetHostPort(domain, difficulty) {
  const useDocker = process.env.VM_TERMINAL_DOCKER_NETWORK === "1" || process.env.VM_TERMINAL_DOCKER_NETWORK === "true";
  const explicitHost = process.env.VM_TERMINAL_HOST;
  const d = (domain || "linux").toLowerCase();
  const diff = (difficulty || "easy").toLowerCase();
  if (useDocker && VM_SERVICES[d]?.[diff]) {
    return { hostname: VM_SERVICES[d][diff], port: TTYD_PORT_IN_CONTAINER };
  }
  const port = getPort(domain, difficulty);
  if (explicitHost) {
    return { hostname: explicitHost.trim(), port };
  }
  return { hostname: "127.0.0.1", port };
}

/**
 * Parse /api/vm/terminal-frame/domain/difficulty/rest from path.
 * When mounted at /api/vm/terminal-frame, req.path is e.g. /ad/easy/ or /ad/easy/ws
 */
function parsePath(pathStr) {
  const pathMatch = (pathStr || "").match(/^\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!pathMatch) return null;
  const [, domain, difficulty, rest] = pathMatch;
  return { domain, difficulty, forwardPath: (rest && rest !== "/") ? rest : "/" };
}

/**
 * Express middleware: mount at /api/vm/terminal-frame
 * Path format: /api/vm/terminal-frame/:domain/:difficulty/*
 * For the root document we fetch and set a cookie so /ws upgrade can find the VM.
 */
const PROXY_TIMEOUT_MS = 15000;
const FALLBACK_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VM Terminal</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem;box-sizing:border-box}.box{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1.5rem;max-width:420px;text-align:center}.box h2{margin:0 0 .75rem;font-size:1.1rem}.box p{margin:.5rem 0;font-size:0.9rem;color:#94a3b8}.box code{background:#334155;padding:.2em .5em;border-radius:4px;font-size:0.85rem}.box a{color:#38bdf8}</style></head><body><div class="box"><h2>VM terminal not reachable</h2><p>The Docker VM container may not be running or the backend cannot reach it.</p><p>From the project root run:</p><p><code>docker compose -f vms/docker-compose.vms.yml up -d</code></p><p>If the backend runs in Docker, start with:</p><p><code>docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d</code></p><p>Wait ~30 seconds, then <a href="javascript:location.reload()">refresh this page</a>.</p></div></body></html>`;

function sendFallback(res) {
  if (res.headersSent) return;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(FALLBACK_HTML);
}

function vmTerminalFrameProxy(req, res, next) {
  const pathNorm = req.path.endsWith("/") ? req.path : req.path + "/";
  const parsed = parsePath(pathNorm) || parsePath(req.path);
  if (!parsed) return next();
  const { domain, difficulty, forwardPath } = parsed;
  const { hostname, port } = getTargetHostPort(domain, difficulty);
  const target = `http://${hostname}:${port}`;

  // For root document, fetch from ttyd and set cookie so absolute /ws can be routed
  if (forwardPath === "/" || forwardPath === "") {
    function tryConnect(host, portNum) {
      const opts = { hostname: host, port: portNum, path: "/", method: req.method, headers: { ...req.headers, host: `${host}:${portNum}` } };
      const proxyReq = http.request(opts, (proxyRes) => {
        res.setHeader("Set-Cookie", `vm-terminal=${domain}:${difficulty}; Path=/; SameSite=Lax; Max-Age=3600`);
        Object.keys(proxyRes.headers).forEach((k) => {
          const lower = k.toLowerCase();
          if (lower === "transfer-encoding") return;
          if (lower === "x-frame-options" || lower === "content-security-policy") return;
          res.setHeader(k, proxyRes.headers[k]);
        });
        res.status(proxyRes.statusCode);
        proxyRes.pipe(res);
      });
      proxyReq.setTimeout(PROXY_TIMEOUT_MS, function () {
        proxyReq.destroy();
      });
      proxyReq.on("error", (err) => {
        console.warn("[VM terminal proxy] Connection failed to " + host + ":" + portNum + " -", err.code || err.message);
        if (!res.headersSent && process.env.VM_TERMINAL_DOCKER_NETWORK && host !== "host.docker.internal") {
          const hostPort = getPort(domain, difficulty);
          tryConnect("host.docker.internal", hostPort);
        } else {
          sendFallback(res);
        }
      });
      req.pipe(proxyReq);
    }
    tryConnect(hostname, port);
    return;
  }

  const proxy = httpProxy.createProxyServer({ target, ws: true });
  proxy.on("proxyRes", (proxyRes) => {
    delete proxyRes.headers["x-frame-options"];
    delete proxyRes.headers["content-security-policy"];
  });
  proxy.on("error", (err, req, res) => {
    console.warn("[VM terminal proxy] Proxy error -", err.code || err.message);
    sendFallback(res);
  });
  req.url = forwardPath;
  proxy.web(req, res, { target });
}

/**
 * Attach WebSocket upgrade handler so ttyd's /ws works through the proxy.
 * Handles both /api/vm/terminal-frame/domain/difficulty/ws and /ws (with cookie).
 */
function attachVmTerminalWsProxy(server) {
  const prefix = "/api/vm/terminal-frame/";
  server.on("upgrade", (req, socket, head) => {
    const url = (req.url || "").split("?")[0];
    let domain, difficulty, forwardPath;

    if (url.startsWith(prefix)) {
      const pathPart = url.slice(prefix.length);
      const parsed = parsePath("/" + pathPart.replace(/^\//, ""));
      if (!parsed) return;
      ({ domain, difficulty, forwardPath } = parsed);
    } else if (url === "/ws" && req.headers.cookie) {
      const match = req.headers.cookie.match(/vm-terminal=([^;]+)/);
      if (!match) return;
      const [d, diff] = match[1].split(":");
      if (!d || !diff) return;
      domain = d;
      difficulty = diff;
      forwardPath = "/ws";
    } else {
      return;
    }

    const { hostname, port } = getTargetHostPort(domain, difficulty);
    const target = `http://${hostname}:${port}`;
    const proxy = httpProxy.createProxyServer({ target, ws: true });
    proxy.on("error", () => socket.destroy());
    req.url = forwardPath;
    proxy.ws(req, socket, head);
  });
}

/** Serve the terminal frame root (for explicit GET route). Tries configured target first, then host.docker.internal when in Docker. */
function serveTerminalFrameRoot(domain, difficulty, req, res) {
  const first = getTargetHostPort(domain, difficulty);
  const hostPort = getPort(domain, difficulty);
  res.setHeader("Set-Cookie", `vm-terminal=${domain}:${difficulty}; Path=/; SameSite=Lax; Max-Age=3600`);
  const likelyDocker = (process.env.MONGO_URI || "").includes("mongo:");

  function tryFetch(hostname, port, triedDockerHost) {
    const opts = { hostname, port, path: "/", method: "GET", headers: { ...req.headers, host: `${hostname}:${port}` } };
    const proxyReq = http.request(opts, (proxyRes) => {
      Object.keys(proxyRes.headers).forEach((k) => {
        const lower = k.toLowerCase();
        if (lower === "transfer-encoding") return;
        if (lower === "x-frame-options" || lower === "content-security-policy") return;
        res.setHeader(k, proxyRes.headers[k]);
      });
      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });
    proxyReq.setTimeout(PROXY_TIMEOUT_MS, () => proxyReq.destroy());
    proxyReq.on("error", (err) => {
      console.warn("[VM terminal proxy] Connection failed to " + hostname + ":" + port + " -", err.code || err.message);
      if (!res.headersSent && likelyDocker && !triedDockerHost) {
        tryFetch("host.docker.internal", hostPort, true);
      } else {
        sendFallback(res);
      }
    });
    proxyReq.end();
  }

  tryFetch(first.hostname, first.port, false);
}

module.exports = { vmTerminalFrameProxy, attachVmTerminalWsProxy, getPort, getTargetHostPort, parsePath, serveTerminalFrameRoot };
