// ============================================================
// App.jsx  –  Router + Routes (auth flow only, up to login)
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";

import UIDAILogin from "./pages/Uidailogin";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth flow — login / forgot / reset password */}
        <Route path="/login" element={<UIDAILogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Everything else lands on the login page for now */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
