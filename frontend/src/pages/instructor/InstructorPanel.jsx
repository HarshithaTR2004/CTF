import { useEffect, useState } from "react";
import api from "../../api/api";
import { successToast, errorToast } from "../../components/ui/ToastConfig";
import "./instructor.css";

export default function InstructorPanel() {
  const [groups, setGroups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [students, setStudents] = useState([]);

  const [newGroup, setNewGroup] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState("");

  useEffect(() => {
    loadGroups();
    loadChallenges();
    loadStudents();
  }, []);

  const loadGroups = () => {
    api.get("/instructor/groups")
      .then(res => setGroups(res.data))
      .catch(() => errorToast("Failed to load groups"));
  };

  const loadChallenges = () => {
    api.get("/challenges")
      .then(res => setChallenges(res.data))
      .catch(() => errorToast("Failed to load challenges"));
  };

  const loadStudents = () => {
    api.get("/instructor/students")
      .then(res => setStudents(res.data))
      .catch(() => errorToast("Failed to load students"));
  };

  const createGroup = async () => {
    if (!newGroup) return;
    try {
      await api.post("/instructor/groups", { name: newGroup });
      successToast("Group created successfully");
      setNewGroup("");
      loadGroups();
    } catch {
      errorToast("Failed to create group");
    }
  };

  const assignChallenge = async () => {
    if (!selectedGroup || !selectedChallenge) {
      errorToast("Select both group and challenge");
      return;
    }

    try {
      await api.post("/instructor/assign", {
        groupId: selectedGroup,
        challengeId: selectedChallenge,
      });
      successToast("Challenge assigned to group");
    } catch {
      errorToast("Assignment failed");
    }
  };

  return (
    <div className="instructor-page">
      <h1>Instructor Panel – CyberRangeX</h1>

      {/* Group Creation */}
      <div className="panel-section">
        <h2>Create Student Group</h2>
        <input
          placeholder="Group Name (e.g., CSE-A, CyberSec-2026)"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        />
        <button onClick={createGroup}>Create Group</button>
      </div>

      {/* Assign Challenge */}
      <div className="panel-section">
        <h2>Assign Challenge to Group</h2>

        <select onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">Select Group</option>
          {groups.map(g => (
            <option key={g._id} value={g._id}>{g.name}</option>
          ))}
        </select>

        <select onChange={(e) => setSelectedChallenge(e.target.value)}>
          <option value="">Select Challenge</option>
          {challenges.map(c => (
            <option key={c._id} value={c._id}>
              {c.title} ({c.difficulty})
            </option>
          ))}
        </select>

        <button onClick={assignChallenge}>Assign Challenge</button>
      </div>

      {/* Students Overview */}
      <div className="panel-section">
        <h2>Student Progress Overview</h2>

        <div className="student-table">
          <div className="student-header">
            <span>Name</span>
            <span>Group</span>
            <span>Completed</span>
            <span>XP</span>
            <span>Accuracy</span>
          </div>

          {students.map((s) => (
            <div className="student-row" key={s._id}>
              <span>{s.username}</span>
              <span>{s.group}</span>
              <span>{s.completed}</span>
              <span>{s.xp}</span>
              <span>{s.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
