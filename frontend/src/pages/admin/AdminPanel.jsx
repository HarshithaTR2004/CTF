import { useEffect, useState } from "react";
import api from "../../api/api";
import { successToast, errorToast } from "../../components/ui/ToastConfig";
import "./admin.css";

const DEFAULT_DOMAINS = [
  "Security Governance & Risk Foundations",
  "Cryptography & PKI Theory",
  "Web Application Security",
  "Cyber Forensics Lab",
  "System & Network Security Lab",
  "Linux System Security Lab (VM)",
  "Enterprise Directory Services Lab (VM)",
  "Penetration Testing & Red Team Lab (VM)",
];

export default function AdminPanel() {
  const [challenges, setChallenges] = useState([]);
  const [domains, setDomains] = useState(DEFAULT_DOMAINS);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [form, setForm] = useState({
    title: "",
    domain: "",
    category: "",
    difficulty: "easy",
    points: "",
    correctAnswer: "",
    description: "",
    hints: "",
    labPath: "",
    vmConfig: {
      enabled: false,
      vmUrl: "",
      vmType: "",
      sshAccess: "",
      webTerminal: "",
      resetEndpoint: "",
      credentials: {
        username: "",
        password: "",
      },
    },
  });

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/challenges");
      setChallenges(res.data);
    } catch (err) {
      errorToast("Failed to load challenges");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const res = await api.get("/admin/challenges/metadata");
      const dbDomains = Array.isArray(res.data?.domains) ? res.data.domains : [];
      const merged = Array.from(new Set([...DEFAULT_DOMAINS, ...dbDomains])).sort((a, b) =>
        a.localeCompare(b)
      );
      setDomains(merged);
    } catch (err) {
      console.warn("Failed to load metadata, using default domains.");
    }
  };

  useEffect(() => {
    loadMetadata();
    loadChallenges();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      domain: "",
      category: "",
      difficulty: "easy",
      points: "",
      correctAnswer: "",
      description: "",
      hints: "",
      labPath: "",
      vmConfig: {
        enabled: false,
        vmUrl: "",
        vmType: "",
        sshAccess: "",
        webTerminal: "",
        resetEndpoint: "",
        credentials: {
          username: "",
          password: "",
        },
      },
      vmFlag: "",
    });
    setUseCustomDomain(false);
    setEditingId(null);
  };

  const loadChallengeForEdit = async (id) => {
    try {
      const res = await api.get(`/admin/challenges/${id}`);
      const challenge = res.data;
      
      setForm({
        title: challenge.title || "",
        domain: challenge.domain || "",
        category: challenge.category || "",
        difficulty: challenge.difficulty || "easy",
        points: challenge.points || "",
        correctAnswer: challenge.correctAnswer || "",
        description: challenge.description || "",
        hints: challenge.hints ? (Array.isArray(challenge.hints) ? challenge.hints.join("\n") : challenge.hints) : "",
        labPath: challenge.labPath || "",
        vmConfig: challenge.vmConfig || {
          enabled: false,
          vmUrl: "",
          vmType: "",
          sshAccess: "",
          webTerminal: "",
          resetEndpoint: "",
          credentials: {
            username: "",
            password: "",
          },
        },
        vmFlag: challenge.vmFlag || "",
      });
      setUseCustomDomain(challenge.domain ? !DEFAULT_DOMAINS.includes(challenge.domain) : false);
      setEditingId(id);
      // Scroll to form
      document.querySelector(".admin-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      errorToast("Failed to load challenge for editing");
      console.error(err);
    }
  };

  const submitChallenge = async (e) => {
    e.preventDefault();
    try {
      const hintsArray = form.hints
        ? form.hints.split("\n").map((h) => h.trim()).filter(Boolean)
        : [];

      const challengeData = {
        title: form.title,
        domain: form.domain,
        category: form.category,
        difficulty: form.difficulty,
        points: Number(form.points),
        correctAnswer: form.correctAnswer,
        description: form.description,
        hints: hintsArray,
      };

      if (form.labPath) {
        challengeData.labPath = form.labPath;
      }

      if (form.vmConfig.enabled) {
        challengeData.vmConfig = {
          enabled: true,
          vmUrl: form.vmConfig.vmUrl || null,
          vmType: form.vmConfig.vmType || null,
          sshAccess: form.vmConfig.sshAccess || null,
          webTerminal: form.vmConfig.webTerminal || null,
          resetEndpoint: form.vmConfig.resetEndpoint || null,
          credentials: form.vmConfig.credentials.username || form.vmConfig.credentials.password
            ? {
                username: form.vmConfig.credentials.username || null,
                password: form.vmConfig.credentials.password || null,
              }
            : null,
        };
        if (form.vmFlag) {
          challengeData.vmFlag = form.vmFlag;
        }
      }

      if (editingId) {
        await api.put(`/admin/challenges/${editingId}`, challengeData);
        successToast("Challenge updated successfully");
      } else {
        await api.post("/admin/challenges", challengeData);
        successToast("Challenge created successfully");
      }

      resetForm();
      loadChallenges();
    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Failed to save challenge";
      errorToast(errorMsg);
      console.error(err);
    }
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) return;
    try {
      await api.delete(`/admin/challenges/${id}`);
      successToast("Challenge deleted");
      loadChallenges();
    } catch (err) {
      errorToast("Delete failed");
      console.error(err);
    }
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

  // Filter challenges
  const filteredChallenges = challenges.filter((ch) => {
    const matchesSearch = !searchTerm || 
      ch.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDomain = filterDomain === "all" || ch.domain === filterDomain;
    const matchesDifficulty = filterDifficulty === "all" || ch.difficulty === filterDifficulty;
    
    return matchesSearch && matchesDomain && matchesDifficulty;
  });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel – CyberRangeX</h1>
        <p className="admin-subtitle">Manage challenges, users, and platform settings</p>
      </div>

      {/* Create/Edit Challenge Form */}
      <form className="admin-form" onSubmit={submitChallenge}>
        <h2>{editingId ? "Edit Challenge" : "Create New Challenge"}</h2>
        
        {editingId && (
          <div className="edit-notice">
            Editing challenge ID: {editingId}
            <button type="button" onClick={resetForm} className="cancel-edit-btn">
              Cancel Edit
            </button>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Title *</label>
            <input
              placeholder="Challenge Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Domain *</label>
            <select
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              required
              disabled={useCustomDomain}
            >
              <option value="">Select Domain</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
            <small className="form-hint">
              <label style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={useCustomDomain}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseCustomDomain(checked);
                    if (checked) {
                      setForm({ ...form, domain: "" });
                    }
                  }}
                />
                Add custom domain
              </label>
            </small>
            {useCustomDomain && (
              <input
                style={{ marginTop: "0.5rem" }}
                placeholder="Custom domain title"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                required
              />
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <input
              placeholder="e.g., XSS, SQL Injection, etc."
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
          </div>

          <div className="form-row-inline">
            <div className="form-group">
              <label>Difficulty *</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                required
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label>Points / XP *</label>
              <input
                type="number"
                placeholder="Points"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                required
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Correct Answer (Flag) *</label>
          <input
            placeholder="Correct Answer"
            value={form.correctAnswer}
            onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            placeholder="Challenge description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label>Hints (one per line)</label>
          <textarea
            placeholder="Hint 1&#10;Hint 2&#10;Hint 3"
            value={form.hints}
            onChange={(e) => setForm({ ...form, hints: e.target.value })}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Lab Path (optional)</label>
          <input
            placeholder="e.g., /lab/xss-basic"
            value={form.labPath}
            onChange={(e) => setForm({ ...form, labPath: e.target.value })}
          />
          <small className="form-hint">Path to the interactive lab environment</small>
        </div>

        {/* VM Configuration */}
        <div className="vm-config-section">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={form.vmConfig.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vmConfig: { ...form.vmConfig, enabled: e.target.checked },
                  })
                }
              />
              <span>Enable VM Configuration</span>
            </label>
          </div>

          {form.vmConfig.enabled && (
            <div className="vm-config-fields">
              <div className="form-row">
                <div className="form-group">
                  <label>VM URL</label>
                  <input
                    placeholder="VNC/Web interface URL"
                    value={form.vmConfig.vmUrl}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vmConfig: { ...form.vmConfig, vmUrl: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>VM Type</label>
                  <input
                    placeholder="e.g., kali, windows, linux"
                    value={form.vmConfig.vmType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vmConfig: { ...form.vmConfig, vmType: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SSH Access</label>
                  <input
                    placeholder="SSH command to access VM"
                    value={form.vmConfig.sshAccess}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vmConfig: { ...form.vmConfig, sshAccess: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Web Terminal URL</label>
                  <input
                    placeholder="Web terminal URL"
                    value={form.vmConfig.webTerminal}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vmConfig: { ...form.vmConfig, webTerminal: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reset Endpoint</label>
                <input
                  placeholder="Endpoint to reset VM state"
                  value={form.vmConfig.resetEndpoint}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vmConfig: { ...form.vmConfig, resetEndpoint: e.target.value },
                    })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    placeholder="VM username"
                    value={form.vmConfig.credentials.username}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vmConfig: {
                          ...form.vmConfig,
                          credentials: {
                            ...form.vmConfig.credentials,
                            username: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="VM password"
                    value={form.vmConfig.credentials.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vmConfig: {
                          ...form.vmConfig,
                          credentials: {
                            ...form.vmConfig.credentials,
                            password: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>VM Flag (optional)</label>
                <input
                  placeholder="FLAG{...} (defaults to Correct Answer)"
                  value={form.vmFlag}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vmFlag: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="submit-btn">
          {editingId ? "Update Challenge" : "Create Challenge"}
        </button>
      </form>

      {/* Challenge List */}
      <div className="challenges-section">
        <div className="section-header">
          <h2>Existing Challenges ({challenges.length})</h2>
          
          {/* Filters */}
          <div className="admin-filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search challenges..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Domains</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading challenges...</div>
        ) : filteredChallenges.length === 0 ? (
          <div className="empty-state">
            {challenges.length === 0
              ? "No challenges found. Create your first challenge above."
              : "No challenges match your filters."}
          </div>
        ) : (
          <div className="admin-challenges">
            {filteredChallenges.map((ch) => (
              <div className="admin-ch-card" key={ch._id}>
                <div className="ch-card-header">
                  <h3>{ch.title}</h3>
                  <div className="ch-badges">
                    <span
                      className="difficulty-badge"
                      style={{
                        backgroundColor: `${getDifficultyColor(ch.difficulty)}20`,
                        color: getDifficultyColor(ch.difficulty),
                      }}
                    >
                      {ch.difficulty?.toUpperCase()}
                    </span>
                    <span className="points-badge">{ch.points} XP</span>
                  </div>
                </div>
                
                <div className="ch-card-body">
                  <p className="ch-domain">
                    <strong>Domain:</strong> {ch.domain}
                  </p>
                  <p className="ch-category">
                    <strong>Category:</strong> {ch.category}
                  </p>
                  <p className="ch-description">{ch.description}</p>
                  
                  {ch.labPath && (
                    <p className="ch-lab-path">
                      <strong>Lab:</strong> {ch.labPath}
                    </p>
                  )}
                  
                  {ch.vmConfig?.enabled && (
                    <div className="vm-badge">
                      <span>🖥️ VM-Based Challenge</span>
                    </div>
                  )}
                  
                  {ch.hints && ch.hints.length > 0 && (
                    <p className="ch-hints">
                      <strong>Hints:</strong> {ch.hints.length}
                    </p>
                  )}
                </div>

                <div className="ch-card-actions">
                  <button
                    onClick={() => loadChallengeForEdit(ch._id)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteChallenge(ch._id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
