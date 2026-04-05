require("dotenv").config();
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");

/**
 * 8 domains: 2 theory (browser workspace), 3 hands-on lab domains, 3 Docker VM domains.
 */
const D = {
  THEORY_GOV: "Security Governance & Risk Foundations",
  THEORY_CRYPTO: "Cryptography & PKI Theory",
  WEB_APP: "Web Application Security",
  FORENSICS_LAB: "Cyber Forensics Lab",
  SYSNET_LAB: "System & Network Security Lab",
  LINUX_VM: "Linux System Security Lab (VM)",
  AD_VM: "Enterprise Directory Services Lab (VM)",
  PENTEST_VM: "Penetration Testing & Red Team Lab (VM)",
};

const THEORY_DOMAINS = new Set([D.THEORY_GOV, D.THEORY_CRYPTO]);

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
  "/lab/auth-bypass-basic",
  "/lab/xss-hard",
  "/lab/sqli-hard",
  "/lab/csrf-hard",
  "/lab/idor-hard",
  "/lab/file-upload-hard",
  "/lab/command-injection-hard",
  "/lab/auth-bypass-medium",
];

const FORENSICS_LAB_PATHS = ["/lab/forensics-basic", "/lab/forensics-medium", "/lab/forensics-hard"];

const SYSNET_LAB_PATHS = [
  "/lab/sqli-basic",
  "/lab/command-injection-basic",
  "/lab/auth-bypass-basic",
  "/lab/idor-basic",
  "/lab/file-upload-basic",
  "/lab/xss-basic",
  "/lab/csrf-basic",
  "/lab/sqli-medium",
  "/lab/command-injection-medium",
  "/lab/auth-bypass-medium",
  "/lab/idor-medium",
  "/lab/file-upload-medium",
  "/lab/xss-medium",
  "/lab/csrf-medium",
  "/lab/sqli-hard",
  "/lab/command-injection-hard",
  "/lab/auth-bypass-hard",
  "/lab/idor-hard",
  "/lab/file-upload-hard",
  "/lab/xss-hard",
];

const VM_PORTS = {
  linux: {
    easy: { webTerminal: 4200, ssh: 2220, vnc: 5900 },
    medium: { webTerminal: 4210, ssh: 2230, vnc: 5901 },
    hard: { webTerminal: 4220, ssh: 2240, vnc: 5902 },
  },
  ad: {
    easy: { webTerminal: 4260, ssh: 2221, vnc: 5903 },
    medium: { webTerminal: 4270, ssh: 2222, vnc: 5904 },
    hard: { webTerminal: 4280, ssh: 2223, vnc: 5905 },
  },
  pentest: {
    easy: { webTerminal: 4230, ssh: 2250, vnc: 5906 },
    medium: { webTerminal: 4240, ssh: 2260, vnc: 5907 },
    hard: { webTerminal: 4250, ssh: 2270, vnc: 5908 },
  },
};

function generateDescription(category, difficulty, title) {
  const base = {
    easy: `Easy ${category} challenge: ${title}. Apply foundational concepts from your course materials and recover the flag.`,
    medium: `Medium ${category} challenge: ${title}. Combine lecture topics and practical reasoning to obtain the flag.`,
    hard: `Hard ${category} challenge: ${title}. Requires deeper analysis, possibly chaining ideas from multiple syllabus units.`,
  };
  return base[difficulty] || `Solve this ${category} challenge: ${title}.`;
}

const CATEGORY_HINTS = {
  "CIA & Security Foundations": [
    "Review confidentiality, integrity, and availability.",
    "Think about which property is violated in each scenario.",
    "Map controls to people, process, and technology.",
  ],
  "Identity & Access": [
    "Authentication proves who you are; authorization grants what you can do.",
    "Strong credentials use length, uniqueness, and MFA where possible.",
    "Compare OAuth, OpenID Connect, and enterprise SSO patterns.",
  ],
  "Threat Operations": [
    "Use MITRE ATT&CK tactics and techniques as a vocabulary.",
    "Distinguish threats, vulnerabilities, and risks.",
    "Consider detection engineering and SOC monitoring workflows.",
  ],
  "Zero Trust & Resilience": [
    "Zero trust: verify explicitly, least privilege, assume breach.",
    "Relate to device, identity, network, app, and data pillars.",
    "Think continuous validation rather than perimeter-only trust.",
  ],
  "Classical Ciphers": [
    "Try frequency analysis, keyword length, or known-plaintext ideas.",
    "For transposition, reconstruct columns or grids.",
    "Check whether multiple alphabets (polyalphabetic) apply.",
  ],
  "Modern Symmetric Crypto": [
    "Block vs stream: blocks use modes (ECB, CBC, CTR, GCM).",
    "ECB leaks patterns; authenticated encryption mitigates many issues.",
    "DES vs AES: key size and block size matter.",
  ],
  "Asymmetric & Key Exchange": [
    "RSA relates to factoring; DH/ElGamal to discrete log.",
    "ECC gives smaller keys for comparable security levels.",
    "Review signatures: RSA, ElGamal, ECDSA.",
  ],
  "Hashes & MACs": [
    "Hash = one-way digest; MAC = integrity with a secret key.",
    "Know properties: preimage resistance, collision resistance.",
    "SHA-2 family vs SHA-3 (Keccak); length-extension on Merkle–Damgård.",
  ],
  "Post-Quantum & Advanced": [
    "Lattice problems (LWE/SIS) underpin Kyber/Dilithium-style schemes.",
    "Quantum key distribution is about key agreement, not bulk encryption.",
    "OTP is information-theoretically secure only if key is random, secret, and single-use.",
  ],
  "Operating Systems & Access Control": [
    "DAC vs MAC vs RBAC; reference monitors and TCB.",
    "SELinux/AppArmor add mandatory policies on Linux.",
    "SetUID and capabilities change effective privilege.",
  ],
  "Databases & Concurrency": [
    "Schedules: serializable vs relaxed isolation.",
    "Deadlock: wait-for graph, timeouts, ordering.",
    "Row-level security and virtual private databases limit tuples seen.",
  ],
  "Memory & Language Safety": [
    "Buffer overflows, format strings, and use-after-free target memory safety.",
    "Integer conversions and overflows change allocation sizes or indices.",
    "Mitigations: ASLR, NX, stack canaries, safe languages, fuzzing.",
  ],
  "Concurrency & TOCTOU": [
    "Race conditions: check-then-use gaps on shared resources.",
    "File TOCTOU: replace file between stat and open.",
    "Mitigate with atomic APIs and least privilege.",
  ],
  "Forensics Process": [
    "Follow scientific method: acquire, authenticate, analyze, report.",
    "Order of volatility: registers, RAM, disk, remote logs.",
    "Chain of custody documents every transfer.",
  ],
  "Disk & File Artifacts": [
    "Slack space, unallocated clusters, and carving by file headers.",
    "Know common magic bytes (e.g., JPEG, PNG, PDF).",
    "MAC times: modification, access, creation (OS-dependent).",
  ],
  "Law & Ethics": [
    "IT Act 2000 / amendments and related IPC sections in Indian context.",
    "Expert witness: qualifications, methodology, reproducibility.",
    "IPR and authorized access boundaries matter for legality.",
  ],
  "Network Stack": [
    "Layering: link, network, transport, application.",
    "TCP reliable, ordered; UDP lightweight, best-effort.",
    "DNS maps names; DHCP assigns addresses; CIDR aggregates routes.",
  ],
  "Network Defense": [
    "Packet filter vs stateful firewall vs application-layer proxy.",
    "IDS signature vs anomaly; honeypots for deception.",
    "TLS versions, VPNs (IPsec, SSL VPN), email security (SPF, DKIM).",
  ],
  "Web & Browser Security": [
    "OWASP: injection, broken auth, XSS, CSRF, SSRF, etc.",
    "Same-origin policy, cookies, CORS, clickjacking.",
    "Use the lab iframe; inspect requests and responses.",
  ],
  "Linux Hardening Lab": [
    "Enumerate permissions, cron, sudoers, and SUID binaries.",
    "Consider capabilities and environment variables (LD_PRELOAD).",
    "The flag is inside the VM; use the web terminal or SSH.",
  ],
  "Enterprise Directory Lab": [
    "Kerberos tickets, LDAP attributes, and domain trusts.",
    "Lateral movement often reuses credentials or hashes.",
    "Use Impacket-style tooling mindset inside the lab VM.",
  ],
  "Penetration Test Lab": [
    "Follow PTES-style phases: recon, scanning, exploitation, post-exploit.",
    "Document findings as you would for a client report.",
    "Combine web, network, and local privilege techniques.",
  ],
};

const LEGACY_WEB_HINTS = {
  "Reflected XSS Basics": [
    "Look for user input that is reflected in the page without sanitization.",
    "Try injecting <script> tags in input fields.",
    "Check the page source to see how your input is displayed.",
  ],
  "SQL Injection Login Bypass": [
    "Try using SQL comments (-- or #) to bypass password checks.",
    "Use ' OR '1'='1' as a username or password.",
    "Look for error messages that reveal database structure.",
  ],
  "Basic CSRF Attack": [
    "CSRF exploits the browser sending cookies to a trusted site.",
    "Create a malicious HTML form that POSTs to the vulnerable endpoint.",
    "The victim must be logged in when the request fires.",
  ],
  "IDOR in User Profiles": [
    "Try changing the user ID in the URL or request parameters.",
    "Access other users' resources by modifying identifiers.",
    "Check if authorization is properly implemented.",
  ],
  "Unrestricted File Upload": [
    "Try uploading a file with a dangerous extension.",
    "Check if the server executes files under the web root.",
    "Validate content type vs actual bytes.",
  ],
  "Command Injection Basics": [
    "Try appending commands with ; or && after input.",
    "Test with ; ls or && whoami.",
    "Look for shell metacharacters passed to system().",
  ],
  "JWT Token Manipulation": [
    "Decode the JWT to inspect header and payload.",
    "Try the none algorithm or weak secrets if hinted.",
    "Verify whether the server validates alg and signature correctly.",
  ],
  "Stored XSS Exploitation": [
    "Payload persists and runs for other viewers.",
    "Use comment or profile fields that render HTML.",
    "Stealing session cookies demonstrates impact.",
  ],
  "UNION-Based SQL Injection": [
    "Determine column count with ORDER BY or UNION NULLs.",
    "UNION SELECT to pull data from other tables.",
    "Look for secrets or flag tables in the schema.",
  ],
  "Advanced CSRF with Token Bypass": [
    "Tokens may be predictable, leaked, or poorly validated.",
    "Try extracting a token from a GET page then replaying POST.",
    "Check SameSite and cross-origin interactions.",
  ],
  "IDOR in API Endpoints": [
    "Fuzz numeric or UUID IDs in REST paths.",
    "Compare responses for different authenticated users.",
    "Authorization should bind resources to the session user.",
  ],
  "File Upload with Filter Bypass": [
    "Double extensions, case tricks, and content-type confusion.",
    "Polyglots valid as image and script.",
    "Null bytes and path tricks if legacy filters exist.",
  ],
  "Command Injection with Encoding": [
    "Try URL encoding, newlines, or backticks.",
    "Filter evasion: $() vs backticks, base64 decode pipes.",
    "Blind injection: use time delays or DNS callbacks.",
  ],
  "DOM-Based XSS with Filter Bypass": [
    "Source flows into dangerous sinks: innerHTML, eval, document.write.",
    "DOM XSS may never hit the server logs.",
    "Bypass weak filters with encoding or alternate events.",
  ],
  "Blind SQL Injection": [
    "Boolean or time-based inference when output is hidden.",
    "SUBSTRING and SLEEP style payloads.",
    "Automate binary search over characters.",
  ],
  "CSRF with SameSite Bypass": [
    "SameSite=Lax still allows top-level GET in some cases.",
    "Subdomains and cookie scope matter.",
    "Combine with XSS or open redirects for impact.",
  ],
  "Complex IDOR Chain": [
    "One IDOR may reveal IDs needed for the next step.",
    "Map object relationships across APIs.",
    "Think multi-step authorization bugs.",
  ],
  "Polyglot File Upload": [
    "Craft headers that satisfy both image parser and script engine.",
    "Magic bytes must match allowed type.",
    "Server-side re-encoding may destroy polyglots—test behavior.",
  ],
  "Advanced Command Injection": [
    "Chained redirections and subshells.",
    "Out-of-band data exfiltration via DNS or HTTP.",
    "Restricted shells: find allowed binaries to pivot.",
  ],
};

const LEGACY_AD_HINTS = {
  "Domain Enumeration Basics": [
    "Use enum4linux, ldapsearch, or BloodHound-style thinking.",
    "List users, groups, computers, and shares.",
    "Misconfigurations often appear in descriptions or ACLs.",
  ],
  "Kerberos Authentication": [
    "AS-REQ/TGS-REQ/AP-REQ message flow.",
    "Tickets are encrypted with keys derived from passwords or KRBTGT.",
    "Clock skew matters for validity windows.",
  ],
  "LDAP Query Basics": [
    "LDAP filters: (&(objectClass=user)(cn=*)).",
    "Anonymous bind may be enabled in labs.",
    "Attributes like memberOf reveal group memberships.",
  ],
  "NTLM Hash Extraction": [
    "Secretsdump, Mimikatz, or SAM extraction after admin access.",
    "Pass-the-hash reuses NT hash without plaintext.",
    "Relay attacks abuse SMB signing off endpoints.",
  ],
  "Basic Lateral Movement": [
    "Reuse creds on WinRM, SMB, or RDP.",
    "PsExec/WMIexec patterns.",
    "Map trust to high-value hosts.",
  ],
  "User Enumeration": [
    "RPC, Kerberos pre-auth errors, and OWA timing may leak users.",
    "Compare error messages for valid vs invalid names.",
  ],
  "Group Policy Enumeration": [
    "GPP passwords in SYSVOL (historic misconfigs).",
    "Logon scripts and scheduled tasks in GPOs.",
  ],
  "Kerberos Ticket Manipulation": [
    "Golden/silver tickets if KRBTGT or service keys leak.",
    "Ticket renewal and delegation abuse.",
  ],
  "LDAP Injection": [
    "Break out of filters with )(| constructs.",
    "Wildcard * can match broadly.",
  ],
  "NTLM Relay Attack": [
    "Responder captures challenges; relay to LDAP/SMB.",
    "Signing requirements block some relays.",
  ],
  "Advanced Lateral Movement": [
    "Combine WMI, DCOM, and scheduled tasks.",
    "Credential reuse across subnets.",
  ],
  "Pass-the-Hash Attack": [
    "Use tools that accept NT hash for SMB auth.",
    "Disable local admin reuse across machines.",
  ],
  "Domain Controller Access": [
    "DCSync rights replicate secrets.",
    "Protect DC accounts and replication ACLs.",
  ],
  "Golden Ticket Attack": [
    "Requires KRBTGT hash from domain compromise level access.",
    "Forged TGTs grant arbitrary user tickets.",
  ],
  "DCSync Attack": [
    "DS-Replication-Get-Changes* rights.",
    "secretsdump.py DCSync option.",
  ],
  "Advanced NTLM Attacks": [
    "Downgrade, relay, and coerced auth chains.",
  ],
  "Complete Domain Compromise": [
    "BloodHound shortest paths to Domain Admins.",
    "Chaining Kerberos + NTLM + ACL abuse.",
  ],
  "Kerberos Delegation Abuse": [
    "Unconstrained vs constrained vs resource-based constrained delegation.",
  ],
  "Full AD Penetration": [
    "Document each step for a professional report.",
  ],
  "SPN and Kerberoasting Awareness": [
    "Service accounts may have crackable TGS tickets.",
    "Request RC4 if legacy enabled; prefer AES in real environments.",
    "Impacket GetUserSPNs.py style workflow.",
  ],
};

const LEGACY_LINUX_HINTS = {
  "Linux DAC: chmod, umask, and ownership": [
    "ls -l shows owner, group, and other bits.",
    "umask subtracts default permission bits on new files.",
    "world-writable directories enable symlink/TMP races.",
  ],
  "SUID Binary Exploitation": [
    "find / -perm -4000 2>/dev/null",
    "GTFOBins lists misusable binaries.",
    "Custom SUID may shell out unsafely.",
  ],
  "Sudo Misconfiguration": [
    "sudo -l lists allowed commands.",
    "NOPASSWD entries are high value.",
    "sudoedit and wildcards can be abused.",
  ],
  "Cron Job Exploitation": [
    "Writable cron scripts or PATH hijacks.",
    "Wildcard cron entries dangerous with user-writable dirs.",
  ],
  "Environment Variable Abuse": [
    "LD_PRELOAD injects before libc.",
    "PATH hijack when root runs relative commands.",
  ],
  "Writable /etc/passwd": [
    "If writable, add a user with known hash.",
    "openssl passwd for crypt hashes.",
  ],
  "Basic Kernel Exploit": [
    "uname -a for version; match public exploits carefully in lab only.",
  ],
  "SUDO NOPASSWD": [
    "Even allowed programs may spawn shells (vim, find, awk).",
  ],
  "Advanced SUID Exploitation": [
    "strace/ltrace to see syscall and library use.",
  ],
  "Sudo Command Injection": [
    "Arguments passed to shell -c may inject.",
  ],
  "Cron Job Path Injection": [
    "PATH in crontab may be minimal—hijack relative calls.",
  ],
  "LD_PRELOAD Exploitation": [
    "Needs a program that honors LD_PRELOAD as root.",
  ],
  "Kernel Module Exploitation": [
    "Unsafe module load paths rare on modern kernels.",
  ],
  "Capabilities Abuse": [
    "getcap -r / 2>/dev/null",
    "cap_setuid+cap_net_bind_service often interesting.",
  ],
  "Advanced Kernel Exploitation": [
    "SMEP/SMAP/KPTI complicate kernel ROP.",
  ],
  "Complex SUID Chain": [
    "One binary writes a root cron or SSH key.",
  ],
  "Sudo Buffer Overflow": [
    "Historic CVEs; patch level matters.",
  ],
  "Multi-Vector Privilege Escalation": [
    "Enumerate: sudo, SUID, cron, systemd timers, capabilities.",
  ],
  "Complete System Compromise": [
    "Establish persistence only in authorized labs.",
  ],
  "Advanced Linux Exploitation": [
    "Combine leaks with kernel or userland bugs.",
  ],
};

const LEGACY_PENTEST_HINTS = {
  "Footprinting vs OS Fingerprinting": [
    "Footprinting: domain/DNS/WHOIS organizational intel.",
    "Fingerprinting: banner and stack quirks identify OS and apps.",
    "Keep notes for your PT report.",
  ],
  "Initial Reconnaissance": [
    "Start passive; then active scanning with authorization.",
    "Map attack surface before exploitation.",
  ],
  "Port Scanning Basics": [
    "nmap -sS -sV -O style thinking.",
    "Version strings suggest CVEs.",
  ],
  "Basic Initial Access": [
    "Default creds, weak services, or web bugs.",
  ],
  "Simple Persistence": [
    "cron, systemd user units, or SSH keys—document for blue team.",
  ],
  "Basic Privilege Escalation": [
    "LinPEAS/winPEAS mindset: configs and binaries.",
  ],
  "Simple Data Exfiltration": [
    "Compress, encrypt in transit, minimize client data touched.",
  ],
  "Advanced Reconnaissance": [
    "Subdomain enum, ASN ranges, certificate transparency.",
  ],
  "Multi-Vector Initial Access": [
    "Combine phishing prep with exposed RDP/VPN.",
  ],
  "Advanced Persistence": [
    "Legitimate admin tools abused (LOLBAS).",
  ],
  "Complex Privilege Escalation": [
    "Kernel + misconfig chain.",
  ],
  "Lateral Movement Techniques": [
    "Pass-the-hash, WinRM, SMB pipes.",
  ],
  "Stealthy Data Exfiltration": [
    "DNS tunneling or slow drip—still detectable with analytics.",
  ],
  "Credential Harvesting and Pivoting": [
    "Mimikatz/lsass dumps on Windows; keys on Linux.",
  ],
  "Complete Penetration Test": [
    "Scope, rules of engagement, and evidence matter.",
  ],
  "Advanced Persistence Mechanisms": [
    "Bootkits rare; often startup items and WMI subscriptions.",
  ],
  "Full System Compromise": [
    "Domain admin or root everywhere in scope.",
  ],
  "Advanced Lateral Movement": [
    "Trust abuse between forests.",
  ],
  "Complete Red Team Exercise": [
    "Purple team debrief improves detection.",
  ],
  "End-to-End Red Team Operation": [
    "Align actions to MITRE ATT&CK for reporting.",
  ],
};

function generateHints(title, category, difficulty) {
  const legacy =
    LEGACY_WEB_HINTS[title] ||
    LEGACY_AD_HINTS[title] ||
    LEGACY_LINUX_HINTS[title] ||
    LEGACY_PENTEST_HINTS[title];
  if (legacy) return legacy;
  const cat = CATEGORY_HINTS[category];
  if (cat) return cat;
  return [
    `Relate the problem to ${category} at ${difficulty} depth.`,
    "Review your course notes and standard definitions.",
    "The flag matches FLAG{...} format.",
  ];
}

function addVmConfig(vmKey, resetSegment, challenge) {
  const ports = VM_PORTS[vmKey][challenge.difficulty];
  // VM unlocker uses an opaque numeric id (not the raw FLAG{...} token),
  // so the frontend command does NOT leak the flag contents.
  const inner = (challenge.correctAnswer || "").match(/^FLAG\{(.+)\}$/)?.[1] || null;
  let unlockKey = null; // stored as `vmConfig.unlockKey`, but is actually an unlockId
  if (inner) {
    const suffix = inner.split("_").pop(); // e.g. "115" or "e00" (for DAC/SPN/footprint)
    if (suffix === "e00") {
      unlockKey = vmKey === "linux" ? "1000" : vmKey === "ad" ? "1001" : "1002";
    } else {
      unlockKey = suffix; // includes leading zeros for values like "096"
    }
  }
  return {
    ...challenge,
    vmFlag: challenge.correctAnswer,
    vmConfig: {
      enabled: true,
      vmType: "linux",
      vmUrl: `vnc://localhost:${ports.vnc}`,
      sshAccess: `ssh user@localhost -p ${ports.ssh}`,
      webTerminal: `http://localhost:${ports.webTerminal}`,
      resetEndpoint: `/vm/reset/${resetSegment}/${challenge.difficulty}`,
      credentials: { username: "user", password: "password123" },
      unlockKey,
      // VM unlocker copies the correct flag into /home/user/challenges/unlocked_flag.txt
      unlockCommand: unlockKey ? `/usr/local/bin/unlock_flag ${unlockKey}` : null,
    },
  };
}

function finalize(domain, row) {
  const isVmDomain =
    domain === D.LINUX_VM ||
    domain === D.AD_VM ||
    domain === D.PENTEST_VM;

  let labPath = row.labPath;
  if (labPath === undefined) {
    if (isVmDomain) labPath = null;
    else if (THEORY_DOMAINS.has(domain)) labPath = "/lab/theory";
    else labPath = null;
  }

  return {
    ...row,
    labPath,
    domain,
    description: generateDescription(row.category, row.difficulty, row.title),
    hints: generateHints(row.title, row.category, row.difficulty),
  };
}

function generateChallenges() {
  const out = [];

  // --- 1. Digital Security, Identity & Cyber Resilience (20) ---
  [
    { title: "CIA Triad: Classify the Security Property", category: "CIA & Security Foundations", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_cia_classify_e01}" },
    { title: "Malware Families: Virus vs Worm vs Trojan", category: "CIA & Security Foundations", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_malware_types_e02}" },
    { title: "Strong Credentials and Password Managers", category: "Identity & Access", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_password_policy_e03}" },
    { title: "Phishing Indicators in Email Headers", category: "Threat Operations", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_phishing_headers_e04}" },
    { title: "HTTPS, TLS, and Browser Certificate Warnings", category: "Identity & Access", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_tls_browser_e05}" },
    { title: "Physical vs Logical Server Controls", category: "CIA & Security Foundations", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_phys_logical_e06}" },
    { title: "Availability: DDoS Impact on Services", category: "CIA & Security Foundations", difficulty: "easy", points: 100, correctAnswer: "FLAG{digital_availability_ddos_e07}" },
    { title: "Authentication vs Authorization in Web Apps", category: "Identity & Access", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_authz_authn_m01}" },
    { title: "OAuth 2.0 vs OpenID Connect Roles", category: "Identity & Access", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_oauth_oidc_m02}" },
    { title: "MITRE ATT&CK: Tactic vs Technique", category: "Threat Operations", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_attck_taxonomy_m03}" },
    { title: "Incident Response Lifecycle (NIST-style)", category: "Threat Operations", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_ir_lifecycle_m05}" },
    { title: "Supply Chain and Third-Party Risk", category: "Zero Trust & Resilience", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_supply_chain_m06}" },
    { title: "Zero Trust: Verify Explicitly on Every Request", category: "Zero Trust & Resilience", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_zta_verify_m07}" },
    { title: "MITRE CAR: Analytics for Detection Engineering", category: "Threat Operations", difficulty: "medium", points: 200, correctAnswer: "FLAG{digital_mitre_car_m08}" },
    { title: "MITRE Shield: Active Defense and Deception", category: "Zero Trust & Resilience", difficulty: "hard", points: 300, correctAnswer: "FLAG{digital_shield_deception_h01}" },
    { title: "Zero Trust for Cloud and Hybrid Workloads", category: "Zero Trust & Resilience", difficulty: "hard", points: 300, correctAnswer: "FLAG{digital_zta_cloud_h02}" },
    { title: "Cyber Analytics: False Positives and Baselining", category: "Threat Operations", difficulty: "hard", points: 300, correctAnswer: "FLAG{digital_analytics_fp_h03}" },
    { title: "Machine Learning in Anomaly Detection (Concepts)", category: "Threat Operations", difficulty: "hard", points: 300, correctAnswer: "FLAG{digital_ml_anomaly_h04}" },
    { title: "Blockchain Integrity vs Confidentiality on Ledger", category: "Zero Trust & Resilience", difficulty: "hard", points: 300, correctAnswer: "FLAG{digital_blockchain_cia_h05}" },
    { title: "Quantum Threats and Migration Planning (Overview)", category: "Zero Trust & Resilience", difficulty: "hard", points: 300, correctAnswer: "FLAG{digital_pqc_migration_h06}" },
  ].forEach((r) => out.push(finalize(D.THEORY_GOV, r)));

  // --- 2. Cryptography & PKI Theory (20) ---
  [
    { title: "Caesar and ROT Ciphers", category: "Classical Ciphers", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_caesar_rot_e01}" },
    { title: "Columnar Transposition Basics", category: "Classical Ciphers", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_columnar_e02}" },
    { title: "Keyword Columnar Transposition", category: "Classical Ciphers", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_keyword_col_e03}" },
    { title: "Simple Monoalphabetic Substitution", category: "Classical Ciphers", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_mono_sub_e04}" },
    { title: "Affine Cipher over Z26", category: "Classical Ciphers", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_affine_e05}" },
    { title: "Vigenère Cipher and Keyword Length", category: "Classical Ciphers", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_vigenere_e06}" },
    { title: "Base64 and Hex Encoding", category: "Modern Symmetric Crypto", difficulty: "easy", points: 100, correctAnswer: "FLAG{crypto_b64_hex_e07}" },
    { title: "Hill Cipher (Small Dimension)", category: "Classical Ciphers", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_hill_m01}" },
    { title: "Double Transposition Concept", category: "Classical Ciphers", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_double_trans_m02}" },
    { title: "One-Time Pad: When Is It Secure?", category: "Post-Quantum & Advanced", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_otp_reuse_m03}" },
    { title: "Chinese Remainder Theorem in RSA Decryption", category: "Asymmetric & Key Exchange", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_crt_rsa_m04}" },
    { title: "Fast Modular Exponentiation", category: "Asymmetric & Key Exchange", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_modexp_m05}" },
    { title: "AES Modes: ECB Leakage vs CBC/CTR", category: "Modern Symmetric Crypto", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_aes_modes_m07}" },
    { title: "LFSR Stream Cipher and Berlekamp–Massey Idea", category: "Modern Symmetric Crypto", difficulty: "medium", points: 200, correctAnswer: "FLAG{crypto_lfsr_bm_m08}" },
    { title: "RSA: Small e and Padding Oracles (Concepts)", category: "Asymmetric & Key Exchange", difficulty: "hard", points: 300, correctAnswer: "FLAG{crypto_rsa_attacks_h01}" },
    { title: "Diffie–Hellman and Discrete Log Hardness", category: "Asymmetric & Key Exchange", difficulty: "hard", points: 300, correctAnswer: "FLAG{crypto_dh_dlp_h02}" },
    { title: "ElGamal Encryption and Signatures", category: "Asymmetric & Key Exchange", difficulty: "hard", points: 300, correctAnswer: "FLAG{crypto_elgamal_h03}" },
    { title: "Elliptic Curve Cryptography Essentials", category: "Asymmetric & Key Exchange", difficulty: "hard", points: 300, correctAnswer: "FLAG{crypto_ecc_basics_h04}" },
    { title: "SHA-512, HMAC, and CBC-MAC Pitfalls", category: "Hashes & MACs", difficulty: "hard", points: 300, correctAnswer: "FLAG{crypto_sha_hmac_cbcmac_h05}" },
    { title: "SHA-3 (Keccak) and Random Oracle Model", category: "Hashes & MACs", difficulty: "hard", points: 300, correctAnswer: "FLAG{crypto_sha3_rom_h06}" },
  ].forEach((r) => out.push(finalize(D.THEORY_CRYPTO, r)));

  // --- 3. System & Network Security Lab (20 hands-on labs) ---
  [
    { title: "Program vs Process and Address Space Layout", category: "Operating Systems & Access Control", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_process_memory_e01}" },
    { title: "SetUID Programs and Effective UID", category: "Operating Systems & Access Control", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_setuid_e02}" },
    { title: "Lampson Access Control Matrix (Subjects/Objects)", category: "Operating Systems & Access Control", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_acm_lampson_e03}" },
    { title: "DAC vs MAC vs RBAC", category: "Operating Systems & Access Control", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_dac_mac_rbac_e04}" },
    { title: "String Copy Bounds and Null Termination", category: "Memory & Language Safety", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_strings_c_e05}" },
    { title: "Integer Overflow and Width Promotion", category: "Memory & Language Safety", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_integer_c_e06}" },
    { title: "Dangling Pointer and Use-After-Free (Concept)", category: "Memory & Language Safety", difficulty: "easy", points: 100, correctAnswer: "FLAG{sys_uaf_concept_e07}" },
    { title: "Database Schedules and Serializable Outcomes", category: "Databases & Concurrency", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_db_schedule_m01}" },
    { title: "Two-Phase Locking and Deadlock Handling", category: "Databases & Concurrency", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_2pl_deadlock_m02}" },
    { title: "Virtual Private Database / Row-Level Security", category: "Databases & Concurrency", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_vpd_rls_m03}" },
    { title: "SELinux and AppArmor Mandatory Policies", category: "Operating Systems & Access Control", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_selinux_apparmor_m04}" },
    { title: "Hadoop Kerberos and Cluster Security", category: "Operating Systems & Access Control", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_hadoop_sec_m05}" },
    { title: "Format String Vulnerabilities (%n, %x)", category: "Memory & Language Safety", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_format_string_m06}" },
    { title: "TOCTOU File Race Conditions", category: "Concurrency & TOCTOU", difficulty: "medium", points: 200, correctAnswer: "FLAG{sys_toctou_m07}" },
    { title: "Heap Exploitation: Tcache and Metadata Abuse", category: "Memory & Language Safety", difficulty: "hard", points: 300, correctAnswer: "FLAG{sys_heap_advanced_h01}" },
    { title: "ROP and Memory Protections (NX, ASLR, PIE)", category: "Memory & Language Safety", difficulty: "hard", points: 300, correctAnswer: "FLAG{sys_rop_mitigations_h02}" },
    { title: "Android Sandbox and App Signing Model", category: "Operating Systems & Access Control", difficulty: "hard", points: 300, correctAnswer: "FLAG{sys_android_sandbox_h03}" },
    { title: "Polymorphic Malware and Static vs Dynamic Analysis", category: "Operating Systems & Access Control", difficulty: "hard", points: 300, correctAnswer: "FLAG{sys_malware_poly_h04}" },
    { title: "Honeypots for Malware Capture (Concept)", category: "Operating Systems & Access Control", difficulty: "hard", points: 300, correctAnswer: "FLAG{sys_honeypot_h05}" },
    { title: "Formal Methods: Model Checking for Protocol Bugs", category: "Concurrency & TOCTOU", difficulty: "hard", points: 300, correctAnswer: "FLAG{sys_formal_verify_h06}" },
  ].forEach((r, i) =>
    out.push(finalize(D.SYSNET_LAB, { ...r, labPath: SYSNET_LAB_PATHS[i % SYSNET_LAB_PATHS.length] }))
  );

  // --- 4. Cyber Forensics Lab (20) ---
  [
    { title: "Locard’s Exchange Principle (Digital)", category: "Forensics Process", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_locard_e01}" },
    { title: "Binary, Decimal, and Hexadecimal Conversion", category: "Disk & File Artifacts", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_number_bases_e02}" },
    { title: "ASCII vs Unicode Representation", category: "Disk & File Artifacts", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_ascii_unicode_e03}" },
    { title: "Chain of Custody Essentials", category: "Forensics Process", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_coc_e04}" },
    { title: "Write Blockers and Forensic Imaging Goals", category: "Forensics Process", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_write_block_e05}" },
    { title: "Slack Space and Unallocated Clusters", category: "Disk & File Artifacts", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_slack_unalloc_e06}" },
    { title: "IT Act 2000: Cybercrime Scope (India)", category: "Law & Ethics", difficulty: "easy", points: 100, correctAnswer: "FLAG{for_it_act2000_e07}" },
    { title: "dd Imaging and Verified Bit-Stream Copies", category: "Forensics Process", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_dd_imaging_m01}" },
    { title: "File Carving by Magic Bytes", category: "Disk & File Artifacts", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_carving_m02}" },
    { title: "Windows Registry Forensics Artifacts", category: "Disk & File Artifacts", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_registry_m03}" },
    { title: "Email Header Analysis and Hop Order", category: "Forensics Process", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_email_headers_m04}" },
    { title: "Memory Forensics with Volatility (Concepts)", category: "Forensics Process", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_volatility_m05}" },
    { title: "Network PCAP and Evidence Reconstruction", category: "Forensics Process", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_pcap_m06}" },
    { title: "IT Act 2008 Amendment: Notable Additions", category: "Law & Ethics", difficulty: "medium", points: 200, correctAnswer: "FLAG{for_it_act2008_m07}" },
    { title: "Anti-Forensics: Timestomping and Log Wiping", category: "Disk & File Artifacts", difficulty: "hard", points: 300, correctAnswer: "FLAG{for_antiforensics_h01}" },
    { title: "Steganography Detection (LSB and Statistics)", category: "Disk & File Artifacts", difficulty: "hard", points: 300, correctAnswer: "FLAG{for_stego_detect_h02}" },
    { title: "NSRL and Hash Sets in Validation", category: "Forensics Process", difficulty: "hard", points: 300, correctAnswer: "FLAG{for_nsrl_hashset_h03}" },
    { title: "Mobile Forensics: ADB and Filesystem Layout", category: "Forensics Process", difficulty: "hard", points: 300, correctAnswer: "FLAG{for_mobile_fs_h04}" },
    { title: "Incident Triage vs Full Forensic Examination", category: "Forensics Process", difficulty: "hard", points: 300, correctAnswer: "FLAG{for_triage_full_h05}" },
    { title: "IPR Violations vs Unauthorized Access (Legal)", category: "Law & Ethics", difficulty: "hard", points: 300, correctAnswer: "FLAG{for_ipr_access_h06}" },
  ].forEach((r, i) =>
    out.push(
      finalize(D.FORENSICS_LAB, {
        ...r,
        labPath: FORENSICS_LAB_PATHS[i % FORENSICS_LAB_PATHS.length],
      })
    )
  );

  // --- 5. Web Application Security (20 interactive labs) ---
  const webRows = [
    { title: "Reflected XSS Basics", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{reflected_xss_basic_001}" },
    { title: "SQL Injection Login Bypass", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{sqli_login_bypass_002}" },
    { title: "Basic CSRF Attack", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{csrf_basic_003}" },
    { title: "IDOR in User Profiles", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{idor_basic_004}" },
    { title: "Unrestricted File Upload", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{file_upload_basic_005}" },
    { title: "Command Injection Basics", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{cmd_injection_basic_006}" },
    { title: "Open Redirect and URL Validation", category: "Web & Browser Security", difficulty: "easy", points: 100, correctAnswer: "FLAG{netweb_open_redirect_e07}" },
    { title: "Stored XSS Exploitation", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{stored_xss_medium_008}" },
    { title: "UNION-Based SQL Injection", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{union_sqli_medium_009}" },
    { title: "Advanced CSRF with Token Bypass", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{csrf_advanced_010}" },
    { title: "IDOR in API Endpoints", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{idor_api_medium_011}" },
    { title: "File Upload with Filter Bypass", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{file_upload_medium_012}" },
    { title: "Command Injection with Encoding", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{cmd_injection_medium_013}" },
    { title: "JWT Token Manipulation", category: "Web & Browser Security", difficulty: "medium", points: 200, correctAnswer: "FLAG{jwt_bypass_007}" },
    { title: "DOM-Based XSS with Filter Bypass", category: "Web & Browser Security", difficulty: "hard", points: 300, correctAnswer: "FLAG{dom_xss_hard_014}" },
    { title: "Blind SQL Injection", category: "Web & Browser Security", difficulty: "hard", points: 300, correctAnswer: "FLAG{blind_sqli_hard_015}" },
    { title: "CSRF with SameSite Bypass", category: "Web & Browser Security", difficulty: "hard", points: 300, correctAnswer: "FLAG{csrf_samesite_hard_016}" },
    { title: "Complex IDOR Chain", category: "Web & Browser Security", difficulty: "hard", points: 300, correctAnswer: "FLAG{idor_chain_hard_017}" },
    { title: "Polyglot File Upload", category: "Web & Browser Security", difficulty: "hard", points: 300, correctAnswer: "FLAG{polyglot_upload_hard_018}" },
    { title: "Advanced Command Injection", category: "Web & Browser Security", difficulty: "hard", points: 300, correctAnswer: "FLAG{cmd_injection_hard_019}" },
  ];
  webRows.forEach((r, i) =>
    out.push(finalize(D.WEB_APP, { ...r, labPath: WEB_LAB_PATHS[i] }))
  );

  // --- 6. Linux System Security Lab (VM) — DAC, privilege escalation, course labs ---
  const linuxRows = [
    { title: "Linux DAC: chmod, umask, and ownership", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{linux_dac_umask_e00}" },
    { title: "SUID Binary Exploitation", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{suid_basic_115}" },
    { title: "Sudo Misconfiguration", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{sudo_basic_116}" },
    { title: "Cron Job Exploitation", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{cron_basic_117}" },
    { title: "Environment Variable Abuse", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{env_var_118}" },
    { title: "Writable /etc/passwd", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{passwd_writable_119}" },
    { title: "SUDO NOPASSWD", category: "Linux Hardening Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{sudo_nopasswd_121}" },
    { title: "Basic Kernel Exploit", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{kernel_basic_120}" },
    { title: "Advanced SUID Exploitation", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{suid_advanced_122}" },
    { title: "Sudo Command Injection", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{sudo_injection_123}" },
    { title: "Cron Job Path Injection", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{cron_path_124}" },
    { title: "LD_PRELOAD Exploitation", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{ld_preload_125}" },
    { title: "Kernel Module Exploitation", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{kernel_module_126}" },
    { title: "Capabilities Abuse", category: "Linux Hardening Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{capabilities_127}" },
    { title: "Advanced Kernel Exploitation", category: "Linux Hardening Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{kernel_advanced_128}" },
    { title: "Complex SUID Chain", category: "Linux Hardening Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{suid_chain_129}" },
    { title: "Sudo Buffer Overflow", category: "Linux Hardening Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{sudo_bof_130}" },
    { title: "Multi-Vector Privilege Escalation", category: "Linux Hardening Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{multi_vector_131}" },
    { title: "Complete System Compromise", category: "Linux Hardening Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{system_compromise_132}" },
    { title: "Advanced Linux Exploitation", category: "Linux Hardening Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{linux_advanced_133}" },
  ];
  linuxRows.forEach((r) => out.push(addVmConfig("linux", "linux", finalize(D.LINUX_VM, r))));

  // --- 7. Enterprise Directory Services Lab (VM) — Kerberos, LDAP, lateral movement ---
  const adRows = [
    { title: "Domain Enumeration Basics", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{ad_enum_basic_096}" },
    { title: "Kerberos Authentication", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{kerberos_basic_097}" },
    { title: "LDAP Query Basics", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{ldap_basic_098}" },
    { title: "NTLM Hash Extraction", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{ntlm_extract_099}" },
    { title: "User Enumeration", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{user_enum_101}" },
    { title: "Group Policy Enumeration", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{gpo_enum_102}" },
    { title: "SPN and Kerberoasting Awareness", category: "Enterprise Directory Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{ad_spn_kerberoast_e00}" },
    { title: "Basic Lateral Movement", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{lateral_basic_100}" },
    { title: "Kerberos Ticket Manipulation", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{kerberos_ticket_103}" },
    { title: "LDAP Injection", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{ldap_injection_104}" },
    { title: "NTLM Relay Attack", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{ntlm_relay_105}" },
    { title: "Advanced Lateral Movement", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{lateral_advanced_106}" },
    { title: "Pass-the-Hash Attack", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{pass_hash_107}" },
    { title: "Domain Controller Access", category: "Enterprise Directory Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{dc_access_108}" },
    { title: "Golden Ticket Attack", category: "Enterprise Directory Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{golden_ticket_109}" },
    { title: "DCSync Attack", category: "Enterprise Directory Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{dcsync_110}" },
    { title: "Advanced NTLM Attacks", category: "Enterprise Directory Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{ntlm_advanced_111}" },
    { title: "Complete Domain Compromise", category: "Enterprise Directory Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{domain_compromise_112}" },
    { title: "Kerberos Delegation Abuse", category: "Enterprise Directory Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{delegation_abuse_113}" },
    { title: "Full AD Penetration", category: "Enterprise Directory Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{ad_full_pen_114}" },
  ];
  adRows.forEach((r) => out.push(addVmConfig("ad", "ad", finalize(D.AD_VM, r))));

  // --- 8. Penetration Testing & Red Team Lab (VM) — VAPT, Metasploit-style workflow ---
  const pentestRows = [
    { title: "Footprinting vs OS Fingerprinting", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{pentest_footprint_osfp_e00}" },
    { title: "Initial Reconnaissance", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{recon_basic_134}" },
    { title: "Port Scanning Basics", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{port_scan_135}" },
    { title: "Basic Initial Access", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{initial_access_136}" },
    { title: "Simple Persistence", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{persistence_basic_137}" },
    { title: "Basic Privilege Escalation", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{priv_esc_basic_138}" },
    { title: "Simple Data Exfiltration", category: "Penetration Test Lab", difficulty: "easy", points: 100, correctAnswer: "FLAG{exfil_basic_139}" },
    { title: "Advanced Reconnaissance", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{recon_advanced_140}" },
    { title: "Multi-Vector Initial Access", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{initial_multi_141}" },
    { title: "Advanced Persistence", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{persistence_advanced_142}" },
    { title: "Complex Privilege Escalation", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{priv_esc_complex_143}" },
    { title: "Lateral Movement Techniques", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{lateral_tech_144}" },
    { title: "Stealthy Data Exfiltration", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{exfil_stealth_145}" },
    { title: "Credential Harvesting and Pivoting", category: "Penetration Test Lab", difficulty: "medium", points: 200, correctAnswer: "FLAG{credential_pivot_151}" },
    { title: "Complete Penetration Test", category: "Penetration Test Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{pentest_complete_146}" },
    { title: "Advanced Persistence Mechanisms", category: "Penetration Test Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{persistence_advanced_147}" },
    { title: "Full System Compromise", category: "Penetration Test Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{system_full_148}" },
    { title: "Advanced Lateral Movement", category: "Penetration Test Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{lateral_advanced_149}" },
    { title: "Complete Red Team Exercise", category: "Penetration Test Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{redteam_complete_150}" },
    { title: "End-to-End Red Team Operation", category: "Penetration Test Lab", difficulty: "hard", points: 300, correctAnswer: "FLAG{redteam_e2e_152}" },
  ];
  pentestRows.forEach((r) => out.push(addVmConfig("pentest", "pentest", finalize(D.PENTEST_VM, r))));

  return out;
}

async function seed(challengesOverride = null) {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex");
    console.log("Connected to MongoDB");

    await Challenge.deleteMany({});
    console.log("Cleared existing challenges");

    const challenges = challengesOverride || generateChallenges();
    await Challenge.insertMany(challenges);
    console.log(`✅ Seeded ${challenges.length} CTF challenges successfully`);

    const domainSummary = {};
    challenges.forEach((c) => {
      if (!domainSummary[c.domain]) {
        domainSummary[c.domain] = { total: 0, easy: 0, medium: 0, hard: 0 };
      }
      domainSummary[c.domain].total++;
      domainSummary[c.domain][c.difficulty]++;
    });

    console.log("\n📊 Challenge Distribution:");
    Object.keys(domainSummary)
      .sort()
      .forEach((domain) => {
        const stats = domainSummary[domain];
        console.log(`  ${domain}: ${stats.total} total (${stats.easy} easy, ${stats.medium} medium, ${stats.hard} hard)`);
      });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding challenges:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = {
  D,
  generateChallenges,
  seed,
};
