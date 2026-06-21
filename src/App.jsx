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
import ConnectPage from "./pages/app/ConnectPage";
import CreateProjectPage from "./pages/app/CreateProjectPage";
import ProjectListPage from "./pages/app/ProjectListPage";
import ProjectDashboardPage from "./pages/app/ProjectDashboardPage";
import { getToken } from "./api/auth";

// A valid login = a real token (the demo placeholder doesn't count).
function isAuthed() {
  const token = getToken();
  return !!token && token !== "demo-token";
}

// Gate every app route: no token → bounce to /login.
function RequireAuth({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

// Keep authenticated users out of the login page.
function GuestOnly({ children }) {
  return isAuthed() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing → dashboard if logged in, else login */}
        <Route path="/" element={<Navigate to={isAuthed() ? "/dashboard" : "/login"} replace />} />

        {/* Auth flow — only reachable when NOT logged in */}
        <Route path="/login" element={<GuestOnly><UIDAILogin /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        <Route path="/reset-password" element={<GuestOnly><ResetPassword /></GuestOnly>} />

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
          <Route path="observability/:opCode/:envCode/connect" element={<ConnectPage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/new" element={<CreateProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDashboardPage />} />
        </Route>

        {/* Unknown routes → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
