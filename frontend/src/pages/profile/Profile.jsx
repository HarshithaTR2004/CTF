import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast } from "react-toastify";
import "./profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/profile");
      setProfile(res.data);
      setEditUsername(res.data.username || "");
      
      // Fetch completed challenges details
      if (res.data.completedChallenges?.length > 0) {
        try {
          const challengesRes = await api.get("/challenges");
          const allChallenges = challengesRes.data || [];
          const completed = allChallenges.filter(c => 
            res.data.completedChallenges.includes(c._id)
          );
          setCompletedChallenges(completed);
        } catch (err) {
          console.error("Failed to fetch challenges:", err);
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Failed to load profile");
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setEditUsername(profile?.username || "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditUsername(profile?.username || "");
  };

  const saveProfile = async () => {
    const trimmed = editUsername.trim();
    if (!trimmed) {
      toast.error("Username cannot be empty");
      return;
    }
    try {
      setSaving(true);
      const res = await api.put("/profile", { username: trimmed });
      setProfile(res.data);
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      const msg = err.response?.data?.msg || "Failed to update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const level = profile ? Math.floor((profile.points || 0) / 500) + 1 : 1;
  const currentLevelPoints = profile ? (profile.points || 0) % 500 : 0;
  const progress = (currentLevelPoints / 500) * 100;

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-container">
        <div className="error-message">{error || "Profile not found"}</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {(editing ? editUsername : profile.username)?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="level-badge-large">Lv.{level}</div>
        </div>
        <div className="profile-info">
          {editing ? (
            <div className="profile-edit-form">
              <input
                type="text"
                className="profile-edit-input"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Username"
                autoFocus
                disabled={saving}
              />
              <div className="profile-edit-actions">
                <button
                  type="button"
                  className="profile-edit-btn profile-edit-save"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="profile-edit-btn profile-edit-cancel"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1>{profile.username}</h1>
              <button
                type="button"
                className="profile-edit-trigger"
                onClick={startEdit}
                aria-label="Edit profile"
              >
                Edit profile
              </button>
            </>
          )}
          <p className="profile-email">{profile.email}</p>
          <span className={`role-badge role-${profile.role}`}>
            {profile.role || "student"}
          </span>
        </div>
      </div>

      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-details">
            <h3>{profile.points || 0}</h3>
            <p>Total Points</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-details">
            <h3>{profile.completedChallenges?.length || 0}</h3>
            <p>Challenges Completed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-details">
            <h3>{profile.streak || 0}</h3>
            <p>Day Streak</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-details">
            <h3>{new Date(profile.createdAt).toLocaleDateString()}</h3>
            <p>Member Since</p>
          </div>
        </div>
      </div>

      <div className="profile-sections">
        <div className="profile-section">
          <h2>Level Progress</h2>
          <div className="level-progress-card">
            <div className="level-info-row">
              <span className="level-text">Level {level}</span>
              <span className="points-text">{currentLevelPoints} / 500 Points</span>
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="next-level-text">
              {500 - currentLevelPoints} Points until Level {level + 1}
            </p>
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header">
            <h2>Completed Challenges</h2>
            <button
              onClick={() => navigate("/challenges")}
              className="view-all-btn"
            >
              View All
            </button>
          </div>
          {completedChallenges.length > 0 ? (
            <div className="challenges-grid">
              {completedChallenges.slice(0, 6).map((challenge) => (
                <div key={challenge._id} className="challenge-card-mini">
                  <div className="challenge-mini-header">
                    <span className="challenge-mini-title">{challenge.title}</span>
                    <span className="challenge-mini-points">+{challenge.points} Points</span>
                  </div>
                  <div className="challenge-mini-footer">
                    <span className={`difficulty-badge-mini difficulty-${challenge.difficulty}`}>
                      {challenge.difficulty}
                    </span>
                    <span className="category-badge-mini">{challenge.category}</span>
                  </div>
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
      </div>
    </div>
  );
}
