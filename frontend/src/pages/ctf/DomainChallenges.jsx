import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast } from "react-toastify";
import { AuthContext } from "../../auth/AuthContext";
import "./domainChallenges.css";

// Icon Components
const GlobeIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const LockIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const GearIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
  </svg>
);

const SearchIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const BuildingIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18"></path>
    <path d="M5 21V7l8-4v18"></path>
    <path d="M19 21V11l-6-4"></path>
    <line x1="9" y1="9" x2="9" y2="9"></line>
    <line x1="9" y1="12" x2="9" y2="12"></line>
    <line x1="9" y1="15" x2="9" y2="15"></line>
    <line x1="9" y1="18" x2="9" y2="18"></line>
  </svg>
);

const LinuxIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
    <path d="M2 17l10 5 10-5"></path>
    <path d="M2 12l10 5 10-5"></path>
  </svg>
);

const TargetIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const QuestionMarkIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="16"></line>
    <path d="M12 12a4 4 0 0 0 2.83-6.83"></path>
  </svg>
);

const MonitorIcon = ({ color, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const XIcon = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ShieldIcon = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

// `name` is the MongoDB `domain` string (must match seed data). Slugs are URL keys; legacy slugs kept for old links.
const DOMAIN_INFO = {
  "security-governance-risk-foundations": {
    name: "Security Governance & Risk Foundations",
    icon: ShieldIcon,
    color: "#0ea5e9",
  },
  "cryptography-pki-theory": {
    name: "Cryptography & PKI Theory",
    icon: LockIcon,
    color: "#8b5cf6",
  },
  "web-application-security": {
    name: "Web Application Security",
    icon: GlobeIcon,
    color: "#3b82f6",
  },
  "cyber-forensics-lab": {
    name: "Cyber Forensics Lab",
    icon: SearchIcon,
    color: "#10b981",
  },
  "system-network-security-lab": {
    name: "System & Network Security Lab",
    icon: GearIcon,
    color: "#f59e0b",
  },
  "linux-system-security-lab": {
    name: "Linux System Security Lab (VM)",
    icon: LinuxIcon,
    color: "#14b8a6",
  },
  "enterprise-directory-services-lab": {
    name: "Enterprise Directory Services Lab (VM)",
    icon: BuildingIcon,
    color: "#ec4899",
  },
  "penetration-testing-red-team-lab": {
    name: "Penetration Testing & Red Team Lab (VM)",
    icon: TargetIcon,
    color: "#f97316",
  },
  // Legacy URL slugs → same API domain as above
  "digital-security-identity-cyber-resilience": {
    name: "Security Governance & Risk Foundations",
    icon: ShieldIcon,
    color: "#0ea5e9",
  },
  "classical-modern-cryptography": {
    name: "Cryptography & PKI Theory",
    icon: LockIcon,
    color: "#8b5cf6",
  },
  "networking-web-application-security": {
    name: "Web Application Security",
    icon: GlobeIcon,
    color: "#3b82f6",
  },
  "cyber-forensics-law": {
    name: "Cyber Forensics Lab",
    icon: SearchIcon,
    color: "#10b981",
  },
  "system-security-secure-software": {
    name: "System & Network Security Lab",
    icon: GearIcon,
    color: "#f59e0b",
  },
};

export default function DomainChallenges() {
  const { domainId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ difficulty: "all" });
  const [searchTerm, setSearchTerm] = useState("");

  const domainInfo = DOMAIN_INFO[domainId] || {
    name: "Unknown Domain",
    icon: QuestionMarkIcon,
    color: "#6b7280",
  };

  useEffect(() => {
    // Only fetch if user is logged in
    if (user) {
      fetchChallenges();
    } else {
      setLoading(false);
      toast.error("Please log in to view challenges");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId, user]);

  const fetchChallenges = async () => {
    const domainName = domainInfo.name;
    let lastError = null;
    try {
      setLoading(true);
      setChallenges([]);
      console.log("Fetching challenges for domain:", domainName);

      // Try domain-specific route first
      try {
        const url = `/challenges/domain/${encodeURIComponent(domainName)}`;
        const res = await api.get(url);
        if (res.data && Array.isArray(res.data)) {
          setChallenges(res.data);
          return;
        }
      } catch (domainErr) {
        lastError = domainErr;
        console.warn("Domain route failed, trying fallback:", domainErr.response?.status, domainErr.message);
      }

      // Fallback: fetch all challenges and filter by domain
      try {
        const allRes = await api.get("/challenges");
        if (allRes.data && Array.isArray(allRes.data)) {
          const filtered = allRes.data.filter(
            (c) => c.domain && String(c.domain).toLowerCase() === domainName.toLowerCase()
          );
          setChallenges(filtered);
          return;
        }
      } catch (fallbackErr) {
        lastError = fallbackErr;
        console.warn("Fallback fetch failed:", fallbackErr.response?.status, fallbackErr.message);
      }

      // Both failed: show helpful error
      const isNetwork = !lastError?.response && (lastError?.message === "Network Error" || lastError?.message?.includes("fetch"));
      if (isNetwork) {
        toast.error("Cannot reach the server. Check your connection and try again.");
      } else if (lastError?.response?.status === 401) {
        toast.error("Please log in again to view challenges.");
      } else {
        const msg = lastError?.response?.data?.msg || lastError?.message || "Failed to load challenges";
        toast.error(`Failed to load challenges: ${msg}`);
      }
    } catch (err) {
      console.error("Error fetching challenges:", err);
      toast.error(`Failed to load challenges: ${err.response?.data?.msg || err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredChallenges = challenges.filter((challenge) => {
    const matchesDifficulty = filter.difficulty === "all" || challenge.difficulty === filter.difficulty;
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "#10b981";
      case "medium":
        return "#f59e0b";
      case "hard":
        return "#ef4444";
      default:
        return "#667eea";
    }
  };

  const challengesByDifficulty = {
    easy: filteredChallenges.filter((c) => c.difficulty === "easy"),
    medium: filteredChallenges.filter((c) => c.difficulty === "medium"),
    hard: filteredChallenges.filter((c) => c.difficulty === "hard"),
  };

  if (loading) {
    return (
      <div className="domain-challenges-container">
        <div className="loading-spinner">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="domain-challenges-container">
      <div className="domain-header">
        <button type="button" className="back-btn" onClick={() => navigate("/ctf")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.5rem" }}>
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to CTF
        </button>
        <div className="domain-title-section">
          <span className="domain-icon-large" style={{ color: domainInfo.color }}>
            <domainInfo.icon color={domainInfo.color} size={72} />
          </span>
          <div>
            <h1 className="domain-title">{domainInfo.name}</h1>
            <p className="domain-subtitle">
              {challenges.length} challenges available
            </p>
          </div>
        </div>
      </div>

      <div className="challenges-filters">
        <div className="search-box">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search challenges..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <XIcon color="currentColor" size={16} />
            </button>
          )}
        </div>

        <select
          name="difficulty"
          onChange={handleFilterChange}
          value={filter.difficulty}
          className="filter-select"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {filteredChallenges.length > 0 && (
        <div className="challenges-stats">
          <div className="stat-item">
            Total: {challenges.length}
          </div>
          <div className="stat-item">
            Showing: {filteredChallenges.length}
          </div>
          <div className="stat-item">
            Easy: {challengesByDifficulty.easy.length} | Medium: {challengesByDifficulty.medium.length} | Hard: {challengesByDifficulty.hard.length}
          </div>
        </div>
      )}

      <div className="challenges-sections">
        {["easy", "medium", "hard"].map((difficulty) => {
          const difficultyChallenges = challengesByDifficulty[difficulty];
          if (difficultyChallenges.length === 0 && filter.difficulty !== "all") return null;

          return (
            <div key={difficulty} className="difficulty-section">
              <h2 className="difficulty-section-title" style={{ color: getDifficultyColor(difficulty) }}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ({difficultyChallenges.length})
              </h2>
              <div className="challenges-grid">
                {difficultyChallenges.length > 0 ? (
                  difficultyChallenges.map((c) => (
                    <div key={c._id} className="challenge-card">
                      <div className="challenge-header">
                        <span
                          className="difficulty-badge"
                          style={{
                            backgroundColor: `${getDifficultyColor(c.difficulty)}20`,
                            color: getDifficultyColor(c.difficulty),
                          }}
                        >
                          {c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}
                        </span>
                        <span className="points-badge">{c.points} XP</span>
                      </div>

                      <div className="challenge-title">{c.title}</div>
                      <div className="challenge-category">{c.category}</div>
                      <div className="challenge-desc">{c.description}</div>

                      {c.vmConfig?.enabled && (
                        <div className="vm-indicator-badge">
                          <span>
                            <MonitorIcon color="currentColor" size={18} />
                          </span>
                          <span>VM Required</span>
                        </div>
                      )}

                      <button
                        className="start-btn"
                        onClick={() => navigate(`/lab/${c._id}`)}
                      >
                        Start Challenge
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="no-challenges">
                    No {difficulty} challenges found.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredChallenges.length === 0 && challenges.length > 0 && (
        <div className="no-challenges">
          No challenges found matching your criteria.
        </div>
      )}

      {challenges.length === 0 && !loading && (
        <div className="no-challenges">
          <p>No challenges found for this domain.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#6b7280' }}>
            Make sure the database has been seeded with challenges.
            <br />
            Run: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>cd backend && npm run seed:ctf</code>
          </p>
        </div>
      )}
    </div>
  );
}
