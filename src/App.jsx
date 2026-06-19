// ============================================================
// App.jsx  –  Router + Routes
// Flow: login (/login) → dashboard (/dashboard)
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";

import UIDAILogin from "./pages/Uidailogin";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import { isAuthenticated } from "./api/auth";

// Only authenticated users (real login token present) reach the dashboard.
function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing → login directly */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth flow — login / forgot / reset password */}
        <Route path="/login" element={<UIDAILogin />} />
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

        {/* Unknown routes → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
