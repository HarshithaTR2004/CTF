import "./gamification.css";

export default function XPBar({ xp, nextLevelXP }) {
  const percent = Math.min((xp / nextLevelXP) * 100, 100);

  return (
    <div className="xp-container">
      <div className="xp-text">
        XP: {xp} / {nextLevelXP}
      </div>
      <div className="xp-bar">
        <div className="xp-fill" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
