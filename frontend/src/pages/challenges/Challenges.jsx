import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast } from "react-toastify";
import "./challenges.css";

export default function Challenges() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [activeTab, setActiveTab] = useState("challenges"); // 'challenges' or 'scenarios'
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "all", difficulty: "all" });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchChallenges();
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await api.get("/scenarios");
      setScenarios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setScenarios([]);
    }
  };

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await api.get("/challenges");
      console.log("Challenges API Response:", res.data);

      if (res.data && Array.isArray(res.data)) {
        setChallenges(res.data);
      } else {
        console.error("Invalid response format:", res.data);
        toast.error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error fetching challenges:", err);
      const errorMsg = err.response?.data?.msg || err.message || "Failed to load challenges";
      
      if (err.networkError) {
        toast.error("Cannot reach the server. Check your connection and try again.");
      } else if (err.response?.status === 401) {
        toast.error("Authentication required. Please login again.");
      } else {
        toast.error(`Failed to load challenges: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };


  const filteredChallenges = challenges.filter((challenge) => {
    const matchesCategory = filter.category === "all" || challenge.category === filter.category;
    const matchesDifficulty = filter.difficulty === "all" || challenge.difficulty === filter.difficulty;
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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

  if (loading) {
    return (
      <div className="challenges-container">
        <div className="loading-spinner">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <h1 className="challenges-title">Challenges</h1>
        <p className="challenges-subtitle">Complete challenges to earn XP. Filter by category or difficulty.</p>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === "challenges" ? "active" : ""}`}
          onClick={() => setActiveTab("challenges")}
        >
          Individual Challenges
        </button>
        <button
          className={`tab-button ${activeTab === "scenarios" ? "active" : ""}`}
          onClick={() => setActiveTab("scenarios")}
        >
          Scenario Simulations
        </button>
      </div>

      {activeTab === "challenges" && (
        <>
          <div className="challenges-filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search challenges..."
                className="search-input"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            <select
              name="category"
              onChange={handleFilterChange}
              value={filter.category}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="XSS">XSS</option>
              <option value="SQL Injection">SQL Injection</option>
              <option value="CSRF">CSRF</option>
              <option value="IDOR">IDOR</option>
              <option value="File Upload">File Upload</option>
              <option value="Command Injection">Command Injection</option>
              <option value="Authentication Bypass">Authentication Bypass</option>
              <option value="Forensics">Forensics</option>
            </select>

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

          {challenges.length > 0 && (
            <div className="challenges-stats">
              <div className="stat-item">
                Total Challenges: {challenges.length}
              </div>
              <div className="stat-item">
                Showing: {filteredChallenges.length}
              </div>
            </div>
          )}

          <div className="challenges-grid">
            {filteredChallenges.length > 0 ? (
              filteredChallenges.map((c) => (
                <div key={c._id} className="challenge-card">
                  <div className="challenge-header">
                    <span
                      className="difficulty-badge"
                      style={{
                        backgroundColor: `${getDifficultyColor(c.difficulty)}20`,
                        color: getDifficultyColor(c.difficulty)
                      }}
                    >
                      {c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}
                    </span>
                    <span className="points-badge">{c.points} XP</span>
                  </div>

                  <div className="challenge-title">{c.title}</div>
                  <div className="challenge-category">{c.category}</div>
                  <div className="challenge-desc">{c.description}</div>

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
                {challenges.length === 0
                  ? "No challenges found. Please seed the database first."
                  : "No challenges found matching your criteria."}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "scenarios" && (
        <div className="scenarios-grid">
          {scenarios.length > 0 ? (
            scenarios.map((s) => (
              <div key={s._id} className="scenario-card">
                <h3 className="scenario-title">{s.title}</h3>
                <p className="scenario-desc">{s.description}</p>
                <div className="scenario-challenges-list">
                  <h4>Challenges in this Scenario:</h4>
                  <ul>
                    {s.challenges.map((c) => (
                      <li key={c._id}>- {c.title} ({c.difficulty})</li>
                    ))}
                  </ul>
                </div>
                <button
                  className="start-btn"
                  onClick={() => {
                    if (s.challenges.length > 0) {
                      navigate(`/lab/${s.challenges[0]._id}`); // Start the first challenge of the scenario
                    } else {
                      toast.info("This scenario has no challenges yet.");
                    }
                  }}
                >
                  Start Scenario
                </button>
              </div>
            ))
          ) : (
            <div className="no-scenarios">
              No scenarios found. Please seed the database first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}