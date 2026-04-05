require("dotenv").config();
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const Scenario = require("../models/Scenario");

const challenges = [
  // XSS
  {
    title: "XSS – Easy: Reflected XSS",
    category: "XSS",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit a reflected XSS vulnerability in the lab environment. The application reflects user input without proper sanitization. Inject a script payload to execute JavaScript and retrieve the flag.",
    points: 100,
    correctAnswer: "FLAG{reflected_xss_basic}",
    hints: [
      "Try injecting script tags in the name parameter.",
      "Look for where user input is displayed without encoding.",
      "Use alert() or document.cookie to test XSS execution.",
    ],
    labPath: "/lab/xss-basic",
  },
  {
    title: "XSS – Medium: Stored XSS",
    category: "XSS",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Exploit a stored XSS vulnerability where malicious scripts persist in the database. Submit a payload that gets stored and executed when other users view the content. Find the flag after successful exploitation.",
    points: 200,
    correctAnswer: "FLAG{xss_medium_stored_exec_456}",
    hints: [
      "Look for comment or message submission forms.",
      "Your payload needs to persist in the database.",
      "Check if the stored content is rendered without sanitization.",
    ],
    labPath: "/lab/xss-medium",
  },
  {
    title: "XSS – Hard: DOM-Based XSS",
    category: "XSS",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit a DOM-based XSS vulnerability that occurs entirely in the browser. The server doesn't see the malicious payload, but client-side JavaScript processes it unsafely. Analyze the DOM manipulation and craft a payload.",
    points: 300,
    correctAnswer: "FLAG{dom_xss_hard}",
    hints: [
      "Check how URL fragments or hash values are used.",
      "Look for eval(), innerHTML, or document.write() usage.",
      "The vulnerability happens entirely client-side.",
    ],
    labPath: "/lab/xss-hard",
  },
  // SQL Injection
  {
    title: "SQL Injection – Easy: Basic SQLi",
    category: "SQL Injection",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit a basic SQL injection vulnerability in the login form. Bypass authentication by injecting SQL payloads that manipulate the query logic. Access the admin panel to retrieve the flag.",
    points: 100,
    correctAnswer: "FLAG{sqli_basic_login_bypass_abc}",
    hints: [
      "Try ' OR '1'='1 in the username field.",
      "Use comment characters (-- or #) to bypass password check.",
      "Look for error messages that reveal SQL syntax.",
    ],
    labPath: "/lab/sqli-basic",
  },
  {
    title: "SQL Injection – Medium: UNION-Based",
    category: "SQL Injection",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Exploit a UNION-based SQL injection to extract data from other tables. Determine the number of columns, identify data types, and retrieve sensitive information including the flag from the database.",
    points: 200,
    correctAnswer: "FLAG{sqli_medium_enum_db_xyz}",
    hints: [
      "Use ORDER BY to find the number of columns.",
      "Construct UNION SELECT statements with matching column types.",
      "Check information_schema tables to find table and column names.",
    ],
    labPath: "/lab/sqli-medium",
  },
  {
    title: "SQL Injection – Hard: Blind SQLi",
    category: "SQL Injection",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit a blind SQL injection where you don't see query results directly. Use time-based or boolean-based techniques to extract the flag character by character. This requires patience and systematic enumeration.",
    points: 300,
    correctAnswer: "FLAG{blind_sqli_hard}",
    hints: [
      "Use SLEEP() or WAITFOR DELAY for time-based attacks.",
      "Construct boolean conditions that change response time.",
      "Extract data character by character using SUBSTRING() and ASCII().",
    ],
    labPath: "/lab/sqli-hard",
  },
  // CSRF
  {
    title: "CSRF – Easy: Basic CSRF",
    category: "CSRF",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit a Cross-Site Request Forgery vulnerability to perform unauthorized actions. Craft a malicious HTML page that tricks a logged-in user into submitting a request. Change the admin password or perform another sensitive action.",
    points: 100,
    correctAnswer: "FLAG{csrf_basic_password_change_def}",
    hints: [
      "Create an HTML form that submits to the target endpoint.",
      "Use auto-submit JavaScript to trigger the form.",
      "The victim must be logged in when they visit your page.",
    ],
    labPath: "/lab/csrf-basic",
  },
  {
    title: "CSRF – Medium: Token Bypass",
    category: "CSRF",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Bypass CSRF token protection by exploiting token validation weaknesses. Analyze how tokens are generated and validated, then craft a request that bypasses the protection mechanism.",
    points: 200,
    correctAnswer: "FLAG{csrf_token_bypass}",
    hints: [
      "Check if tokens are tied to the session properly.",
      "Look for token reuse or weak validation logic.",
      "Try removing the token or using a token from another session.",
    ],
    labPath: "/lab/csrf-medium",
  },
  {
    title: "CSRF – Hard: Advanced CSRF",
    category: "CSRF",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit a complex CSRF scenario with multiple protection layers. Combine CSRF with other vulnerabilities or exploit edge cases in token validation. Perform a sensitive action to retrieve the flag.",
    points: 300,
    correctAnswer: "FLAG{csrf_advanced_hard}",
    hints: [
      "Look for SameSite cookie misconfigurations.",
      "Check if custom headers can be bypassed.",
      "Consider combining CSRF with XSS for more powerful attacks.",
    ],
    labPath: "/lab/csrf-hard",
  },
  // IDOR
  {
    title: "IDOR – Easy: Basic IDOR",
    category: "IDOR",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit an Insecure Direct Object Reference vulnerability by manipulating object identifiers in URLs or requests. Access resources belonging to other users by changing IDs in the request.",
    points: 100,
    correctAnswer: "FLAG{idor_basic_unauthorized_access_mno}",
    hints: [
      "Try changing user IDs in URLs (e.g., /user/1 to /user/2).",
      "Look for sequential IDs or predictable patterns.",
      "Check API endpoints that use IDs to fetch resources.",
    ],
    labPath: "/lab/idor-basic",
  },
  {
    title: "IDOR – Medium: Parameter Manipulation",
    category: "IDOR",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Exploit IDOR by manipulating multiple parameters or using encoded/hashed identifiers. Decode or predict object references to access unauthorized resources and retrieve sensitive data.",
    points: 200,
    correctAnswer: "FLAG{idor_parameter_manipulation}",
    hints: [
      "Look for base64-encoded or hashed IDs.",
      "Try manipulating multiple parameters simultaneously.",
      "Check if IDs follow predictable patterns (UUIDs, timestamps, etc.).",
    ],
    labPath: "/lab/idor-medium",
  },
  {
    title: "IDOR – Hard: Complex IDOR",
    category: "IDOR",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit a complex IDOR scenario with multiple layers of access control. Bypass validation checks and manipulate object references to access privileged resources and retrieve the flag.",
    points: 300,
    correctAnswer: "FLAG{idor_complex_hard}",
    hints: [
      "Combine IDOR with other vulnerabilities if needed.",
      "Look for indirect object references or chained lookups.",
      "Check for race conditions or timing-based bypasses.",
    ],
    labPath: "/lab/idor-hard",
  },
  // File Upload
  {
    title: "File Upload – Easy: Basic Upload",
    category: "File Upload",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit a file upload vulnerability by uploading a malicious file (web shell). Bypass basic file type restrictions and execute code on the server to retrieve the flag.",
    points: 100,
    correctAnswer: "FLAG{file_upload_basic_malicious_vwx}",
    hints: [
      "Try uploading a PHP web shell (.php file).",
      "Bypass extension checks by using double extensions (.php.jpg).",
      "Look for upload directories and execute your uploaded file.",
    ],
    labPath: "/lab/file-upload-basic",
  },
  {
    title: "File Upload – Medium: MIME Bypass",
    category: "File Upload",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Bypass MIME type validation to upload executable files. Manipulate Content-Type headers or use other techniques to trick the server into accepting malicious files.",
    points: 200,
    correctAnswer: "FLAG{mime_bypass_medium}",
    hints: [
      "Change the Content-Type header to image/jpeg or image/png.",
      "Try magic bytes manipulation (file signatures).",
      "Look for client-side validation that can be bypassed.",
    ],
    labPath: "/lab/file-upload-medium",
  },
  {
    title: "File Upload – Hard: Advanced Bypass",
    category: "File Upload",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit a file upload vulnerability with multiple protection layers. Combine various bypass techniques to upload and execute a web shell, then retrieve the flag from the server.",
    points: 300,
    correctAnswer: "FLAG{file_upload_advanced}",
    hints: [
      "Try null byte injection (%00) in filenames.",
      "Use alternative file extensions (.phtml, .php5, etc.).",
      "Combine multiple bypass techniques for layered protections.",
    ],
    labPath: "/lab/file-upload-hard",
  },
  // Command Injection
  {
    title: "Command Injection – Easy: Basic Injection",
    category: "Command Injection",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit a command injection vulnerability where user input is passed directly to system commands. Inject command separators to execute arbitrary commands and retrieve the flag.",
    points: 100,
    correctAnswer: "FLAG{command_injection_basic_os_cmd_efg}",
    hints: [
      "Try command separators: ; && || `",
      "Use $(command) or `command` for command substitution.",
      "Look for ping, nslookup, or other command-based features.",
    ],
    labPath: "/lab/command-injection-basic",
  },
  {
    title: "Command Injection – Medium: Filter Bypass",
    category: "Command Injection",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Bypass command injection filters by using encoding, obfuscation, or alternative command syntax. Execute commands despite input filtering to retrieve the flag.",
    points: 200,
    correctAnswer: "FLAG{command_injection_bypass}",
    hints: [
      "Try URL encoding, base64 encoding, or hex encoding.",
      "Use environment variables ($PATH, $HOME) to bypass filters.",
      "Try alternative command syntax or command chaining.",
    ],
    labPath: "/lab/command-injection-medium",
  },
  {
    title: "Command Injection – Hard: Advanced Injection",
    category: "Command Injection",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit a complex command injection scenario with multiple filters and restrictions. Use advanced techniques to execute commands and retrieve the flag from the system.",
    points: 300,
    correctAnswer: "FLAG{command_injection_advanced}",
    hints: [
      "Combine multiple encoding techniques.",
      "Use wildcards and globbing to bypass filters.",
      "Try time-based techniques if direct output is blocked.",
    ],
    labPath: "/lab/command-injection-hard",
  },
  // Authentication Bypass
  {
    title: "Authentication Bypass – Easy: Weak Login",
    category: "Authentication Bypass",
    domain: "Networking & Web Application Security",
    difficulty: "easy",
    description: "Exploit weak login validation in the lab. Bypass or satisfy the checks to access the admin area and retrieve the flag.",
    points: 100,
    correctAnswer: "FLAG{auth_bypass_basic_weak_validation_nop}",
    hints: [
      "Use ' OR '1'='1 in username field.",
      "Comment out the password check with -- or #.",
      "Try logging in as admin or the first user.",
    ],
    labPath: "/lab/auth-bypass-basic",
  },
  {
    title: "Authentication Bypass – Medium: Weak Session",
    category: "Authentication Bypass",
    domain: "Networking & Web Application Security",
    difficulty: "medium",
    description: "Exploit weak session management to bypass authentication. Predict, forge, or hijack session tokens to gain unauthorized access and retrieve the flag.",
    points: 200,
    correctAnswer: "FLAG{weak_session_bypass}",
    hints: [
      "Look for predictable or sequential session IDs.",
      "Check if sessions are properly invalidated on logout.",
      "Try session fixation or session hijacking techniques.",
    ],
    labPath: "/lab/auth-bypass-medium",
  },
  {
    title: "Authentication Bypass – Hard: JWT Manipulation",
    category: "Authentication Bypass",
    domain: "Networking & Web Application Security",
    difficulty: "hard",
    description: "Exploit JWT (JSON Web Token) vulnerabilities to bypass authentication. Manipulate token claims, bypass signature verification, or exploit algorithm confusion to gain admin access.",
    points: 300,
    correctAnswer: "FLAG{jwt_bypass_hard}",
    hints: [
      "Try changing the algorithm to 'none'.",
      "Look for weak secret keys or key confusion attacks.",
      "Manipulate claims like 'admin' or 'role' in the payload.",
    ],
    labPath: "/lab/auth-bypass-hard",
  },
  // Forensics
  {
    title: "Forensics – Easy: Log Analysis",
    category: "Forensics",
    domain: "Cyber Forensics & Cyber Law",
    difficulty: "easy",
    description: "Analyze log files to find evidence of an attack. Examine web server logs, access logs, or application logs to identify suspicious activity and extract the flag.",
    points: 100,
    correctAnswer: "FLAG{forensics_basic_hidden_flag_wxy}",
    hints: [
      "Look for unusual HTTP status codes (404, 500, etc.).",
      "Search for common attack patterns in URLs.",
      "Check timestamps and IP addresses for anomalies.",
    ],
    labPath: "/lab/forensics-basic",
  },
  {
    title: "Forensics – Medium: Memory Dump",
    category: "Forensics",
    domain: "Cyber Forensics & Cyber Law",
    difficulty: "medium",
    description: "Analyze a memory dump to find malware or extract sensitive information. Use forensic tools to examine the memory image and locate the flag hidden within.",
    points: 200,
    correctAnswer: "FLAG{memory_dump_medium}",
    hints: [
      "Look for strings, processes, or network connections.",
      "Search for suspicious file paths or registry keys.",
      "Use grep or strings command to search for flag patterns.",
    ],
    labPath: "/lab/forensics-medium",
  },
  {
    title: "Forensics – Hard: Advanced Analysis",
    category: "Forensics",
    domain: "Cyber Forensics & Cyber Law",
    difficulty: "hard",
    description: "Perform advanced forensic analysis on multiple artifacts. Correlate evidence from logs, memory dumps, network captures, and file systems to reconstruct the attack and find the flag.",
    points: 300,
    correctAnswer: "FLAG{forensics_advanced_hard}",
    hints: [
      "Correlate timestamps across different artifacts.",
      "Look for encoded or obfuscated data.",
      "Check for steganography or hidden data in images.",
    ],
    labPath: "/lab/forensics-hard",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex");
    console.log("Connected to MongoDB");

    await Challenge.deleteMany({});
    console.log("Cleared existing challenges");
    await Scenario.deleteMany({});
    console.log("Cleared existing scenarios");

    await Challenge.insertMany(challenges);
    console.log(`Seeded ${challenges.length} challenges successfully`);

    const allChallenges = await Challenge.find({});
    const xssChallenges = allChallenges.filter((c) => c.category === "XSS").map((c) => c._id);
    const sqliChallenges = allChallenges.filter((c) => c.category === "SQL Injection").map((c) => c._id);

    const scenariosToSeed = [
      {
        title: "Introduction to Web Security",
        description: "Real-life scenario: a small company’s web app has a reflected XSS on the guestbook and a login form vulnerable to SQL injection. Your goal: (1) exploit the XSS in the lab, (2) bypass the login with SQLi and access the admin area. Solve both challenges in order to complete the scenario.",
        challenges: [xssChallenges[0], sqliChallenges[0]].filter(Boolean),
        rewards: { xpBonus: 50 },
      },
      {
        title: "Advanced Web Attacks",
        description: "Real-life scenario: the same app exposes a user lookup (UNION SQLi) and a search that is vulnerable to blind SQLi. Extract the secret via UNION, then extract the flag from the blind injection. Complete both challenges to finish the scenario.",
        challenges: [sqliChallenges[1], sqliChallenges[2]].filter(Boolean),
        rewards: { xpBonus: 100 },
      },
    ];

    await Scenario.insertMany(scenariosToSeed);
    console.log(`Seeded ${scenariosToSeed.length} scenarios successfully`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding challenges:", error);
    process.exit(1);
  }
}

seed();
