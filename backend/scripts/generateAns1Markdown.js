/**
 * Writes ../ans1.md — procedural solve steps for all seeded challenges.
 * Does not print correctAnswer / FLAG{...} strings.
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { generateChallenges } = require("./seedCTFChallenges");
const { buildLab } = require("../labs/theoryScenarios");

/** Same order as `WEB_LAB_PATHS` / `webRows` in seedCTFChallenges.js */
const WEB_LAB_PATHS = [
  "/lab/xss-basic",
  "/lab/sqli-basic",
  "/lab/csrf-basic",
  "/lab/idor-basic",
  "/lab/file-upload-basic",
  "/lab/command-injection-basic",
  "/lab/xss-medium",
  "/lab/sqli-medium",
  "/lab/csrf-medium",
  "/lab/idor-medium",
  "/lab/file-upload-medium",
  "/lab/command-injection-medium",
  "/lab/auth-bypass-medium",
  "/lab/xss-hard",
  "/lab/sqli-hard",
  "/lab/csrf-hard",
  "/lab/idor-hard",
  "/lab/file-upload-hard",
  "/lab/command-injection-hard",
];

const WEB_TITLES_FOR_PATH = [
  "Reflected XSS Basics",
  "SQL Injection Login Bypass",
  "Basic CSRF Attack",
  "IDOR in User Profiles",
  "Unrestricted File Upload",
  "Command Injection Basics",
  "Open Redirect and URL Validation",
  "Stored XSS Exploitation",
  "UNION-Based SQL Injection",
  "Advanced CSRF with Token Bypass",
  "IDOR in API Endpoints",
  "File Upload with Filter Bypass",
  "Command Injection with Encoding",
  "JWT Token Manipulation",
  "DOM-Based XSS with Filter Bypass",
  "Blind SQL Injection",
  "CSRF with SameSite Bypass",
  "Complex IDOR Chain",
  "Polyglot File Upload",
  "Advanced Command Injection",
];

function syntheticChallengeId(seedIndex) {
  const b = Buffer.alloc(12);
  b.writeUInt32BE(seedIndex + 1, 0);
  b.writeUInt32BE(0x50414c4d, 4);
  b.writeUInt32BE(0x45544152, 8);
  return new mongoose.Types.ObjectId(b);
}

const VM_TOPIC_STEPS = {
  "Linux DAC: chmod, umask, and ownership": [
    "Review `ls -l`, ownership, and permission bits; relate to the DAC challenge text.",
    "Use `umask` and `chmod` as the scenario implies (read-only VM may still let you reason through commands).",
  ],
  "SUID Binary Exploitation": [
    "Run: `find / -perm -4000 2>/dev/null` and inspect interesting binaries (GTFOBins mindset).",
  ],
  "Sudo Misconfiguration": [
    "Run: `sudo -l` and look for commands you may run as root without a password or with wildcards.",
  ],
  "Cron Job Exploitation": [
    "Inspect `crontab -l`, `/etc/crontab`, and `/etc/cron.*` for writable scripts or PATH issues.",
  ],
  "Environment Variable Abuse": [
    "Check for `LD_PRELOAD`, `PATH`, or other env-based escalation paths hinted in the VM.",
  ],
  "Writable /etc/passwd": [
    "If misconfigured, you may add a user line with a known password hash (lab-only technique).",
  ],
  "Basic Kernel Exploit": [
    "Gather `uname -a`; match to known misconfiguration only in authorized lab context.",
  ],
  "SUDO NOPASSWD": [
    "From `sudo -l`, abuse allowed editors, interpreters, or wildcards to get a root shell.",
  ],
  "Advanced SUID Exploitation": [
    "Chain or abuse less obvious SUID helpers with strace/ltrace-style reasoning.",
  ],
  "Sudo Command Injection": [
    "Look for sudo rules that pass user input into a shell.",
  ],
  "Cron Job Path Injection": [
    "If cron runs scripts without absolute paths, hijack PATH or replace targets.",
  ],
  "LD_PRELOAD Exploitation": [
    "Find a root-owned program that respects `LD_PRELOAD` and inject a shared object.",
  ],
  "Kernel Module Exploitation": [
    "Rare in modern systems; follow any lab-specific weak module load path.",
  ],
  "Capabilities Abuse": [
    "Run: `getcap -r / 2>/dev/null` and research capabilities that grant root-equivalent actions.",
  ],
  "Advanced Kernel Exploitation": [
    "Combine information leaks with kernel bug patterns only where the lab explicitly supports it.",
  ],
  "Complex SUID Chain": [
    "Enumerate multiple SUID steps that write toward root access.",
  ],
  "Sudo Buffer Overflow": [
    "Historic CVE-style thinking; patch level matters — follow lab breadcrumbs only.",
  ],
  "Multi-Vector Privilege Escalation": [
    "Enumerate sudo, SUID, cron, systemd timers, and world-writable files together.",
  ],
  "Complete System Compromise": [
    "Document full user → root path as the lab scenario describes.",
  ],
  "Advanced Linux Exploitation": [
    "Combine userland and kernel-style weaknesses per hints.",
  ],
  "Domain Enumeration Basics": [
    "Think `enum4linux`-style SMB/LDAP enumeration; list users, groups, shares.",
  ],
  "Kerberos Authentication": [
    "Review AS/TGS/AP exchanges and ticket storage concepts; follow lab commands.",
  ],
  "LDAP Query Basics": [
    "Practice LDAP filters and attribute reads as the VM instructions show.",
  ],
  "NTLM Hash Extraction": [
    "After sufficient access, extract hashes from SAM/LSASS analogs the lab simulates.",
  ],
  "Basic Lateral Movement": [
    "Reuse credentials across SMB/WinRM-style services in the scenario.",
  ],
  "User Enumeration": [
    "Compare error messages or timing for valid vs invalid account names.",
  ],
  "Group Policy Enumeration": [
    "Look for scripts, scheduled tasks, or leaked passwords in policy artifacts.",
  ],
  "SPN and Kerberoasting Awareness": [
    "Identify SPNs, request TGS tickets, offline crack weak service account passwords (lab).",
  ],
  "Kerberos Ticket Manipulation": [
    "Golden/silver ticket concepts — only as the lab enables.",
  ],
  "LDAP Injection": [
    "Break out of LDAP filters with `)(|` style metacharacters where the app is vulnerable.",
  ],
  "NTLM Relay Attack": [
    "Coerce or capture NTLM and relay to a signing-disabled service (lab narrative).",
  ],
  "Advanced Lateral Movement": [
    "WMI, DCOM, scheduled tasks across hosts in scope.",
  ],
  "Pass-the-Hash Attack": [
    "Use NT hash directly for SMB authentication without plaintext password.",
  ],
  "Domain Controller Access": [
    "Abuse replication or DCSync-style rights if granted in the lab.",
  ],
  "Golden Ticket Attack": [
    "Requires KRBTGT material — ultra-sensitive; follow lab-only steps.",
  ],
  "DCSync Attack": [
    "With replication rights, pull directory secrets as the scenario describes.",
  ],
  "Advanced NTLM Attacks": [
    "Downgrade, relay, or coerce chains per lab text.",
  ],
  "Complete Domain Compromise": [
    "Map a path to domain-wide control and document it.",
  ],
  "Kerberos Delegation Abuse": [
    "Unconstrained / constrained / RBCD abuse as applicable.",
  ],
  "Full AD Penetration": [
    "End-to-end domain attack narrative in the VM.",
  ],
  "Footprinting vs OS Fingerprinting": [
    "Passive org intel vs active banner/stack fingerprinting — answer lab prompts.",
  ],
  "Initial Reconnaissance": [
    "DNS, subdomains, and surface mapping before scanning.",
  ],
  "Port Scanning Basics": [
    "Use `nmap` patterns (e.g. `-sV`) as instructed to identify services.",
  ],
  "Basic Initial Access": [
    "Default credentials, weak services, or simple web flaws per VM storyline.",
  ],
  "Simple Persistence": [
    "cron, user systemd units, or SSH keys — document for blue team.",
  ],
  "Basic Privilege Escalation": [
    "Linux/Windows PEas-style checklist in the container.",
  ],
  "Simple Data Exfiltration": [
    "Package and move data with minimal footprint (lab-safe).",
  ],
  "Advanced Reconnaissance": [
    "CT logs, ASN data, certificate transparency style enumeration.",
  ],
  "Multi-Vector Initial Access": [
    "Combine exposed services and social/technical pretext (as simulated).",
  ],
  "Advanced Persistence": [
    "LOLBAS-style persistence where the lab allows.",
  ],
  "Complex Privilege Escalation": [
    "Kernel plus misconfiguration chains.",
  ],
  "Lateral Movement Techniques": [
    "PtH, WinRM, SMB — reuse creds across lab hosts.",
  ],
  "Stealthy Data Exfiltration": [
    "Slow or DNS-style exfil concepts (defensive awareness).",
  ],
  "Credential Harvesting and Pivoting": [
    "Harvest from memory or key stores, then move to new hosts.",
  ],
  "Complete Penetration Test": [
    "Full PT lifecycle: scope → exploit → report.",
  ],
  "Advanced Persistence Mechanisms": [
    "WMI subscriptions, startup folders, etc., as hinted.",
  ],
  "Full System Compromise": [
    "Root/DA across in-scope assets.",
  ],
  "Advanced Lateral Movement": [
    "Cross-forest or trust abuse if present.",
  ],
  "Complete Red Team Exercise": [
    "Objectives + detection evasion narrative.",
  ],
  "End-to-End Red Team Operation": [
    "Map actions to ATT&CK for reporting practice.",
  ],
};

const WEB_GUIDE = {
  "Reflected XSS Basics": [
    "Open the embedded lab (`/lab/xss-basic`).",
    "In **Enter your name**, type HTML/JS that includes `<script>` and/or `javascript:` (the lab placeholder shows an example pattern).",
    "Click **Submit**. When the reflection executes, the lab marks success and exposes the flag.",
    "Use **Submit Answer** on the main challenge page with the flag text (verification is sent automatically from the iframe when logged in).",
  ],
  "SQL Injection Login Bypass": [
    "Open `/lab/sqli-basic`.",
    "In **Username**, try classic SQLi that closes the string and forces a true condition, e.g. `' OR '1'='1'--` (or `admin'--` — the server checks for `OR '1'='1` / `--` patterns). Password can be anything.",
    "Submit **Login**. On success, copy the flag from the lab and submit on the challenge page.",
  ],
  "Basic CSRF Attack": [
    "Open `/lab/csrf-basic`.",
    "Submit **Change password** with any new password (no CSRF token on the form).",
    "After redirect with success, the lab shows the flag — submit it on the challenge page.",
  ],
  "IDOR in User Profiles": [
    "Open `/lab/idor-basic`.",
    "Change the profile **user id** in the URL or UI to access another user (e.g. user id `1` for admin) until the admin flag appears.",
  ],
  "Unrestricted File Upload": [
    "Open `/lab/file-upload-basic`.",
    "Choose any file and upload — the lab accepts the upload and redirects with success.",
  ],
  "Command Injection Basics": [
    "Open `/lab/command-injection-basic`.",
    "In **Host to ping**, append shell metacharacters such as `;`, `|`, `` ` ``, or `&` after a valid host (e.g. `127.0.0.1; id`) so the backend concatenates into `ping -c 3 ...`.",
    "When output shows the chained command ran, the lab unlocks the flag.",
  ],
  "Open Redirect and URL Validation": [
    "Note: this challenge is wired to lab path `/lab/xss-medium` in the seed (stored XSS lab).",
    "Open `/lab/xss-medium`, post a **comment** containing executable HTML patterns (`<script>`, `javascript:`, or event handlers like `onerror=`).",
    "When the thread renders with XSS detected, the lab shows the flag.",
  ],
  "Stored XSS Exploitation": [
    "Open `/lab/xss-medium`, post a comment with `<script>…</script>`, `javascript:`, or `on*=…` payloads.",
    "Reload if needed until **Stored XSS path hit** appears with the flag.",
  ],
  "UNION-Based SQL Injection": [
    "Open `/lab/sqli-medium`.",
    "Set query parameter **id** to include `UNION` or `union` (e.g. craft a UNION payload in the id field in the lab UI) so the app returns the augmented row with the flag.",
  ],
  "Advanced CSRF with Token Bypass": [
    "Open `/lab/csrf-medium` — perform the state change that sets email to `attacker@example.com` (success + correct email triggers verification).",
    "Follow the lab’s token/flow hints on the page.",
  ],
  "IDOR in API Endpoints": [
    "Open `/lab/idor-medium` — fuzz or change invoice/user IDs until a response includes the flag.",
  ],
  "File Upload with Filter Bypass": [
    "Open `/lab/file-upload-medium` — bypass extension/content checks per lab hints (double extension, case, content-type tricks).",
  ],
  "Command Injection with Encoding": [
    "Open `/lab/command-injection-medium` — use encoding/newlines/backticks to bypass naive filters while chaining commands.",
  ],
  "JWT Token Manipulation": [
    "Open `/lab/auth-bypass-medium` — decode/modify the JWT or claims until you obtain an admin session with flag (see lab objective).",
  ],
  "DOM-Based XSS with Filter Bypass": [
    "Open `/lab/xss-hard` — steer untrusted data into dangerous DOM sinks with filter bypasses.",
  ],
  "Blind SQL Injection": [
    "Open `/lab/sqli-hard` — use boolean or time-based inference when output is hidden.",
  ],
  "CSRF with SameSite Bypass": [
    "Open `/lab/csrf-hard` — complete the CSRF flow that succeeds with `success=1` in the lab’s redirect model.",
  ],
  "Complex IDOR Chain": [
    "Open `/lab/idor-hard` — perform **edit** on privileged user id `1` to reach the escalation flag.",
  ],
  "Polyglot File Upload": [
    "Open `/lab/file-upload-hard` — upload a polyglot that satisfies image checks but executes (per lab behavior).",
  ],
  "Advanced Command Injection": [
    "Open `/lab/command-injection-hard` — chain advanced shell techniques until the flag condition triggers.",
  ],
};

/**
 * Exact terminal checklist lines come from buildLab (same logic as live `/lab/theory`).
 */
function theorySteps(ch, globalIndex) {
  const challenge = {
    title: ch.title,
    domain: ch.domain,
    category: ch.category,
    difficulty: ch.difficulty,
    correctAnswer: ch.correctAnswer,
    description: ch.description || "",
    _id: syntheticChallengeId(globalIndex),
  };
  let lab;
  try {
    lab = buildLab(challenge);
  } catch {
    return [
      "Open `/lab/theory` from the challenge page (logged in).",
      "Complete the on-screen checklist and verification flow.",
    ];
  }

  const steps = [
    "Open the challenge while logged in so the right panel loads `/lab/theory?challengeId=…&userId=…`.",
    `**Scenario:** ${lab.type || "theory workspace"}`,
    `**Read first:** ${lab.instruction || "Follow README in the virtual filesystem."}`,
    "**Terminal — type each checklist command exactly (one line, then Enter). The live lab UI is authoritative if any line differs from below (variant depends on database challenge id):**",
  ];

  (lab.checklist || []).forEach((item, i) => {
    steps.push(`${i + 1}. ${item.label} — pattern \`${item.pattern}\``);
  });

  steps.push(
    "**After files are read:** use the **Tools** tab to decode hex or Base64 when the mission says to (crypto domain).",
    "Locate a line `SUBMISSION_CODE=…` in the virtual files; copy **only** the value (lowercase, no spaces).",
    "Paste into the lab **Verify** box → **Submit** to receive a verification token.",
    "Return to the main CyberRangeX page → **Your Answer** → submit the platform’s required answer format (see lab verify hint)."
  );

  return steps;
}

/** Labs used by System & Network rotation but not in WEB_LAB_PATHS */
const EXTRA_LAB_STEPS = {
  "/lab/auth-bypass-basic": [
    "**Lab path:** `/lab/auth-bypass-basic`",
    "- Username: `admin`",
    "- Password: `admin123`",
    "- Click **Login** → success shows the flag.",
  ],
  "/lab/auth-bypass-hard": [
    "**Lab path:** `/lab/auth-bypass-hard`",
    "- Open the **login** form (session fixation scenario).",
    "- Username: `admin` · Password: `admin123` (optional **Session ID** for the fixation storyline).",
    "- Submit until **Active session** shows role **admin** and the flag line appears.",
  ],
};

function stepsForLabPath(labPath) {
  if (EXTRA_LAB_STEPS[labPath]) return EXTRA_LAB_STEPS[labPath];
  const idx = WEB_LAB_PATHS.indexOf(labPath);
  if (idx < 0) return null;
  const title = WEB_TITLES_FOR_PATH[idx];
  const g = WEB_GUIDE[title];
  const head = [`**Lab path:** \`${labPath}\` (same mechanics as Web challenge “${title}”).`];
  if (g) return [...head, ...g.map((x) => `- ${x}`)];
  return [...head, "- Complete the lab until the success banner shows; copy the shown value into **Your Answer**."];
}

function sysNetForensicsSteps(ch) {
  const p = ch.labPath || "";
  if (p.includes("forensics") && p.includes("basic")) {
    return [
      `Open the lab iframe: \`${p}\`.`,
      "Press **F12** → **Elements** (or **Inspector**): search (`Ctrl+F`) for text `FLAG` or inspect nodes with class `flag` / `hidden` / off-screen CSS (`left: -9999px`).",
      "Alternatively **Console** may reference the lab instance — the flag string appears in the DOM only.",
      "Keep the parent challenge page open: the lab sends **LAB_READY** with a verification token on load.",
      "Type the recovered flag line into **Your Answer** → **Submit Answer**.",
    ];
  }
  if (p.includes("forensics") && p.includes("medium")) {
    return [
      `Open \`${p}\` in the challenge iframe.`,
      "In **Filter**, type: `EXPORT` (or another substring that appears only on the sensitive SIEM row) and click **Apply filter**.",
      "When the export row that contains the challenge data is visible, the lab shows success and posts **CHALLENGE_SOLVED** to the parent.",
      "Copy the flag from the green success line into **Your Answer** (or accept auto-submit).",
    ];
  }
  if (p.includes("forensics") && p.includes("hard")) {
    return [
      `Open \`${p}\` in the challenge iframe.`,
      "Click one of: **Processes** · **Strings** · **Network** (tabs at the top). Any of these deep sections triggers the solved state.",
      "Decode the flag: from **Processes** use the hex in the `secret_process` row; from **Strings** decode the `base64_data=` or `hex_string=` values; from **Network** Base64-decode the `Authorization: Bearer …` payload (browser console: `atob('…')`).",
      "Paste the decoded `FLAG{…}` into **Your Answer** and submit.",
    ];
  }
  const byPath = stepsForLabPath(p);
  if (byPath) {
    return [
      "**Note:** This System & Network topic shares a web lab with the Web Application domain — complete the same clicks/inputs as that lab.",
      ...byPath,
      "Submit the flag text the lab displays (verification token flows through the iframe).",
    ];
  }
  return [
    `Open the lab iframe: \`${p}\`.`,
    "Follow on-page instructions until a success state and flag appear.",
    "Paste into **Your Answer** and submit.",
  ];
}

function vmSteps(ch) {
  const vm = ch.vmConfig;
  const uk = vm && vm.unlockKey != null ? String(vm.unlockKey) : "?";
  const topic = VM_TOPIC_STEPS[ch.title] || [
    "Enumerate and exploit per the challenge **hints** and category (see CyberRangeX hint panel).",
  ];
  const lines = [
    "Ensure VMs are up: `docker compose -f vms/docker-compose.vms.yml up -d` (from project root).",
    `Connect using **Web terminal** in the UI or SSH: \`${vm.sshAccess || "see challenge panel"}\` (user \`${vm.credentials?.username || "user"}\`, password \`${vm.credentials?.password || "password123"}\`).`,
    ...topic.map((t) => `- ${t}`),
    `On the challenge page, copy the full command: \`/usr/local/bin/unlock_flag ${uk} <YOUR_ATTEST_TOKEN>\` (the site fills in your personal attest token).`,
    "Run that entire command **inside** the VM shell once you are allowed to run `unlock_flag` (setuid binary).",
    "Read: `cat /home/user/challenges/unlocked_flag.txt`.",
    "Within ~20 minutes, paste that line into **Your Answer** and **Submit Answer** on CyberRangeX.",
  ];
  return lines;
}

function webSteps(ch) {
  const g = WEB_GUIDE[ch.title];
  const head = [`**Lab path:** \`${ch.labPath}\` (loaded in the right panel).`];
  if (g) return [...head, ...g.map((x) => `- ${x}`)];
  return [
    ...head,
    "- Complete the lab interaction until a success banner shows the flag.",
    "- Submit the flag on the main challenge page (verification token is issued by the lab iframe).",
  ];
}

function buildSection(ch, index) {
  const n = index + 1;
  const lines = [];
  lines.push(`### ${n}. ${ch.title}`);
  lines.push(`- **Domain:** ${ch.domain}`);
  lines.push(`- **Category:** ${ch.category} · **Difficulty:** ${ch.difficulty} · **Points:** ${ch.points}`);
  lines.push("");

  let steps;
  if (ch.vmConfig && ch.vmConfig.enabled) {
    lines.push("**Type:** Docker VM challenge");
    steps = vmSteps(ch);
  } else if (ch.labPath === "/lab/theory") {
    lines.push("**Type:** Theory / browser workspace (`/lab/theory`)");
    steps = theorySteps(ch, index);
  } else if (ch.labPath) {
    if (ch.domain === "Web Application Security") {
      lines.push("**Type:** Web hands-on lab");
      steps = webSteps(ch);
    } else {
      lines.push("**Type:** Hands-on lab");
      steps = sysNetForensicsSteps(ch);
    }
  } else {
    lines.push("**Type:** (No lab path in seed — treat as theory-style if applicable)");
    steps = ["- Complete any on-screen instructions; if no lab appears, contact your instructor."];
  }

  lines.push("**Steps (nothing below is the literal flag string):**");
  steps.forEach((s) => lines.push(typeof s === "string" && s.startsWith("-") ? s : `- ${s}`));
  lines.push("");
  return lines.join("\n") + "\n";
}

function main() {
  const challenges = generateChallenges();
  const outPath = path.join(__dirname, "..", "..", "ans1.md");

  let md = "";
  md += "# CyberRangeX — solve steps for all seeded challenges\n\n";
  md +=
    "This file lists **what to click and type** to earn credit. It intentionally **does not** paste challenge answer strings. ";
  md +=
    "VM challenges require the **attest** unlock flow: copy the full `unlock_flag …` line from the challenge page (includes your token).\n\n";
  md +=
    "**System & Network Security** challenges reuse the same interactive web labs as the Web domain (see each section’s `/lab/...` path): use the **typed steps** for that path below, then submit the value the lab shows.\n\n";
  md +=
    "**Theory (`/lab/theory`):** Checklist variants are chosen from your challenge’s MongoDB id. This file shows one **sample** variant per row position; always match the **live checklist** in the browser if it differs.\n\n";
  md += `**Total challenges:** ${challenges.length} · **Regenerate:** \`node backend/scripts/generateAns1Markdown.js\` (run from \`CTF-Cyberrangex\`)\n\n`;
  md += "---\n\n";

  challenges.forEach((c, i) => {
    md += buildSection(c, i);
  });

  fs.writeFileSync(outPath, md, "utf8");
  console.log(`Wrote ${outPath} (${challenges.length} challenges)`);
}

main();
