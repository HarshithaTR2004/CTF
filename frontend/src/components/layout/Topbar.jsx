import { useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import { ThemeContext } from "../../theme/ThemeContext";

export default function Topbar() {
  const { user, logout } = useContext(AuthContext);
  const { toggleTheme, theme } = useContext(ThemeContext);

  return (
    <div className="topbar">
      <span className="topbar-welcome">Welcome, {user?.username}</span>
      <div className="topbar-actions">
        <button type="button" className="topbar-btn topbar-btn-secondary" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button type="button" className="topbar-btn topbar-btn-danger" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
