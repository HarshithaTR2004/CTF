import "./gamification.css";

export default function Badge({ rank }) {
  let badge = "bronze";

  if (rank <= 10) badge = "gold";
  else if (rank <= 30) badge = "silver";

  return <span className={`badge-ui ${badge}`}>{badge.toUpperCase()}</span>;
}
