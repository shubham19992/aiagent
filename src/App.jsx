// ============================================================
// App.jsx  –  Router + Routes
// Flow: login (/login) → app shell (/dashboard) with nested
// observability drill-down routes.
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";

import UIDAILogin from "./pages/Uidailogin";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import AppLayout from "./pages/app/AppLayout";
import OverviewPage from "./pages/app/OverviewPage";
import OpPage from "./pages/app/OpPage";
import EnvPage from "./pages/app/EnvPage";
import CreateProjectPage from "./pages/app/CreateProjectPage";
import ProjectListPage from "./pages/app/ProjectListPage";
import { isAuthenticated } from "./api/auth";

// Only authenticated users (real or demo token present) reach the app.
function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing → login directly */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth flow */}
        <Route path="/login" element={<UIDAILogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Post-login app shell + observability drill-down */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="observability/:opCode" element={<OpPage />} />
          <Route path="observability/:opCode/:envCode" element={<EnvPage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/new" element={<CreateProjectPage />} />
        </Route>

        {/* Unknown routes → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
