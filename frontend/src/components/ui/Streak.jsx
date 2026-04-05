import "./gamification.css";

export default function Streak({ streak }) {
  return (
    <div className="streak-box">
      Streak: {streak} days
    </div>
  );
}
