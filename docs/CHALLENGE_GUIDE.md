# CyberRangeX: Step-by-Step Guide to All 24 Challenges and 2 Scenarios

This guide walks you through solving every challenge and both scenario simulations. **Submit the exact flag** in "Your Answer" on the challenge page to earn points. Many labs auto-submit when you exploit the vulnerability.

---

## Before You Start

### 1. Start the Platform

From the **project root** (directory containing `docker-compose.yml`):

```bash
# Build frontend first (nginx serves it)
cd frontend && npm install && npm run build && cd ..

# Core stack only (nginx, backend, mongo, test-runner)
docker compose up -d --build

# Or full stack including lab VMs
docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d --build
```

On Windows you can use **`scripts\run-project.ps1`** to build frontend and start the full stack in one go.

### 2. Seed the Database (24 challenges + 2 scenarios)

```bash
docker compose exec backend npm run seed
```

### 3. (Optional) Create an admin user

```bash
docker compose exec backend npm run seed:admin
```
Login: `admin@cyberrangex.com` / `admin123`

### 4. Open the App and Log In

- Open the frontend at **http://localhost** (nginx on port 80).
- Register or log in.

### 5. Where to Go

- **Challenges tab:** All 24 challenges. Click a challenge → **Open Lab** → solve → **Submit** the flag in "Your Answer".
- **Scenario Simulations tab:** The 2 multi-challenge scenarios. Click **Start Scenario** to open the first challenge; complete each challenge in the scenario to finish it.

---

## Scenario 1: Introduction to Web Security

**Challenges:** XSS – Easy (Reflected XSS), SQL Injection – Easy (Basic SQLi)

**Goal:** Learn reflected XSS and login bypass via SQLi.

### Step-by-step

1. Go to **Challenges** → **Scenario Simulations**.
2. Find **"Introduction to Web Security"** and click **Start Scenario**.  
   → The first challenge (XSS – Easy) opens in the lab iframe.
3. **Solve XSS – Easy** (see [§ 1. XSS – Easy](#1-xss--easy-reflected-xss) below).
4. In the challenge panel, submit the flag if it wasn’t auto-submitted. Mark it complete.
5. Open **SQL Injection – Easy** from the challenges list** (or via the scenario’s next challenge if the UI links it).
6. **Solve SQL Injection – Easy** (see [§ 4. SQL Injection – Easy](#4-sql-injection--easy-basic-sqli) below).
7. Submit the flag.  
   → Scenario 1 is complete when both challenges are solved (100 + 100 XP).

---

## Scenario 2: Advanced Web Attacks

**Challenges:** SQL Injection – Medium (UNION-Based), SQL Injection – Hard (Blind SQLi)

**Goal:** Practice UNION-based data extraction and blind SQLi.

### Step-by-step

1. Go to **Challenges** → **Scenario Simulations**.
2. Find **"Advanced Web Attacks"** and click **Start Scenario**.  
   → SQL Injection – Medium opens.
3. **Solve SQL Injection – Medium** (see [§ 5. SQL Injection – Medium](#5-sql-injection--medium-union-based) below).
4. Submit the flag.
5. Open **SQL Injection – Hard** from the challenges list and **solve it** (see [§ 6. SQL Injection – Hard](#6-sql-injection--hard-blind-sqli) below).
6. Submit the flag.  
   → Scenario 2 complete (200 + 300 XP).

---

## Individual Challenges: Step-by-Step

Use **exactly** the flags listed; the backend checks against these.

---

### XSS (1–3)

#### 1. XSS – Easy: Reflected XSS  
**Flag:** `FLAG{reflected_xss_basic}`

1. Open the lab (via challenge’s **Open Lab**).
2. In the **name** (or similar) field enter:  
   `<script>alert('XSS')</script>`
3. Submit. The app reflects your input without encoding and the script runs.
4. The lab shows the flag and may auto-submit. Otherwise, copy `FLAG{reflected_xss_basic}` into **Your Answer** and submit.

---

#### 2. XSS – Medium: Stored XSS  
**Flag:** `FLAG{xss_medium_stored_exec_456}`

1. Open the lab. Find the **comment** or **message** form.
2. Post:  
   `<script>alert(document.domain)</script>`  
   (or any script that executes when rendered).
3. Reload the page. The stored script runs when comments are rendered.
4. The lab shows the flag when it detects stored XSS. Submit `FLAG{xss_medium_stored_exec_456}`.

---

#### 3. XSS – Hard: DOM-Based / Filter Bypass XSS  
**Flag:** `FLAG{dom_xss_hard}`

1. Open the lab. The app filters `script`, `onerror`, `onload` but not other event handlers.
2. Bypass with an event like `onfocus`, `onmouseover`, `onclick`, e.g.:  
   `<img src=x onfocus=alert(1) tabindex=1 autofocus>`  
   or  
   `<body onpageshow=alert(1)>`
3. Submit; the script runs. The flag may appear in the page or in a hidden element (View Source / Inspect).  
4. Submit **exactly:** `FLAG{dom_xss_hard}`.

---

### SQL Injection (4–6)

#### 4. SQL Injection – Easy: Basic SQLi  
**Flag:** `FLAG{sqli_basic_login_bypass_abc}`

1. Open the **login** form.
2. **Username:**  
   `' OR '1'='1'--`  
   or  
   `admin'--`  
   **Password:** leave blank or anything.
3. Submit. The query is broken and the password check is bypassed.
4. On success the lab shows the flag and may auto-submit. Otherwise submit `FLAG{sqli_basic_login_bypass_abc}`.

---

#### 5. SQL Injection – Medium: UNION-Based  
**Flag:** `FLAG{sqli_medium_enum_db_xyz}`

1. Find the `id` (or similar) parameter used in a query.
2. Find the number of columns with:  
   `id=1 ORDER BY 1`, `ORDER BY 2`, … until an error.
3. Use **UNION** to pull data, e.g.:  
   `id=1 UNION SELECT 1,2,3`  
   (match the column count). The lab may return the flag when the result contains `UNION` and the right columns.
4. Adjust columns until the flag appears. Submit `FLAG{sqli_medium_enum_db_xyz}`.

---

#### 6. SQL Injection – Hard: Blind SQLi  
**Flag:** `FLAG{blind_sqli_hard}`

1. In the lab, use the form that sends `id` to the **Check User** (or `/check`) logic.
2. Use **time-based** blind SQLi, e.g.:  
   `1 AND SLEEP(2)--`  
   or  
   `1' AND (SELECT SLEEP(2))--`
3. If the response is delayed (e.g. 2 seconds), the injection worked. The lab shows the flag or a success message.
4. Submit `FLAG{blind_sqli_hard}`.

---

### CSRF (7–9)

#### 7. CSRF – Easy: Basic CSRF  
**Flag:** `FLAG{csrf_basic_password_change_def}`

1. Open the lab. Find the **password change** (or similar) form with **no CSRF token**.
2. Note the `action` URL and fields (e.g. `newPassword`).
3. Create an HTML file:
   ```html
   <form id="f" action="http://localhost:5000/lab/csrf-basic/change" method="POST">
     <input name="newPassword" value="pwned" />
   </form>
   <script>document.getElementById('f').submit();</script>
   ```
4. Adjust the port/host if your backend is elsewhere. Serve the file (e.g. `python -m http.server 8000`) and open it in a browser where you are “logged in” to the lab (same session/cookies).
5. The form auto-submits and triggers the password change. The lab shows the flag. Submit `FLAG{csrf_basic_password_change_def}`.

---

#### 8. CSRF – Medium: Token Bypass  
**Flag:** `FLAG{csrf_token_bypass}`

1. The form has a CSRF token. Inspect how it is generated and validated (cookie, body, same-origin, etc.).
2. Try: omitting the token, reusing a token, or using a token from another session. If the token is in a cookie and Referer checks are weak, a same-site page might succeed.
3. When you trigger the sensitive action, the lab shows the flag. Submit `FLAG{csrf_token_bypass}`.

---

#### 9. CSRF – Hard: Advanced CSRF  
**Flag:** `FLAG{csrf_advanced_hard}`

1. There are several controls (tokens, headers, SameSite, etc.). Review each.
2. Look for: SameSite misconfigurations, custom headers that can be sent from a malicious page, or chaining with XSS to get a valid token.
3. Perform the sensitive action and submit `FLAG{csrf_advanced_hard}`.

---

### IDOR (10–12)

#### 10. IDOR – Easy: Basic IDOR  
**Flag:** `FLAG{idor_basic_unauthorized_access_mno}`

1. You see a profile or resource tied to `userId`, `id`, etc. You start as one user (e.g. `userId=2`).
2. Change to `userId=1` (or another ID) in the URL or request.
3. Load the page. You see another user’s data and the flag. Submit `FLAG{idor_basic_unauthorized_access_mno}`.

---

#### 11. IDOR – Medium: Parameter Manipulation  
**Flag:** `FLAG{idor_parameter_manipulation}`

1. IDs may be encoded (base64, hex) or in another parameter. Decode, increment, or brute-force.
2. Try several parameters together. Use the revealed flag: `FLAG{idor_parameter_manipulation}`.

---

#### 12. IDOR – Hard: Complex IDOR  
**Flag:** `FLAG{idor_complex_hard}`

1. There may be extra checks (role, path, referer). Try indirect references or chained IDs.
2. Test for race conditions (e.g. two requests that change then read an object).
3. Submit `FLAG{idor_complex_hard}` when you reach the restricted resource.

---

### File Upload (13–15)

#### 13. File Upload – Easy: Basic Upload  
**Flag:** `FLAG{file_upload_basic_malicious_vwx}`

1. The lab allows uploads with little or no validation.
2. Upload a file considered “malicious”: e.g. `.php`, `.jsp`, `.asp`, or a filename containing `shell`. A simple `.php` or `shell.txt` is enough; the lab may give the flag for any upload.
3. After upload you get a success page with the flag. Submit `FLAG{file_upload_basic_malicious_vwx}`.

---

#### 14. File Upload – Medium: MIME Bypass  
**Flag:** `FLAG{mime_bypass_medium}`

1. The server may check `Content-Type` (e.g. only `image/*`). Upload with `Content-Type: image/png` but executable content, or add magic bytes (e.g. `GIF89a`) at the start of a PHP-like file.
2. If it checks extension, try `.php.jpg`, `.phtml`, or `shell.php%00.jpg` (null byte) if the backend is vulnerable.
3. Execute the uploaded file or trigger the success path and obtain the flag. Submit `FLAG{mime_bypass_medium}`.

---

#### 15. File Upload – Hard: Advanced Bypass  
**Flag:** `FLAG{file_upload_advanced}`

1. Combine extension, MIME, and magic-byte bypasses. Try `.phar`, `.php5`, or `.htaccess` to enable execution.
2. Get the success/execute path and locate the flag. Submit `FLAG{file_upload_advanced}`.

---

### Command Injection (16–18)

#### 16. Command Injection – Easy: Basic Injection  
**Flag:** `FLAG{command_injection_basic_os_cmd_efg}`

1. There is a field passed to a shell command (e.g. ping, nslookup).
2. Try:  
   `8.8.8.8; cat /etc/passwd`  
   or  
   `8.8.8.8 && whoami`  
   or  
   `` 8.8.8.8`id` ``
3. When you see command output or a success message, use a payload to read the flag (e.g. as indicated in the lab). Submit `FLAG{command_injection_basic_os_cmd_efg}`.

---

#### 17. Command Injection – Medium: Filter Bypass  
**Flag:** `FLAG{command_injection_bypass}`

1. The app blocks spaces, `;`, `|`, etc. Bypass with:  
   `$IFS`, `<`, `{cat,/etc/passwd}`, or base64:  
   `echo d2hvYW1p|base64 -d|sh`  
   or `$()` and environment variables.
2. Run commands and read the flag. Submit `FLAG{command_injection_bypass}`.

---

#### 18. Command Injection – Hard: Advanced Injection  
**Flag:** `FLAG{command_injection_advanced}`

1. Use encoding, quoting, and globs to bypass filters (e.g. hex, base64, or `$'\\x2f'`-style escapes).
2. If direct output is blocked, use time-based or out-of-band if the lab supports it. Submit `FLAG{command_injection_advanced}`.

---

### Authentication Bypass (19–21)

#### 19. Authentication Bypass – Easy: Weak Login  
**Flag:** `FLAG{auth_bypass_basic_weak_validation_nop}`

1. **If the lab uses SQLi:** use `' OR '1'='1'--` in the username (password optional) to bypass login, then open the admin area.
2. **If it uses weak validation:** try `admin` / `admin123`, or type-coercion tricks like `0` / `"0"`.
3. When you reach the admin or success page, the lab shows the flag. Submit `FLAG{auth_bypass_basic_weak_validation_nop}`.

---

#### 20. Authentication Bypass – Medium: Weak Session  
**Flag:** `FLAG{weak_session_bypass}`

1. Inspect cookies or session tokens. If they are sequential or predictable, try other values.
2. Check whether logout really invalidates the session. Try reusing an old token or session fixation.
3. Use the lab’s intended session bypass and submit `FLAG{weak_session_bypass}`.

---

#### 21. Authentication Bypass – Hard: JWT Manipulation  
**Flag:** `FLAG{jwt_bypass_hard}`

1. Get a JWT from the cookie or `Authorization` header. Decode at [jwt.io](https://jwt.io).
2. Try **alg: none** (and remove the signature), or **alg: HS256** with the public key as the secret (key confusion).
3. Change `role` or `admin` in the payload, re-encode, and use the new token. Submit `FLAG{jwt_bypass_hard}`.

---

### Forensics (22–24)

#### 22. Forensics – Easy: Log Analysis / Hidden Flag  
**Flag:** `FLAG{forensics_basic_hidden_flag_wxy}`

1. **If the lab provides log files:** search for odd status codes, IPs, or URLs, and for `FLAG{...}`.
2. **If it’s “hidden flag in page”:** use **View Source (Ctrl+U)** or **Inspect Element**. Check HTML comments (`<!-- ... -->`), hidden `div`s, and inline scripts. The flag is in a comment or in a `display:none`-style element.
3. Submit `FLAG{forensics_basic_hidden_flag_wxy}`.

---

#### 23. Forensics – Medium: Memory Dump  
**Flag:** `FLAG{memory_dump_medium}`

1. The lab gives a memory dump or a file that simulates one. Use `strings`, `grep`, or a hex editor to search for `FLAG{`, paths, or keywords.
2. Correlate processes, handles, or network data if the format allows. Submit `FLAG{memory_dump_medium}`.

---

#### 24. Forensics – Hard: Advanced Analysis  
**Flag:** `FLAG{forensics_advanced_hard}`

1. Use several artifacts (logs, memory, PCAP, files). Match timestamps and events.
2. Look for encoding, steganography, or hidden partitions. Decode or extract the flag and submit `FLAG{forensics_advanced_hard}`.

---

## Quick Reference: Exact Flags to Submit

| # | Challenge | Flag |
|---|-----------|------|
| 1 | XSS Easy | `FLAG{reflected_xss_basic}` |
| 2 | XSS Medium | `FLAG{xss_medium_stored_exec_456}` |
| 3 | XSS Hard | `FLAG{dom_xss_hard}` |
| 4 | SQLi Easy | `FLAG{sqli_basic_login_bypass_abc}` |
| 5 | SQLi Medium | `FLAG{sqli_medium_enum_db_xyz}` |
| 6 | SQLi Hard | `FLAG{blind_sqli_hard}` |
| 7 | CSRF Easy | `FLAG{csrf_basic_password_change_def}` |
| 8 | CSRF Medium | `FLAG{csrf_token_bypass}` |
| 9 | CSRF Hard | `FLAG{csrf_advanced_hard}` |
| 10 | IDOR Easy | `FLAG{idor_basic_unauthorized_access_mno}` |
| 11 | IDOR Medium | `FLAG{idor_parameter_manipulation}` |
| 12 | IDOR Hard | `FLAG{idor_complex_hard}` |
| 13 | File Upload Easy | `FLAG{file_upload_basic_malicious_vwx}` |
| 14 | File Upload Medium | `FLAG{mime_bypass_medium}` |
| 15 | File Upload Hard | `FLAG{file_upload_advanced}` |
| 16 | Command Injection Easy | `FLAG{command_injection_basic_os_cmd_efg}` |
| 17 | Command Injection Medium | `FLAG{command_injection_bypass}` |
| 18 | Command Injection Hard | `FLAG{command_injection_advanced}` |
| 19 | Auth Bypass Easy | `FLAG{auth_bypass_basic_weak_validation_nop}` |
| 20 | Auth Bypass Medium | `FLAG{weak_session_bypass}` |
| 21 | Auth Bypass Hard | `FLAG{jwt_bypass_hard}` |
| 22 | Forensics Easy | `FLAG{forensics_basic_hidden_flag_wxy}` |
| 23 | Forensics Medium | `FLAG{memory_dump_medium}` |
| 24 | Forensics Hard | `FLAG{forensics_advanced_hard}` |

---

## Architecture (Are Challenges Containerized?)

**No.** All 24 labs run as Express routes inside the **single backend container**. Labs are mounted at paths like `/lab/xss-basic`, `/lab/sqli-basic`, `/lab/file-upload-basic`, etc. There are no separate containers or VMs per challenge.

---

## Tips

- **Base URL:** The lab and API usually share the same origin (e.g. `http://localhost:5000`). Use the correct host/port when crafting exploits (e.g. CSRF `action`).
- **Flags:** Submit the exact string (e.g. `FLAG{...}`). The backend compares case-insensitively after trim.
- **Scenarios:** Solve each challenge in the scenario; “Start Scenario” opens the first. You can also open any challenge from the main **Challenges** list.
- **Hints:** Use in-app hints and the “How to approach” section when stuck.
