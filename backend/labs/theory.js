const express = require("express");
const Challenge = require("../models/Challenge");
const { generateVerificationToken } = require("../utils/challengeVerification");
const { buildLab, proofToken } = require("./theoryScenarios");
const { buildTheoryRootOverride, escapeHtml: escHtml } = require("./labTheme");

const router = express.Router();

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function labPublicFrom(lab, challengeId, userId, meta) {
  return {
    challengeId,
    userId,
    title: meta.title,
    category: meta.category,
    difficulty: meta.difficulty,
    labKind: lab.labKind,
    encodeKind: lab.encodeKind || null,
    type: lab.type,
    instruction: lab.instruction,
    puzzle: lab.puzzle,
    placeholder: lab.placeholder,
    vfs: lab.vfs,
    objectives: lab.objectives,
    checklist: lab.checklist || [],
    verifyHint:
      "Complete all checklist steps, then paste the SUBMISSION_CODE value from your evidence files (lowercase, no spaces).",
  };
}

router.post("/verify", express.json(), async (req, res) => {
  try {
    const challengeId = (req.body && req.body.challengeId) || "";
    const userId = (req.body && req.body.userId) || "";
    const submission = ((req.body && req.body.submission) || "").trim();

    if (!challengeId) {
      return res.status(400).json({ ok: false, msg: "Missing challengeId" });
    }
    if (!submission) {
      return res.status(400).json({ ok: false, msg: "Enter your lab result before verifying." });
    }

    const challenge = await Challenge.findById(challengeId).select(
      "_id title domain category difficulty correctAnswer"
    );
    if (!challenge) {
      return res.status(404).json({ ok: false, msg: "Challenge not found" });
    }

    const expected = proofToken(challenge);
    const solved = norm(submission) === norm(expected);
    if (!solved) {
      return res.json({ ok: false, msg: "Incorrect for this live lab task. Re-check evidence in the workspace." });
    }

    const verificationToken = userId ? generateVerificationToken(userId, challengeId) : "";
    return res.json({ ok: true, verificationToken, msg: "Lab objective complete." });
  } catch (err) {
    console.error("Theory lab verify error:", err);
    res.status(500).json({ ok: false, msg: "Verification unavailable." });
  }
});

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";

    if (!challengeId) {
      return res.status(400).send("Missing challengeId");
    }

    const challenge = await Challenge.findById(challengeId).select(
      "title domain category difficulty description hints _id correctAnswer"
    );
    if (!challenge) {
      return res.status(404).send("Challenge not found");
    }

    const lab = buildLab(challenge);
    const spec = labPublicFrom(lab, challengeId, userId, {
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
    });
    const specJson = JSON.stringify(spec).replace(/</g, "\\u003c");
    const themeOverride = buildTheoryRootOverride(challengeId, challenge);

    const safeDescription = String(challenge.description || "").replace(/</g, "&lt;");
    const hints = Array.isArray(challenge.hints) ? challenge.hints : [];
    const hintsHtml = hints.length
      ? `<ul class="hints">${hints.map((h) => `<li>${String(h).replace(/</g, "&lt;")}</li>`).join("")}</ul>`
      : "<p class=\"muted\">No hints for this challenge.</p>";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <title>Live Lab — ${String(challenge.title || "").replace(/</g, "")}</title>
  <style>
    :root {
      --bg: #070b12;
      --panel: #0f1629;
      --border: #1e3a5f;
      --text: #e8f0ff;
      --muted: #8ba3c4;
      --accent: #22d3ee;
      --ok: #34d399;
      --err: #f87171;
      --amber: #fbbf24;
      --font: "JetBrains Mono", "Fira Code", "Consolas", monospace;
      --font-ui: system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: var(--font-ui); background: var(--bg); color: var(--text);
      min-height: 100vh; font-size: 14px;
    }
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: linear-gradient(90deg, #0a1628, #0d2137);
      border-bottom: 1px solid var(--border);
    }
    .brand { font-weight: 700; letter-spacing: 0.04em; font-size: 12px; color: var(--accent); }
    .live {
      display: inline-flex; align-items: center; gap: 8px; font-size: 11px; text-transform: uppercase;
      color: var(--ok); font-weight: 600;
    }
    .live::before {
      content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--ok);
      box-shadow: 0 0 10px var(--ok); animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse { 50% { opacity: 0.35; } }
    .clock { font-family: var(--font); color: var(--muted); font-size: 12px; }
    .layout {
      display: grid; grid-template-columns: 260px 1fr 300px; grid-template-rows: 1fr auto;
      height: calc(100vh - 48px); gap: 0;
    }
    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto auto; height: auto; min-height: calc(100vh - 48px); }
    }
    .sidebar {
      border-right: 1px solid var(--border); background: var(--panel); padding: 14px; overflow: auto;
    }
    @media (max-width: 1024px) { .sidebar { border-right: none; border-bottom: 1px solid var(--border); max-height: 220px; } }
    .sidebar h2 { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.08em; }
    .obj { margin: 0; padding-left: 18px; color: var(--text); font-size: 13px; line-height: 1.45; }
    .obj li { margin-bottom: 8px; }
    .main { display: flex; flex-direction: column; min-height: 0; background: #0a0f18; }
    .tabs {
      display: flex; gap: 0; border-bottom: 1px solid var(--border); background: var(--panel);
    }
    .tab {
      padding: 10px 18px; cursor: pointer; border: none; background: transparent; color: var(--muted);
      font-family: var(--font-ui); font-size: 13px; border-bottom: 2px solid transparent;
    }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
    .panel { flex: 1; overflow: auto; padding: 14px; display: none; }
    .panel.active { display: block; }
    .brief h3 { margin: 0 0 8px; font-size: 15px; }
    .brief p.desc { color: var(--muted); line-height: 1.5; margin: 0 0 12px; }
    .terminal-wrap {
      background: #020617; border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
      font-family: var(--font); font-size: 13px; min-height: 280px; display: flex; flex-direction: column;
    }
    .term-header {
      background: #0f172a; padding: 6px 10px; font-size: 11px; color: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    .term-body { flex: 1; padding: 10px; overflow: auto; white-space: pre-wrap; word-break: break-all; color: #a5f3fc; }
    .term-line { margin: 2px 0; }
    .term-prompt { color: var(--amber); }
    .term-input-row { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: #020617; border-top: 1px solid var(--border); }
    .term-input-row input {
      flex: 1; background: transparent; border: none; color: #e2e8f0; font-family: var(--font); font-size: 13px; outline: none;
    }
    .tools { padding: 8px 0; }
    .tools label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
    .tools textarea, .tools input[type="text"] {
      width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border);
      background: #020617; color: var(--text); font-family: var(--font); font-size: 12px; min-height: 80px;
    }
    .tools .row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
    button.action {
      padding: 8px 14px; border-radius: 6px; border: 1px solid var(--border); background: #1e3a5f;
      color: var(--text); cursor: pointer; font-size: 12px;
    }
    button.action:hover { background: #2563eb; border-color: #3b82f6; }
    .tool-out {
      margin-top: 10px; padding: 10px; background: #020617; border: 1px solid var(--border); border-radius: 6px;
      font-family: var(--font); font-size: 12px; white-space: pre-wrap; word-break: break-all; min-height: 60px; color: #86efac;
    }
    .subnet-grid { display: grid; gap: 10px; }
    .subnet-grid input { min-height: 40px; }
    .rightbar {
      border-left: 1px solid var(--border); background: var(--panel); padding: 14px; overflow: auto;
    }
    @media (max-width: 1024px) { .rightbar { border-left: none; border-top: 1px solid var(--border); } }
    .rightbar h2 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: var(--muted); }
    .puzzle-box {
      font-family: var(--font); font-size: 11px; background: #020617; padding: 10px; border-radius: 6px;
      border: 1px solid var(--border); color: #cbd5e1; word-break: break-all;
    }
    .dock {
      grid-column: 1 / -1; border-top: 1px solid var(--border); background: #0a1628; padding: 12px 16px;
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
    }
    .dock input[type="text"] {
      flex: 1; min-width: 200px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border);
      background: #020617; color: var(--text); font-family: var(--font);
    }
    button.verify {
      padding: 10px 20px; border: none; border-radius: 6px; background: var(--accent); color: #042f2e;
      font-weight: 700; cursor: pointer; font-size: 13px;
    }
    button.verify:hover { filter: brightness(1.08); }
    .msg { font-size: 13px; width: 100%; }
    .msg.ok { color: var(--ok); }
    .msg.err { color: var(--err); }
    .hints { margin: 10px 0 0; padding-left: 18px; color: var(--muted); font-size: 13px; }
    .muted { color: var(--muted); }
    .checklist-box { list-style: none; margin: 0; padding: 0; }
    .check-row { font-size: 12px; padding: 6px 8px; margin-bottom: 6px; border-radius: 6px; background: #020617; border: 1px solid var(--border); color: var(--muted); }
    .check-row.done { border-color: var(--ok); color: var(--ok); }
    button.verify:disabled { opacity: 0.45; cursor: not-allowed; filter: none; }
    .verify-hint { font-size: 11px; color: var(--amber); max-width: 520px; line-height: 1.4; }
  </style>
  <style id="per-challenge-theory-skin">
    ${themeOverride}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">CYBERRANGE X · ${escHtml(challenge.title || "Theory lab")}</div>
    <div class="live">Live session</div>
    <div class="clock" id="clock"></div>
  </div>
  <div class="layout">
    <aside class="sidebar">
      <h2>Workplace checklist</h2>
      <p class="muted" style="font-size:11px;margin:0 0 8px">Run each terminal action below (exact paths). Verify stays locked until done.</p>
      <ul class="checklist-box" id="checklist"></ul>
      <h2 style="margin-top:16px">Mission objectives</h2>
      <ol class="obj" id="objectives"></ol>
      <h2 style="margin-top:16px">Course hints</h2>
      ${hintsHtml}
    </aside>
    <section class="main">
      <div class="tabs">
        <button type="button" class="tab active" data-tab="brief">Brief</button>
        <button type="button" class="tab" data-tab="terminal">Terminal</button>
        <button type="button" class="tab" data-tab="tools">Tools</button>
      </div>
      <div class="panel brief active" id="panel-brief">
        <h3 id="brief-title"></h3>
        <p class="desc" id="brief-type"></p>
        <p class="desc" id="brief-inst"></p>
        <p class="muted" id="brief-meta"></p>
        <h3 style="margin-top:16px;font-size:13px">Description</h3>
        <p class="desc">${safeDescription}</p>
      </div>
      <div class="panel" id="panel-terminal">
        <div class="terminal-wrap">
          <div class="term-header">lab@workstation:~ — bash 5.2 · isolated sandbox</div>
          <div class="term-body" id="term-out"></div>
          <div class="term-input-row">
            <span class="term-prompt">$</span>
            <input type="text" id="term-in" autocomplete="off" spellcheck="false" placeholder="help · ls · cat path/to/file · grep needle file · head -n 5 file" />
          </div>
        </div>
      </div>
      <div class="panel" id="panel-tools">
        <div id="tools-crypto" class="tools" style="display:none">
          <label>Ciphertext / hex or base64</label>
          <textarea id="tool-crypto-in" placeholder="Paste from cipher.blob..."></textarea>
          <div class="row">
            <button type="button" class="action" id="dec-hex">Decode HEX → text</button>
            <button type="button" class="action" id="dec-b64">Decode Base64 → text</button>
          </div>
          <div class="tool-out" id="tool-crypto-out">Output appears here.</div>
        </div>
        <div id="tools-forensics" class="tools" style="display:none">
          <label>Log line (reference)</label>
          <div class="puzzle-box" id="tool-log-preview"></div>
          <p class="muted" style="margin-top:10px">Tip: in a real SOC you would pivot from src= — practice the same here.</p>
        </div>
        <div id="tools-network" class="tools" style="display:none">
          <div class="subnet-grid">
            <label>CIDR prefix length (e.g. 24)</label>
            <input type="number" id="tool-prefix" min="0" max="32" value="24" />
            <button type="button" class="action" id="calc-hosts">Calculate usable hosts</button>
            <div class="tool-out" id="tool-net-out">Usable = 2^(32−prefix) − 2 (for unicast IPv4 subnets).</div>
          </div>
        </div>
        <div id="tools-systems" class="tools" style="display:none">
          <p class="muted">Review engineering artifacts in the terminal. Lab verification uses <strong>SUBMISSION_CODE</strong> from the signoff file, not the vulnerability label alone.</p>
        </div>
        <div id="tools-digital" class="tools" style="display:none">
          <p class="muted">Treat this like a real handoff: read each path from the checklist, then paste <strong>SUBMISSION_CODE</strong> from the designated signoff file.</p>
        </div>
        <div id="tools-workspace" class="tools" style="display:none">
          <p class="muted">Use <code>grep needle file</code> or <code>head -n 5 file</code> when logs are long. Token is always the <strong>SUBMISSION_CODE</strong> value.</p>
        </div>
      </div>
    </section>
    <aside class="rightbar">
      <h2>Case summary</h2>
      <div class="puzzle-box" id="artifact"></div>
      <p class="muted" style="margin-top:12px;font-size:12px">Open real files in the terminal. The answer for verify is the closeout token, not a guess from this summary alone.</p>
    </aside>
    <div class="dock">
      <span class="muted" style="font-size:12px">Closeout token →</span>
      <input type="text" id="submission" placeholder="" />
      <button type="button" class="verify" id="btn-verify" disabled>Verify lab completion</button>
      <p class="verify-hint" id="verify-hint"></p>
      <div class="msg" id="verify-msg"></div>
    </div>
  </div>
  <script type="application/json" id="lab-spec">${specJson}</script>
  <script>
(function () {
  var spec = JSON.parse(document.getElementById("lab-spec").textContent);
  var vfs = spec.vfs || {};
  var termOut = document.getElementById("term-out");
  var termIn = document.getElementById("term-in");
  var submission = document.getElementById("submission");
  submission.placeholder = spec.placeholder || "SUBMISSION_CODE";
  document.getElementById("verify-hint").textContent = spec.verifyHint || "";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function logTerm(html) {
    var d = document.createElement("div");
    d.className = "term-line";
    d.innerHTML = html;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
  }

  var checklistState = {};
  (spec.checklist || []).forEach(function (c) { checklistState[c.id] = false; });

  function renderChecklist() {
    var el = document.getElementById("checklist");
    el.innerHTML = "";
    (spec.checklist || []).forEach(function (c) {
      var li = document.createElement("li");
      li.className = "check-row" + (checklistState[c.id] ? " done" : "");
      li.textContent = (checklistState[c.id] ? "Done · " : "Todo · ") + c.label;
      el.appendChild(li);
    });
    var cl = spec.checklist || [];
    var all = cl.length === 0 || cl.every(function (c) { return checklistState[c.id]; });
    var btn = document.getElementById("btn-verify");
    btn.disabled = !all;
    btn.title = all ? "Submit SUBMISSION_CODE from evidence" : "Complete every checklist command first";
  }

  function tryChecklist(line) {
    var t = line.trim();
    (spec.checklist || []).forEach(function (c) {
      try {
        if (new RegExp(c.pattern).test(t)) checklistState[c.id] = true;
      } catch (e1) {}
    });
    renderChecklist();
  }

  function printHelp() {
    logTerm('<span class="term-prompt">Shell:</span> help · ls · cat &lt;path&gt; · grep &lt;needle&gt; &lt;file&gt; · head [-n N] &lt;file&gt; · clear · pwd · whoami · mission');
  }

  document.getElementById("brief-title").textContent = spec.title || "Challenge";
  document.getElementById("brief-type").textContent = spec.type || "";
  document.getElementById("brief-inst").textContent = spec.instruction || "";
  document.getElementById("brief-meta").textContent = (spec.category || "") + " · " + (spec.difficulty || "");

  var objEl = document.getElementById("objectives");
  (spec.objectives || []).forEach(function (t) {
    var li = document.createElement("li");
    li.textContent = t;
    objEl.appendChild(li);
  });

  document.getElementById("artifact").textContent = String(spec.puzzle || "");

  var kind = spec.labKind || "governance";
  document.getElementById("tools-crypto").style.display = kind === "crypto" ? "block" : "none";
  document.getElementById("tools-forensics").style.display = kind === "forensics" ? "block" : "none";
  document.getElementById("tools-network").style.display = kind === "network" ? "block" : "none";
  document.getElementById("tools-systems").style.display = kind === "systems" ? "block" : "none";
  document.getElementById("tools-digital").style.display = kind === "digital" || kind === "governance" ? "block" : "none";
  document.getElementById("tools-workspace").style.display =
    kind === "forensics" || kind === "systems" || kind === "digital" || kind === "governance" ? "block" : "none";

  if (kind === "forensics") {
    document.getElementById("tool-log-preview").textContent = String(spec.puzzle || "");
  }

  renderChecklist();
  logTerm("Welcome to the <strong>workplace lab</strong>. Challenge <code>" + (spec.challengeId || "") + "</code>. Complete the checklist — verify unlocks after.");
  printHelp();

  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.remove("active"); });
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
      btn.classList.add("active");
      var id = "panel-" + btn.getAttribute("data-tab");
      var p = document.getElementById(id);
      if (p) p.classList.add("active");
    });
  });

  function runCmd(line) {
    var raw = (line || "").trim();
    if (!raw) return;
    logTerm('<span class="term-prompt">$</span> ' + escapeHtml(raw));
    var parts = raw.split(/\\s+/);
    var cmd = parts[0].toLowerCase();

    if (cmd === "help") printHelp();
    else if (cmd === "clear") termOut.innerHTML = "";
    else if (cmd === "pwd") { logTerm("/home/lab"); tryChecklist(raw); }
    else if (cmd === "whoami") { logTerm("lab-analyst"); tryChecklist(raw); }
    else if (cmd === "mission") { logTerm(escapeHtml(spec.instruction || "")); tryChecklist(raw); }
    else if (cmd === "ls") {
      var names = Object.keys(vfs);
      logTerm(names.length ? names.join("  ") : "(empty)");
      tryChecklist(raw);
    } else if (cmd === "cat") {
      var arg = parts.slice(1).join(" ");
      if (!arg) logTerm("cat: missing operand");
      else if (vfs[arg] !== undefined) logTerm(escapeHtml(String(vfs[arg])));
      else logTerm("cat: " + escapeHtml(arg) + ": No such file");
      tryChecklist(raw);
    } else if (cmd === "grep") {
      var needle = parts[1];
      var file = parts.slice(2).join(" ");
      if (!needle || !file) logTerm("usage: grep &lt;substring&gt; &lt;file&gt;");
      else if (vfs[file] === undefined) logTerm("grep: " + escapeHtml(file) + ": No such file");
      else {
        var content = String(vfs[file]);
        var lines = content.split("\\n");
        var hit = lines.filter(function (ln) { return ln.indexOf(needle) >= 0; });
        logTerm(escapeHtml(hit.length ? hit.join("\\n") : "(no matches)"));
      }
      tryChecklist(raw);
    } else if (cmd === "head") {
      var n = 10;
      var fileStart = 1;
      if (parts[1] === "-n" && parts.length >= 4) {
        n = parseInt(parts[2], 10) || 10;
        fileStart = 3;
      } else if (parts.length >= 2) {
        fileStart = 1;
      }
      var file = parts.slice(fileStart).join(" ");
      if (!file) logTerm("usage: head [-n N] &lt;file&gt;");
      else if (vfs[file] === undefined) logTerm("head: " + escapeHtml(file) + ": No such file");
      else {
        var allL = String(vfs[file]).split("\\n");
        logTerm(escapeHtml(allL.slice(0, n).join("\\n")));
      }
      tryChecklist(raw);
    } else {
      logTerm("command not found: " + escapeHtml(cmd) + " — type <code>help</code>");
      tryChecklist(raw);
    }
  }

  termIn.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      runCmd(termIn.value);
      termIn.value = "";
    }
  });

  function decodeHex(str) {
    str = String(str).replace(/\\s/g, "");
    if (str.length % 2) throw new Error("Odd hex length");
    var out = "";
    for (var i = 0; i < str.length; i += 2) {
      out += String.fromCharCode(parseInt(str.substr(i, 2), 16));
    }
    return out;
  }

  document.getElementById("dec-hex").onclick = function () {
    var el = document.getElementById("tool-crypto-in");
    var out = document.getElementById("tool-crypto-out");
    try {
      out.textContent = decodeHex(el.value.trim());
    } catch (err) {
      out.textContent = "Error: " + err.message;
    }
  };
  document.getElementById("dec-b64").onclick = function () {
    var el = document.getElementById("tool-crypto-in");
    var out = document.getElementById("tool-crypto-out");
    try {
      out.textContent = decodeURIComponent(escape(atob(el.value.trim().replace(/\\s/g, ""))));
    } catch (err) {
      out.textContent = "Error: invalid base64";
    }
  };

  document.getElementById("calc-hosts").onclick = function () {
    var p = parseInt(document.getElementById("tool-prefix").value, 10);
    var out = document.getElementById("tool-net-out");
    if (isNaN(p) || p < 0 || p > 32) {
      out.textContent = "Enter prefix 0–32";
      return;
    }
    if (p >= 31) {
      out.textContent = "For /" + p + " usable hosts are often 0 in classic counting — re-read your task network.";
      return;
    }
    var usable = Math.pow(2, 32 - p) - 2;
    out.textContent = "Prefix /" + p + " → usable host addresses (subtract network + broadcast): " + usable;
  };

  function postReady(token) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "LAB_READY",
        challengeId: spec.challengeId,
        verificationToken: token
      }, "*");
    }
  }

  document.getElementById("btn-verify").onclick = function () {
    var msg = document.getElementById("verify-msg");
    msg.textContent = "";
    msg.className = "msg";
    var sub = submission.value.trim();
    if (!sub) {
      msg.className = "msg err";
      msg.textContent = "Enter the result of your lab work.";
      return;
    }
    fetch("/lab/theory/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId: spec.challengeId,
        userId: spec.userId,
        submission: sub
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok && data.verificationToken) {
          msg.className = "msg ok";
          msg.textContent = data.msg + " Use the parent window to submit your flag.";
          postReady(data.verificationToken);
        } else {
          msg.className = "msg err";
          msg.textContent = data.msg || "Verification failed.";
        }
      })
      .catch(function () {
        msg.className = "msg err";
        msg.textContent = "Network error calling verify endpoint.";
      });
  };

  setInterval(function () {
    document.getElementById("clock").textContent = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  }, 1000);
  document.getElementById("clock").textContent = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
})();
  </script>
</body>
</html>`);
  } catch (err) {
    console.error("Theory lab error:", err);
    res.status(500).send("Theory lab unavailable.");
  }
});

module.exports = router;
