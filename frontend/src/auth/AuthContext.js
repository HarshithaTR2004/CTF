import { createContext, useEffect, useState } from "react";
import api from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on refresh
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  /** Store token + user after admin/instructor login (no extra API call). */
  const loginWithToken = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
    } else {
      throw new Error(res.data.msg || "Registration failed");
    }
  };


  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  /** Refresh user from /api/profile (e.g. after solving a challenge) so points/xp/leaderboard stay in sync */
  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await api.get("/profile");
      const userData = res.data;
      const toStore = {
        id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        points: userData.points ?? 0,
        streak: userData.streak ?? 0,
        xp: userData.xp ?? 0,
      };
      localStorage.setItem("user", JSON.stringify(toStore));
      setUser(toStore);
    } catch (err) {
      console.error("Refresh user failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, register, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
