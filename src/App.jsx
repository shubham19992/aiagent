// ============================================================
// App.jsx  –  Router + Routes (auth flow only, up to login)
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";

import UIDAILogin from "./pages/Uidailogin";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";

// Simple session guard — only logged-in users reach the dashboard.
function RequireAuth({ children }) {
  const loggedIn = sessionStorage.getItem("uidai_loggedIn") === "true";
  return loggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth flow — login / forgot / reset password */}
        <Route path="/login" element={<Dashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Post-login role-based dashboard */}
        <Route
          path="/"
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
