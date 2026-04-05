/**
 * Returns HTML for the VM lab terminal page.
 * Query params: domain (ad|linux|pentest), difficulty (easy|medium|hard)
 * Port mapping matches seedCTFChallenges.js:
 *   Linux:  easy 4200/2220, medium 4210/2230, hard 4220/2240
 *   AD:     easy 4260/2221, medium 4270/2222, hard 4280/2223
 *   Pentest: easy 4230/2250, medium 4240/2260, hard 4250/2270
 */
function getPorts(domain, difficulty) {
  const map = {
    linux:  { easy: { web: 4200, ssh: 2220 }, medium: { web: 4210, ssh: 2230 }, hard: { web: 4220, ssh: 2240 } },
    ad:     { easy: { web: 4260, ssh: 2221 }, medium: { web: 4270, ssh: 2222 }, hard: { web: 4280, ssh: 2223 } },
    pentest:{ easy: { web: 4230, ssh: 2250 }, medium: { web: 4240, ssh: 2260 }, hard: { web: 4250, ssh: 2270 } },
  };
  const d = map[domain] && map[domain][difficulty];
  return d || { web: 4200, ssh: 2220 };
}

function getDomainLabel(domain) {
  const labels = { ad: "Active Directory", linux: "Linux Privilege Escalation", pentest: "VM Lab" };
  return labels[domain] || domain;
}

function buildHtml(domain, difficulty, wsUrl) {
  const ports = getPorts(domain, difficulty);
  const label = getDomainLabel(domain);
  const sshCommand = `ssh user@localhost -p ${ports.ssh}`;
  const webTerminalUrl = `http://localhost:${ports.web}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VM Lab - ${label} (${difficulty})</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3/css/xterm.css" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #1e1e1e; color: #d4d4d4; padding: 12px; }
    h1 { font-size: 1.1rem; margin: 0 0 10px 0; color: #4ec9b0; }
    .info { background: #252526; padding: 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
    .info code { background: #3c3c3c; padding: 2px 6px; border-radius: 4px; }
    .info p { margin: 6px 0; }
    #terminal-container { width: 100%; height: 320px; background: #0c0c0c; border-radius: 6px; overflow: hidden; }
    .xterm { padding: 8px; }
    .fallback { padding: 12px; color: #858585; font-size: 13px; }
    a { color: #569cd6; }
  </style>
</head>
<body>
  <h1>🖥️ VM Lab – ${label} (${difficulty})</h1>
  <div class="info">
    <p><strong>Credentials:</strong> <code>user</code> / <code>password123</code></p>
    <p><strong>SSH:</strong> <code>${sshCommand}</code></p>
    <p><strong>Web terminal (if running):</strong> <a href="${webTerminalUrl}" target="_blank" rel="noopener">${webTerminalUrl}</a></p>
    <p>Use the in-browser terminal below, or run Docker Compose (see VM_SETUP.md) and open the web terminal link.</p>
  </div>
  <div id="terminal-container">
    <div id="terminal"></div>
    <div id="fallback" class="fallback" style="display:none;">In-browser terminal unavailable. Use SSH or the web terminal link above.</div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3/lib/xterm.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
  <script>
    (function() {
      var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      var wsUrl = protocol + '//' + location.host + '/vm-ws';
      var terminalContainer = document.getElementById('terminal');
      var fallbackEl = document.getElementById('fallback');
      var term = new Terminal({ theme: { background: '#0c0c0c', foreground: '#d4d4d4' }, cursorStyle: 'bar', fontSize: 14 });
      try {
        var fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
      } catch (e) {}
      term.open(terminalContainer);
      try { fitAddon && fitAddon.fit(); } catch (e) {}
      var ws = new WebSocket(wsUrl);
      ws.onopen = function() {
        term.writeln('\\r\\nConnected to VM lab terminal. Type your commands below.\\r\\n');
        term.onData(function(data) { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
      };
      ws.onmessage = function(ev) {
        if (typeof ev.data === 'string') term.write(ev.data);
        else term.write(new TextDecoder().decode(ev.data));
      };
      ws.onerror = function() {
        terminalContainer.style.display = 'none';
        fallbackEl.style.display = 'block';
      };
      ws.onclose = function() {
        term.writeln('\\r\\nConnection closed. Use SSH or the web terminal link above.');
      };
    })();
  </script>
</body>
</html>`;
}

module.exports = { getPorts, getDomainLabel, buildHtml };
