// ============================================================
// App.jsx  –  Router + Routes
// Flow: cloud picker (/) → login (/login) → dashboard (/dashboard)
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";

import CloudSelect from "./pages/CloudSelect";
import UIDAILogin from "./pages/Uidailogin";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";

// Only logged-in users reach the dashboard.
function RequireAuth({ children }) {
  const loggedIn = sessionStorage.getItem("uidai_loggedIn") === "true";
  return loggedIn ? children : <Navigate to="/login" replace />;
}

// Login is only reachable after a cloud has been chosen on the landing page.
function RequireCloud({ children }) {
  const cloud = sessionStorage.getItem("xops_cloud");
  return cloud ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing — pick a cloud platform */}
        <Route path="/" element={<CloudSelect />} />

        {/* Auth flow — login / forgot / reset password */}
        <Route
          path="/login"
          element={
            <RequireCloud>
              <UIDAILogin />
            </RequireCloud>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Post-login role-based dashboard */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* Unknown routes → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
