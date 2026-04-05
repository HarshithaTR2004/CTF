import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/ctf", label: "CTF" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/profile", label: "Profile" },
  ];

  const adminItems = [
    { path: "/admin", label: "Admin Panel" },
    { path: "/instructor", label: "Instructor Panel" },
  ];

  return (
    <div className="sidebar">
      <h2 className="sidebar-logo">CyberRangeX</h2>

      <nav>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={location.pathname === item.path ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}

        {user?.role === "admin" &&
          adminItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}

        {user?.role === "instructor" && (
          <Link
            to="/instructor"
            className={location.pathname === "/instructor" ? "active" : ""}
          >
            Instructor Panel
          </Link>
        )}
      </nav>
    </div>
  );
}
