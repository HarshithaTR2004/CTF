import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/api";
import { toast } from "react-toastify";
import "./dashboard.css";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    completedChallenges: 0,
    totalPoints: 0,
    streak: 0,
    rank: 0,
    level: 1,
    nextLevelPoints: 500,
  });
  const [recentChallenges, setRecentChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile for stats
      const profileRes = await api.get("/profile");
      const profile = profileRes.data;
      
      // Fetch challenges to get completed count
      const challengesRes = await api.get("/challenges");
      const allChallenges = challengesRes.data || [];
      
      // Calculate stats
      const completedCount = profile.completedChallenges?.length || 0;
      const totalPoints = profile.points || 0;
      const streak = profile.streak || 0;
      
      // Calculate level (every 500 XP = 1 level)
      const level = Math.floor(totalPoints / 500) + 1;
      const nextLevelPoints = level * 500;
      const currentLevelPoints = totalPoints % 500;
      
      // Get recent completed challenges
      const completedIds = profile.completedChallenges || [];
      const recent = allChallenges
        .filter(c => completedIds.includes(c._id))
        .slice(-5)
        .reverse();
      
      // Fetch leaderboard for rank
      try {
        const leaderboardRes = await api.get("/leaderboard");
        const leaderboardData = leaderboardRes.data || [];
        const userRank = leaderboardData.findIndex(u => u._id === profile._id) + 1;
        
        setStats({
          completedChallenges: completedCount,
          totalPoints,
          streak,
          rank: userRank || leaderboardData.length + 1,
          level,
          nextLevelPoints,
          currentLevelPoints,
          totalChallenges: allChallenges.length,
        });
        
        setLeaderboard(leaderboardData.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
      
      setRecentChallenges(recent);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const progress = stats.nextLevelPoints > 0 
    ? (stats.currentLevelPoints / 500) * 100 
    : 0;

  const achievements = [
    { label: "First Challenge", unlocked: stats.completedChallenges > 0 },
    { label: "5 Day Streak", unlocked: stats.streak >= 5 },
    { label: "1000 Points", unlocked: stats.totalPoints >= 1000 },
    { label: "Top 10", unlocked: stats.rank <= 10 && stats.rank > 0 },
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome, {user?.username}!</h1>
          <p>Continue your cybersecurity journey</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate("/challenges")} className="cta-button">
            Start Challenge
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-content">
            <h3>{stats.completedChallenges}</h3>
            <p>Challenges Completed</p>
            <span className="stat-subtitle">
              {stats.totalChallenges ? `${stats.completedChallenges}/${stats.totalChallenges}` : ""}
            </span>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-content">
            <h3>{stats.totalPoints}</h3>
            <p>Total Points</p>
            <span className="stat-subtitle">Level {stats.level}</span>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-content">
            <h3>{stats.streak}</h3>
            <p>Day Streak</p>
            <span className="stat-subtitle">Keep it up!</span>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-content">
            <h3>#{stats.rank || "—"}</h3>
            <p>Leaderboard Rank</p>
            <span className="stat-subtitle">Out of all players</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card progress-card">
          <h2>Level Progress</h2>
          <div className="level-info">
            <span className="level-number">Level {stats.level}</span>
            <span className="level-xp">
              {stats.currentLevelPoints} / 500 Points
            </span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="next-level">
            {500 - stats.currentLevelPoints} Points until Level {stats.level + 1}
          </p>
        </div>

        <div className="dashboard-card achievements-card">
          <h2>Achievements</h2>
          <div className="achievements-grid">
            {achievements.map((achievement, idx) => (
              <div
                key={idx}
                className={`achievement-item ${achievement.unlocked ? "unlocked" : "locked"}`}
              >
                <span className="achievement-label">{achievement.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card recent-challenges">
          <div className="card-header">
            <h2>Recent Challenges</h2>
            <button
              onClick={() => navigate("/challenges")}
              className="view-all-btn"
            >
              View All
            </button>
          </div>
          {recentChallenges.length > 0 ? (
            <div className="challenges-list">
              {recentChallenges.map((challenge) => (
                <div key={challenge._id} className="challenge-item">
                  <div className="challenge-info">
                    <span className="challenge-title">{challenge.title}</span>
                    <span className="challenge-category">{challenge.category}</span>
                  </div>
                  <span className="challenge-points">+{challenge.points} Points</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No challenges completed yet</p>
              <button
                onClick={() => navigate("/challenges")}
                className="start-challenge-btn"
              >
                Start Your First Challenge
              </button>
            </div>
          )}
        </div>

        <div className="dashboard-card leaderboard-preview">
          <div className="card-header">
            <h2>Top Players</h2>
            <button
              onClick={() => navigate("/leaderboard")}
              className="view-all-btn"
            >
              View All
            </button>
          </div>
          {leaderboard.length > 0 ? (
            <div className="leaderboard-list">
              {leaderboard.map((player, idx) => (
                <div
                  key={player._id}
                  className={`leaderboard-item ${player._id === user?.id ? "current-user" : ""}`}
                >
                  <span className="rank-badge rank-{idx + 1}">
                    {idx + 1}
                  </span>
                  <span className="player-name">{player.username}</span>
                  <span className="player-points">{player.points} Points</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No leaderboard data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
