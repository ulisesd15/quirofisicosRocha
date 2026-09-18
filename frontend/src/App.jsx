// frontend/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import HomePage from "./components/HomePage.jsx";

import MyAppointmentsPage from "./components/pages/appointment/MyAppointmentsPage.jsx";
import UserSettingsPage from "./components/pages/userSettings/UserSettigns.jsx";
import LoginPage from "./components/pages/login/LoginPage.jsx";
import RegisterPage from "./components/pages/register/RegisterPage.jsx";
import AppointmentPage from "./components/pages/appointment/AppointmentPage.jsx";
import AuthSuccessPage from "./components/pages/login/AuthSuccessPage.jsx";
import NotFoundPage from "./components/pages/err/NotFoundPage.jsx";
import ReschedulePage from "./components/pages/appointment/ReschedulePage.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public routes with shared layout */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="appointments" element={<AppointmentPage />} />
        <Route path="/appointments" element={<MyAppointmentsPage />} />
        <Route path="/appointments/:appointmentId/reschedule" element={<ReschedulePage />} />

        {/* User settings */}
        <Route path="/settings" element={<UserSettingsPage />} />
        {/* Fallback inside layout */}
        <Route path="auth/success" element={<AuthSuccessPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}







