import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";
import { AuthContext } from "../../auth/AuthContext";
import "./challengeLab.css";

function getApproachText(challenge) {
  if (!challenge) return "";

  const { category, difficulty } = challenge;
  const isHardBase64 =
    difficulty === "hard" &&
    typeof challenge.description === "string" &&
    challenge.description.toLowerCase().includes("base64");

  if (isHardBase64) {
    return "Identify that this is a Base64 decoding task. Copy the string into a Base64 decoder (or use a command-line tool), decode it, then normalize the result to lowercase as requested before submitting.";
  }

  switch (category) {
    case "XSS":
      if (difficulty === "easy") {
        return "Exploit the reflected XSS vulnerability in the lab. Inject a script payload in the name parameter. Once you see the flag displayed, copy it exactly (including FLAG{...}) and submit it.";
      }
      if (difficulty === "medium") {
        return "Recall what the XSS acronym expands to and format it exactly as requested (hyphen-separated, lowercase). Pay attention to spelling and separators.";
      }
      return "For harder XSS challenges, carefully follow the instructions about decoding or formatting. Think about typical XSS types (reflected, stored, DOM-based) and how the challenge text hints at them.";

    case "SQL Injection":
      if (difficulty === "easy") {
        return "Think about what SQL stands for. Submit the three-letter abbreviation in lowercase as requested.";
      }
      if (difficulty === "medium") {
        return "Focus on what UNION-based injections allow you to do in SQL. Identify the missing verb in the sentence and submit just that word in lowercase.";
      }
      return "For harder SQL Injection challenges, decode any encoded text first and then relate it to common SQLi techniques such as UNION, error-based, or blind SQLi before submitting.";

    case "CSRF":
      if (difficulty === "easy") {
        return "Recall the full form of CSRF and extract the acronym from it. Submit the four letters in lowercase.";
      }
      if (difficulty === "medium") {
        return "Pay attention to the phrase 'Request Forgery'. The key noun that describes the attack is your answer, normalized to lowercase.";
      }
      return "For harder CSRF challenges, expect to decode a helper string or think about CSRF protections like tokens. Decode first, then normalize the result as instructed.";

    case "IDOR":
      if (difficulty === "easy") {
        return "Remember what IDOR stands for and provide the four-letter acronym in lowercase.";
      }
      if (difficulty === "medium") {
        return "Think about what is being changed in the URL or request (for example, IDs or identifiers). The description hints at a short plural noun to submit.";
      }
      return "For hard IDOR challenges, decode any encoded identifier name and relate it to accessing unauthorized resources before entering the final value.";

    case "File Upload":
      if (difficulty === "easy") {
        return "Think of the most common server-side extension used for web shells in examples. Submit only the three-letter extension.";
      }
      if (difficulty === "medium") {
        return "Consider which metadata field (content type) is checked during file uploads. The missing word is the common four-letter term for that type.";
      }
      return "For hard file upload challenges, decode the provided string and treat the decoded phrase as the value to submit, following any formatting instructions.";

    case "Command Injection":
      if (difficulty === "easy") {
        return "Remember the standard abbreviation for the operating system. Submit those two letters in lowercase.";
      }
      if (difficulty === "medium") {
        return "The phrase '_____ injection' points directly to the missing word. Replace the blank with the type of injection described by the category.";
      }
      return "For hard command injection tasks, decode the short encoded string first and then submit the decoded acronym in lowercase.";

    case "Authentication Bypass":
      if (difficulty === "easy") {
        return "Recall what JSON Web Token is shortened to. Submit that three-letter acronym in lowercase.";
      }
      if (difficulty === "medium") {
        return "Think about what is being validated during login. The missing word is a singular form related to usernames and passwords.";
      }
      return "For the hard challenge, decode the encoded phrase for a well-known attack related to sessions, then submit it in the exact lowercase/underscore format requested.";

    case "Forensics":
      if (difficulty === "easy") {
        return "Consider what basic format log files are usually stored in. The missing word is the simple format type.";
      }
      if (difficulty === "medium") {
        return "Focus on what kind of dump you analyze to find malware in RAM. The missing word is the type of dump being analyzed.";
      }
      return "For hard forensics tasks, decode the provided string, then normalize the decoded word (which matches the category name) before submitting.";

    default:
      return "Read the description slowly and pay attention to any words in ALL CAPS or explicit instructions about formatting. Use the hints if you get stuck, then enter exactly what is requested.";
  }
}

export default function ChallengeLab() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);

  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [verificationToken, setVerificationToken] = useState(null); // Store verification token
  const [vmStatus, setVmStatus] = useState(null); // Docker VM container status (running/stopped)
  /** Server-issued one-time VM attestation (shown in unlock command; VM calls back to allow submit) */
  const [vmAttest, setVmAttest] = useState(null);

  // Build lab URL if labPath exists
  // Labs are served from /lab. In development, /lab is proxied to backend by setupProxy.
  const getLabBaseUrl = () => {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev && typeof window !== "undefined") {
      return window.location.origin;
    }
    const apiBase = api.defaults.baseURL || "";
    if (apiBase.includes("/api")) return apiBase.replace("/api", "").replace(/\/$/, "");
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:5000";
  };

  const fetchChallenge = async () => {
    try {
      if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
        setChallenge(null);
        setMessage("Invalid challenge link. Open the challenge from the CTF list.");
        return;
      }
      setLoading(true);
      const res = await api.get(`/challenges/${id}`);
      setChallenge(res.data);
      // Clear reveal state when switching challenges
      setVerificationToken(null);
      setVmAttest(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setMessage("Challenge not found. This link is outdated after database refresh. Open it again from the CTF list.");
      } else {
        toast.error("Failed to load challenge");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const revealFlagAfterVerification = async (tokenToUse) => {
    if (!tokenToUse) return;
    try {
      const res = await api.post(`/challenges/${id}/reveal`, { verificationToken: tokenToUse });
      if (res.data?.flag) {
        setAnswer(res.data.flag); // Auto-fill so user can submit immediately
      }
    } catch (err) {
      // If reveal fails, user can still manually submit the correct flag later.
      console.warn("Reveal flag failed:", err?.response?.data?.msg || err.message);
    }
  };

  const handleAutoSubmit = async (flag, verificationToken) => {
    try {
      const res = await api.post(`/challenges/${id}/submit`, { 
        answer: flag,
        verificationToken: verificationToken 
      });

      if (res.data.status === "correct") {
        setMessage("Challenge solved! Points awarded automatically.");
        toast.success(`Challenge completed! +${res.data.xpAwarded} XP`);
        if (typeof refreshUser === "function") refreshUser();
        fetchChallenge();
      } else if (res.data.status === "completed") {
        setMessage("Challenge already completed.");
        toast.info("You've already completed this challenge.");
      } else {
        setMessage(res.data.msg || "Incorrect flag.");
        toast.error(res.data.msg || "Incorrect flag.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Error submitting flag.";
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  useEffect(() => {
    fetchChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Listen for completion messages from lab iframe
  useEffect(() => {
    if (!challenge?.labPath) return;

    const handleMessage = async (event) => {
      // Security: Only accept messages from same origin (our backend)
      const labBaseUrl = getLabBaseUrl();
      const eventOrigin = event.origin;
      const expectedOrigin = labBaseUrl.replace(/\/$/, "");

      // More lenient origin check - allow same protocol and host
      const originHost = new URL(eventOrigin).host;
      const expectedHost = new URL(expectedOrigin).host;

      if (originHost !== expectedHost) {
        console.warn("Rejected message from unauthorized origin:", eventOrigin);
        return;
      }

      // Generic lab-ready message: store verification token only (no auto-submit)
      if (event.data && event.data.type === "LAB_READY" && event.data.challengeId === id) {
        const token = event.data.verificationToken;
        console.log('[ChallengeLab] Received LAB_READY message:', { token, challengeId: event.data.challengeId });
        if (token) {
          console.log('[ChallengeLab] Storing verification token from LAB_READY:', token);
          setVerificationToken(token);
          revealFlagAfterVerification(token);
        } else {
          console.warn('[ChallengeLab] LAB_READY message without token');
        }
        return;
      }

      if (event.data && event.data.type === "CHALLENGE_SOLVED" && event.data.challengeId === id) {
        const flag = event.data.flag || event.data.answer;
        const token = event.data.verificationToken;
        console.log('[ChallengeLab] Received CHALLENGE_SOLVED message:', { flag, token, challengeId: event.data.challengeId });
        if (flag) {
          // Store token from lab
          if (token) {
            console.log('[ChallengeLab] Storing verification token:', token);
            setVerificationToken(token);
          } else {
            console.warn('[ChallengeLab] No verification token received from lab!');
          }
          // Automatically submit the flag with verification token
          setAnswer(flag);
          await handleAutoSubmit(flag, token);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, id]);

  // Fetch VM container status when challenge is a VM challenge (hooks must run unconditionally)
  useEffect(() => {
    if (!challenge?.vmConfig?.enabled || !challenge?.domain) {
      setVmStatus(null);
      return;
    }
    const domainSlugMap = {
      "Enterprise Directory Services Lab (VM)": "ad",
      "Linux System Security Lab (VM)": "linux",
      "Penetration Testing & Red Team Lab (VM)": "pentest",
    };
    const domain = domainSlugMap[challenge.domain];
    const difficulty = challenge.difficulty || "easy";
    if (!domain) return;
    api.get(`/vm/status/${domain}/${difficulty}`)
      .then((res) => setVmStatus(res.data?.status ?? null))
      .catch(() => setVmStatus("stopped"));
  }, [challenge?.vmConfig?.enabled, challenge?.domain, challenge?.difficulty]);

  useEffect(() => {
    if (!challenge?.vmConfig?.enabled || !id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      setVmAttest(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/challenges/${id}/vm-attest`)
      .then((res) => {
        if (!cancelled) setVmAttest(res.data);
      })
      .catch(() => {
        if (!cancelled) setVmAttest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [challenge?.vmConfig?.enabled, challenge?._id, id]);

  const submitAnswer = async () => {
    if (!answer.trim()) {
      setMessage("Please enter your answer.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const token = challenge?.vmConfig?.enabled ? null : verificationToken;
      const res = await api.post(`/challenges/${id}/submit`, {
        answer,
        ...(token ? { verificationToken: token } : {}),
      });

      if (res.data.status === "correct") {
        setMessage("Correct! Reward granted.");
        toast.success(`${res.data.msg} +${res.data.xpAwarded} XP`);
        if (typeof refreshUser === "function") refreshUser();
      } else if (res.data.status === "completed") {
        setMessage("Already completed.");
        toast.info(res.data.msg);
      } else {
        setMessage(res.data.msg);
        toast.error(res.data.msg);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.msg ||
        err.message ||
        "Server error during answer submission.";
      setMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const difficultyColors = {
    easy: "#10b981",
    medium: "#f59e0b",
    hard: "#ef4444",
  };

  const difficultyLabels = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  };

  if (loading) {
    return (
      <div className="lab-container">
        <div className="loading-spinner">Loading challenge...</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="lab-container">
        <div className="error-message">{message || "Challenge not found"}</div>
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/ctf")}
          style={{ marginTop: "1rem" }}
        >
          ← Back to CTF Domains
        </button>
      </div>
    );
  }

  const approachText = getApproachText(challenge);
  const isAdminLike = user?.role === "admin" || user?.role === "instructor";
  const isHardBase64 =
    challenge.difficulty === "hard" &&
    typeof challenge.description === "string" &&
    challenge.description.toLowerCase().includes("base64");
  const canRevealSolution =
    isAdminLike && isHardBase64 && Boolean(challenge.correctAnswer);

  // Build lab URL with userId and challengeId for verification token generation
  // Use user.id or user._id as fallback
  // This will be recalculated when user or challenge changes
  const userId = user?.id || user?._id || '';
  const theoryCacheBust = challenge?.labPath === "/lab/theory" ? "&_labwv=5" : "";
  const labUrl = challenge?.labPath && userId
    ? `${getLabBaseUrl()}${challenge.labPath}?challengeId=${id}&userId=${userId}${theoryCacheBust}`
    : challenge?.labPath
    ? `${getLabBaseUrl()}${challenge.labPath}?challengeId=${id}${theoryCacheBust}`
    : null;
  const vmConfig = challenge?.vmConfig;
  const isVMChallenge = vmConfig?.enabled;

  // VM panel title by domain (Docker container lab)
  const getVmPanelTitle = () => {
    if (challenge?.title) {
      const t = String(challenge.title);
      return t.length > 48 ? `${t.slice(0, 45)}…` : t;
    }
    return "VM Lab";
  };

  // Backend base URL (same logic for panel and terminal-frame).
  const getVmBackendBase = () => {
    const backendOrigin = (process.env.REACT_APP_BACKEND_ORIGIN || process.env.REACT_APP_PROXY_TARGET || "").trim();
    const isDev = process.env.NODE_ENV === "development";
    if (backendOrigin && (backendOrigin.startsWith("http://") || backendOrigin.startsWith("https://"))) {
      return backendOrigin.replace(/\/$/, "");
    }
    if (isDev) return "http://localhost:5000";
    const apiUrl = (process.env.REACT_APP_API_URL || "").trim();
    if (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")) {
      return apiUrl.replace(/\/api\/?$/, "");
    }
    return window.location.origin;
  };

  // VM terminal frame URL: use relative path so the iframe always hits same origin (dev proxy or nginx forwards to backend).
  const getVmTerminalFrameUrl = () => {
    if (!isVMChallenge || !challenge?.domain) return null;
    const domainSlugMap = {
      "Enterprise Directory Services Lab (VM)": "ad",
      "Linux System Security Lab (VM)": "linux",
      "Penetration Testing & Red Team Lab (VM)": "pentest",
    };
    const domainSlug = domainSlugMap[challenge.domain];
    if (!domainSlug) return null;
    const difficulty = challenge.difficulty || "easy";
    return `/api/vm/terminal-frame/${domainSlug}/${difficulty}/`;
  };

  // Legacy panel URL (credentials + inner iframe); used for "Open in new tab" link only.
  const getVmTerminalUrl = () => {
    if (!isVMChallenge || !challenge?.domain) return null;
    const domainSlugMap = {
      "Enterprise Directory Services Lab (VM)": "ad",
      "Linux System Security Lab (VM)": "linux",
      "Penetration Testing & Red Team Lab (VM)": "pentest",
    };
    const domainSlug = domainSlugMap[challenge.domain];
    if (!domainSlug) return null;
    const q = new URLSearchParams({
      domain: domainSlug,
      difficulty: challenge.difficulty || "easy",
    });
    return `${getVmBackendBase()}/api/vm/terminal?${q.toString()}`;
  };

  // Determine what to display in the right panel: for VM challenges use terminal-frame directly (single iframe).
  const getRightPanelUrl = () => {
    if (isVMChallenge) {
      return getVmTerminalFrameUrl() || getVmTerminalUrl() || vmConfig?.webTerminal || null;
    }
    return labUrl;
  };

  const rightPanelUrl = getRightPanelUrl();
  // Show right panel for VM challenges (with VM panel) or lab challenges
  const shouldShowRightPanel = rightPanelUrl || isVMChallenge;
  const isDomainWorkspaceLab =
    challenge.labPath === "/lab/theory";

  // Get domain route for back button
  const getDomainRoute = () => {
    if (!challenge?.domain) return "/ctf";
    const domainMap = {
      "Security Governance & Risk Foundations": "security-governance-risk-foundations",
      "Cryptography & PKI Theory": "cryptography-pki-theory",
      "Web Application Security": "web-application-security",
      "Cyber Forensics Lab": "cyber-forensics-lab",
      "System & Network Security Lab": "system-network-security-lab",
      "Linux System Security Lab (VM)": "linux-system-security-lab",
      "Enterprise Directory Services Lab (VM)": "enterprise-directory-services-lab",
      "Penetration Testing & Red Team Lab (VM)": "penetration-testing-red-team-lab",
      // Legacy DB labels → current routes
      "Digital Security, Identity & Cyber Resilience": "security-governance-risk-foundations",
      "Classical & Modern Cryptography": "cryptography-pki-theory",
      "System Security & Secure Software Engineering": "system-network-security-lab",
      "Cyber Forensics & Cyber Law": "cyber-forensics-lab",
      "Networking & Web Application Security": "web-application-security",
    };
    const slug = domainMap[challenge.domain];
    if (!slug) return "/ctf";
    return `/ctf/${slug}`;
  };

  return (
    <div className={`lab-container ${!rightPanelUrl && !shouldShowRightPanel ? "centered" : ""}`}>
      <div className="lab-left">
        <div className="lab-header">
          <button type="button" className="back-btn" onClick={() => navigate(getDomainRoute())}>
            ← Back to Domain
          </button>
          <h1 className="lab-title">{challenge.title}</h1>
        </div>

        <div className="lab-badges">
          <span
            className="difficulty-badge"
            style={{
              backgroundColor: `${difficultyColors[challenge.difficulty]}20`,
              color: difficultyColors[challenge.difficulty],
            }}
          >
            {difficultyLabels[challenge.difficulty]}
          </span>
          <span className="category-badge">{challenge.category}</span>
          {challenge.domain && (
            <span className="domain-badge">{challenge.domain}</span>
          )}
          <span className="points-badge">{challenge.points} XP</span>
          {isVMChallenge && (
            <span className="vm-badge-lab" title="VM-Based Challenge">
              🖥️ VM Required
            </span>
          )}
        </div>

        <div className="lab-section">
          <h3>Description</h3>
          <p className="lab-description">{challenge.description}</p>
        </div>

        {approachText && (
          <div className="lab-section">
            <h3>How to approach</h3>
            <p className="lab-description">{approachText}</p>
          </div>
        )}

        {isVMChallenge && (
          <div className="lab-section vm-info-section">
            <h3>🖥️ Virtual Machine Information</h3>
            <div className="vm-details">
              <p className="lab-description">
                <strong>VM Type:</strong> {vmConfig.vmType || "Not specified"}
              </p>
              
              {vmConfig.credentials && (
                <div className="vm-credentials-box">
                  <p className="lab-description">
                    <strong>Credentials:</strong>
                  </p>
                  <p className="lab-description">
                    <strong>Username:</strong> <code className="credential-code">{vmConfig.credentials.username || "user"}</code>
                  </p>
                  <p className="lab-description">
                    <strong>Password:</strong> <code className="credential-code">{vmConfig.credentials.password || "password123"}</code>
                  </p>
                </div>
              )}

              {vmConfig.sshAccess && (
                <div className="vm-access-box">
                  <p className="lab-description">
                    <strong>SSH Access:</strong>
                  </p>
                  <code className="ssh-command">{vmConfig.sshAccess}</code>
                  <p className="lab-description vm-note">
                    Use this command in your terminal to SSH into the Linux VM.
                  </p>
                </div>
              )}

              {vmConfig.webTerminal && (
                <p className="lab-description">
                  <strong>Web Terminal:</strong>{" "}
                  <a href={vmConfig.webTerminal} target="_blank" rel="noopener noreferrer" className="vm-link">
                    {vmConfig.webTerminal}
                  </a>
                </p>
              )}

              {vmConfig.vmUrl && (
                <div className="vm-access-box">
                  <p className="lab-description">
                    <strong>VNC Desktop Access:</strong>{" "}
                    <a href={vmConfig.vmUrl} target="_blank" rel="noopener noreferrer" className="vm-link">
                      {vmConfig.vmUrl}
                    </a>
                  </p>
                  <p className="lab-description vm-note">
                    Connect using a VNC client (like TigerVNC, RealVNC, or your browser) to access the full Linux desktop environment.
                  </p>
                </div>
              )}

              {vmConfig.resetEndpoint && (
                <button
                  type="button"
                  className="vm-reset-btn"
                  onClick={async () => {
                    try {
                      await api.post(vmConfig.resetEndpoint);
                      toast.success("VM reset successfully");
                    } catch (err) {
                      toast.error("Failed to reset VM");
                    }
                  }}
                >
                  Reset VM State
                </button>
              )}

              {vmAttest?.attestToken && (
                <div className="vm-access-box" style={{ marginTop: "1rem" }}>
                  <p className="lab-description">
                    <strong>Before you submit:</strong> run this once in the VM after you have earned{" "}
                    <code>unlock_flag</code> (same shell session is fine). It registers your solve with the CTF server
                    using a token only you can request from this page.
                  </p>
                  <code className="ssh-command" style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {vmAttest.unlockExample || `/usr/local/bin/unlock_flag ${vmAttest.unlockKey} ${vmAttest.attestToken}`}
                  </code>
                  <button
                    type="button"
                    className="vm-copy-cmd"
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => {
                      const cmd =
                        vmAttest.unlockExample ||
                        `/usr/local/bin/unlock_flag ${vmAttest.unlockKey} ${vmAttest.attestToken}`;
                      navigator.clipboard.writeText(cmd);
                      toast.success("Unlock command copied");
                    }}
                  >
                    Copy unlock command
                  </button>
                  <p className="lab-description vm-note" style={{ marginTop: "0.5rem" }}>
                    The command unlocks the flag file and notifies the server. Then paste <code>FLAG{"{...}"}</code> below
                    within about {vmAttest.submitWindowMinutes ?? 20} minutes. Reload this page for a fresh token if it
                    expires.
                  </p>
                  {vmAttest.serverAttestConfigured === false && (
                    <p className="lab-description vm-note" style={{ color: "#b45309" }}>
                      Operator: set <code>CYBERRANGEX_VM_SECRET</code> on the backend and the same value in VM containers
                      (see <code>vms/docker-compose.vms.yml</code>) or attestation will not register.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {challenge.hints && challenge.hints.length > 0 && (
          <div className="lab-section">
            <h3>Hints</h3>
            <ul className="tips-list">
              {challenge.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        {canRevealSolution && (
          <div className="lab-section">
            <h3>Admin tools</h3>
            <p className="lab-description">
              This section is only visible to admins and instructors. Use it to
              verify solutions or create write-ups; do not expose it to
              students in demos.
            </p>
            {!showSolution ? (
              <button
                type="button"
                className="solution-toggle-btn"
                onClick={() => setShowSolution(true)}
              >
                Reveal solution
              </button>
            ) : (
              <div className="solution-box">
                <h4>Correct answer</h4>
                <p className="lab-description">
                  Enter this exact value in the answer box to solve this
                  challenge:
                </p>
                <p className="lab-description">
                  <code>{challenge.correctAnswer}</code>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="lab-section answer-section">
          <h3>Your Answer</h3>
          <p className="lab-description">
            {isVMChallenge
              ? `Solve the task in the VM, run the unlock command shown above (with your personal token), then paste the flag from the VM here and click Submit to earn ${challenge.points} XP.`
              : isDomainWorkspaceLab
              ? `Use the workplace lab on the right: finish every checklist step in the terminal, copy SUBMISSION_CODE from the evidence files, verify in the lab panel, then submit the revealed flag below for ${challenge.points} XP.`
              : labUrl
              ? "Exploit the vulnerability in the lab environment, then paste the flag below."
              : "Enter the answer (flag, key, or value) defined by the challenge."}
          </p>
          <input
            className="answer-input"
            type="text"
            placeholder={labUrl || isVMChallenge ? "FLAG{...}" : "Type your answer..."}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button
            onClick={submitAnswer}
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? "Checking..." : "Submit Answer"}
          </button>
          {message && (
            <div
              className={`submit-message ${
                message.includes("Correct") || message.includes("Already completed") ? "success" : "error"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>

      {shouldShowRightPanel && (
        <div className="lab-right">
          <div className="lab-frame-header">
            <span
              className="frame-title"
              title={
                isVMChallenge
                  ? "Docker VM – Web terminal (ttyd)"
                  : isDomainWorkspaceLab
                  ? "Live domain lab — terminal & tools (real-time workspace)"
                  : "Interactive Lab Environment"
              }
            >
              {isVMChallenge ? `🖥️ ${getVmPanelTitle()}` : isDomainWorkspaceLab ? "Live lab workspace" : "Lab"}
            </span>
            {rightPanelUrl && (
              <a
                href={rightPanelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="open-new-tab"
              >
                Open in new tab
              </a>
            )}
          </div>
          {isVMChallenge ? (
            <div className="vm-container">
              {rightPanelUrl ? (
                <>
                  <iframe
                    src={rightPanelUrl}
                    className="lab-iframe vm-iframe"
                    title="Linux Virtual Machine - Web Terminal"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
                    allow="fullscreen"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                  {vmStatus === "stopped" && (
                    <div className="vm-panel-help vm-panel-help-warn" role="status">
                      <strong>VM not running.</strong> From the project root run:
                      <div className="vm-cmd-row">
                        <code>docker compose -f vms/docker-compose.vms.yml up -d</code>
                        <button
                          type="button"
                          className="vm-copy-cmd"
                          onClick={() => {
                            navigator.clipboard.writeText("docker compose -f vms/docker-compose.vms.yml up -d");
                            toast.success("Command copied to clipboard");
                          }}
                          title="Copy command"
                        >
                          Copy
                        </button>
                      </div>
                      Wait ~30s, then refresh. Login: <code>user</code> / <code>password123</code>. Use the terminal to solve the task and obtain the flag, then paste it below to score points.
                    </div>
                  )}
                  <div className="vm-panel-help">
                    The panel above is the <strong>VM terminal</strong> (ttyd). If blank, start the VM with the command above (or <code>docker compose -f vms/docker-compose.vms.yml up -d</code> from project root), wait, then refresh. Use the terminal to solve the task and obtain the flag, then paste it below to earn points.
                  </div>
                </>
              ) : (
                <div className="vm-placeholder">
                  <div className="vm-placeholder-content">
                    <div className="vm-placeholder-icon">🖥️</div>
                    <h3>Linux Virtual Machine</h3>
                    <p>Connecting to VM...</p>
                    {vmConfig.sshAccess && (
                      <>
                        <p>Or use SSH to connect:</p>
                        <code className="vm-ssh-display">{vmConfig.sshAccess}</code>
                      </>
                    )}
                    {vmConfig.credentials && (
                      <div className="vm-credentials-display">
                        <p><strong>Username:</strong> {vmConfig.credentials.username}</p>
                        <p><strong>Password:</strong> {vmConfig.credentials.password}</p>
                      </div>
                    )}
                    <p className="vm-placeholder-note">
                      The VM web terminal will be displayed here once connected.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            labUrl && (
              <iframe
                src={labUrl}
                className="lab-iframe"
                title="Challenge Lab"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                key={labUrl}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
