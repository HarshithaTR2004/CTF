import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { AuthContext } from "../../auth/AuthContext";
import "./ctf.css";

// Icon Components
const GlobeIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const LockIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const GearIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
  </svg>
);

const SearchIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const BuildingIcon = ({ color, size = 48 }) => (
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

const LinuxIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
    <path d="M2 17l10 5 10-5"></path>
    <path d="M2 12l10 5 10-5"></path>
  </svg>
);

const TargetIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const MonitorIcon = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const ArrowRightIcon = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const XIcon = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ShieldIcon = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

// `name` must match `domain` in MongoDB (see backend/scripts/seedCTFChallenges.js).
const DOMAINS = [
  {
    id: "security-governance-risk-foundations",
    name: "Security Governance & Risk Foundations",
    description: "CIA, governance, risk, IAM, SOC, MITRE ATT&CK, zero trust, and resilience concepts",
    icon: ShieldIcon,
    color: "#0ea5e9",
  },
  {
    id: "cryptography-pki-theory",
    name: "Cryptography & PKI Theory",
    description: "Classical and modern crypto, hashes, MACs, PKI, ECC, and post-quantum ideas",
    icon: LockIcon,
    color: "#8b5cf6",
  },
  {
    id: "web-application-security",
    name: "Web Application Security",
    description: "OWASP-style labs: XSS, SQLi, CSRF, SSRF, IDOR, file upload, command injection, auth bypass",
    icon: GlobeIcon,
    color: "#3b82f6",
  },
  {
    id: "cyber-forensics-lab",
    name: "Cyber Forensics Lab",
    description: "Evidence handling, imaging, carving, and practical forensics workflows",
    icon: SearchIcon,
    color: "#10b981",
  },
  {
    id: "system-network-security-lab",
    name: "System & Network Security Lab",
    description: "System and network security hands-on labs aligned with defensive and hardening topics",
    icon: GearIcon,
    color: "#f59e0b",
  },
  {
    id: "linux-system-security-lab",
    name: "Linux System Security Lab (VM)",
    description: "Hands-on Linux DAC, privilege escalation, hardening (Docker VM terminal)",
    icon: LinuxIcon,
    color: "#14b8a6",
    isVM: true,
  },
  {
    id: "enterprise-directory-services-lab",
    name: "Enterprise Directory Services Lab (VM)",
    description: "Kerberos, LDAP, NTLM, lateral movement in a directory lab (Docker VM)",
    icon: BuildingIcon,
    color: "#ec4899",
    isVM: true,
  },
  {
    id: "penetration-testing-red-team-lab",
    name: "Penetration Testing & Red Team Lab (VM)",
    description: "Full-chain VAPT practice: recon, access, persistence, exfiltration (Docker VM)",
    icon: TargetIcon,
    color: "#f97316",
    isVM: true,
  },
];

export default function CTF() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [allChallenges, setAllChallenges] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    // Fetch all challenges when user starts searching (only once)
    if (user && searchTerm.length > 0 && allChallenges.length === 0) {
      fetchAllChallenges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, user]);

  useEffect(() => {
    // Filter challenges whenever searchTerm or allChallenges change
    if (allChallenges.length > 0) {
      filterChallenges();
    } else if (searchTerm.length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, allChallenges]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchResults]);

  const fetchAllChallenges = async () => {
    try {
      setIsSearching(true);
      const res = await api.get("/challenges");
      if (res.data && Array.isArray(res.data)) {
        setAllChallenges(res.data);
      }
    } catch (err) {
      console.error("Error fetching challenges:", err);
      setAllChallenges([]);
    } finally {
      setIsSearching(false);
    }
  };

  const filterChallenges = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = allChallenges.filter((challenge) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        challenge.title?.toLowerCase().includes(searchLower) ||
        challenge.description?.toLowerCase().includes(searchLower) ||
        challenge.category?.toLowerCase().includes(searchLower) ||
        challenge.domain?.toLowerCase().includes(searchLower)
      );
    });

    setSearchResults(filtered);
    setShowSearchResults(filtered.length > 0);
  };

  const handleDomainClick = (domainId) => {
    navigate(`/ctf/${domainId}`);
  };

  const handleChallengeClick = (challengeId) => {
    navigate(`/lab/${challengeId}`);
    setSearchTerm("");
    setShowSearchResults(false);
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

  return (
    <div className="ctf-container">
      <div className="ctf-header">
        <h1 className="ctf-title">CTF Challenges</h1>
        <p className="ctf-subtitle">
          Select a domain to explore challenges.
        </p>
      </div>

      <div className="global-search-container" ref={searchContainerRef}>
        <div className="search-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search all challenges by name, category, or description..."
            className="global-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchResults(true);
            }}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchTerm("");
                setShowSearchResults(false);
              }}
              aria-label="Clear search"
            >
              <XIcon color="currentColor" size={16} />
            </button>
          )}
        </div>

        {showSearchResults && (
          <div className="search-results-dropdown">
            <div className="search-results-header">
              <span className="results-count">
                {isSearching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} found`}
              </span>
            </div>
            <div className="search-results-list">
              {searchResults.length > 0 ? (
                searchResults.map((challenge) => (
                  <div
                    key={challenge._id}
                    className="search-result-item"
                    onClick={() => handleChallengeClick(challenge._id)}
                  >
                    <div className="result-header">
                      <h3 className="result-title">{challenge.title}</h3>
                      <div className="result-badges">
                        <span
                          className="result-difficulty"
                          style={{
                            backgroundColor: `${getDifficultyColor(challenge.difficulty)}20`,
                            color: getDifficultyColor(challenge.difficulty),
                          }}
                        >
                          {challenge.difficulty?.toUpperCase()}
                        </span>
                        <span className="result-points">{challenge.points} XP</span>
                      </div>
                    </div>
                    <p className="result-category">{challenge.category} • {challenge.domain}</p>
                    <p className="result-description">{challenge.description}</p>
                  </div>
                ))
              ) : (
                <div className="no-results">No challenges found matching your search.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="domains-grid">
        {DOMAINS.map((domain) => (
          <div
            key={domain.id}
            className="domain-card"
            onClick={() => handleDomainClick(domain.id)}
            style={{ borderTopColor: domain.color }}
          >
            <div className="domain-icon" style={{ color: domain.color }}>
              <domain.icon color={domain.color} size={56} />
            </div>
            <h2 className="domain-name">{domain.name}</h2>
            <p className="domain-description">{domain.description}</p>
            {domain.isVM && (
              <div className="vm-badge">
                <span className="vm-indicator">
                  <MonitorIcon color="currentColor" size={18} />
                </span>
                <span>VM-Based</span>
              </div>
            )}
            <div className="domain-footer">
              <span className="arrow">
                <ArrowRightIcon color="currentColor" size={20} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
