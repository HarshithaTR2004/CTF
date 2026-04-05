import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import ProtectedRoute from "./auth/ProtectedRoute";

/* Auth Pages */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

/* Layout */
import Layout from "./components/layout/Layout";

/* Core Pages */
import Dashboard from "./pages/dashboard/Dashboard";
import Challenges from "./pages/challenges/Challenges";
import CTF from "./pages/ctf/CTF";
import DomainChallenges from "./pages/ctf/DomainChallenges";
import ChallengeLab from "./pages/challenges/ChallengeLab";
import Leaderboard from "./pages/leaderboard/Leaderboard";
import Profile from "./pages/profile/Profile";

/* Admin & Instructor */
import AdminPanel from "./pages/admin/AdminPanel";
import AdminLogin from "./pages/admin/AdminLogin";
import InstructorPanel from "./pages/instructor/InstructorPanel";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* ========== PUBLIC ROUTES ========== */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ========== PROTECTED ROUTES ========== */}

          {/* Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* CTF - Main page showing domains */}
          <Route
            path="/ctf"
            element={
              <ProtectedRoute>
                <Layout>
                  <CTF />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* CTF Domain Challenges */}
          <Route
            path="/ctf/:domainId"
            element={
              <ProtectedRoute>
                <Layout>
                  <DomainChallenges />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Legacy Challenges route (kept for backward compatibility) */}
          <Route
            path="/challenges"
            element={
              <ProtectedRoute>
                <Layout>
                  <Challenges />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Lab Viewer */}
          <Route
            path="/lab/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChallengeLab />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Leaderboard */}
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin Panel */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin" loginPath="/admin/login">
                <Layout>
                  <AdminPanel />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Instructor Panel */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute role="instructor">
                <Layout>
                  <InstructorPanel />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ========== FALLBACK ========== */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
