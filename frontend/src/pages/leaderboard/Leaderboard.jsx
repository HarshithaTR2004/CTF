import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/api";
import { toast } from "react-toastify";
import "./leaderboard.css";

export default function Leaderboard() {
  const { user } = useContext(AuthContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, top10, top100

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/leaderboard");
      let data = res.data || [];
      
      // Apply filter
      if (filter === "top10") {
        data = data.slice(0, 10);
      } else if (filter === "top100") {
        data = data.slice(0, 100);
      }
      
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      toast.error("Failed to load leaderboard");
      
      // Fallback to demo data
      setLeaderboard([
        { _id: "1", username: "neo", xp: 1200 },
        { _id: "2", username: "trinity", xp: 980 },
        { _id: "3", username: "morpheus", xp: 850 },
        { _id: "4", username: user?.username || "harshitr", xp: 340 },
        { _id: "5", username: "cyberstudent", xp: 200 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank) => `#${rank}`;

  const getRankClass = (rank) => {
    if (rank === 1) return "rank-1";
    if (rank === 2) return "rank-2";
    if (rank === 3) return "rank-3";
    return "";
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading-spinner">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <div className="header-content">
          <h1>Leaderboard</h1>
          <p>Compete with cybersecurity enthusiasts worldwide</p>
        </div>
        <div className="filter-buttons">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All Players
          </button>
          <button
            className={filter === "top10" ? "active" : ""}
            onClick={() => setFilter("top10")}
          >
            Top 10
          </button>
          <button
            className={filter === "top100" ? "active" : ""}
            onClick={() => setFilter("top100")}
          >
            Top 100
          </button>
        </div>
      </div>

      <div className="leaderboard-stats">
        <div className="stat-item">
          <span className="stat-label">Total Players</span>
          <span className="stat-value">{leaderboard.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Your Rank</span>
          <span className="stat-value">
            {(() => {
              const idx = leaderboard.findIndex(u => String(u._id) === String(user?.id));
              return idx === -1 ? "—" : `#${idx + 1}`;
            })()}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Your XP</span>
          <span className="stat-value">{user?.xp || 0}</span>
        </div>
      </div>

      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>XP</th>
              <th>Level</th>
              <th>Challenges</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = String(player._id) === String(user?.id);
              const level = Math.floor((player.xp || 0) / 500) + 1;
              
              return (
                <tr
                  key={player._id}
                  className={`${getRankClass(rank)} ${isCurrentUser ? "current-user" : ""}`}
                >
                  <td className="rank-cell">
                    <span className="rank-badge">{getRankDisplay(rank)}</span>
                  </td>
                  <td className="player-cell">
                    <div className="player-info">
                      <span className="player-name">
                        {player.username}
                        {isCurrentUser && <span className="you-badge">You</span>}
                      </span>
                    </div>
                  </td>
                  <td className="xp-cell">
                    <span className="xp-value">{player.xp || 0}</span>
                    <span className="xp-label">XP</span>
                  </td>
                  <td className="level-cell">
                    <span className="level-badge">Lv.{level}</span>
                  </td>
                  <td className="challenges-cell">
                    {player.completedChallenges?.length || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leaderboard.length === 0 && (
        <div className="empty-state">
          <p>No players found. Be the first to complete a challenge!</p>
        </div>
      )}
    </div>
  );
}
