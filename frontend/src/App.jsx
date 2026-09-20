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
      <Route path="/" element={<PublicLayout />}>
        {/* Homepage */}
        <Route index element={<HomePage />} />

        {/* Authentication */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="auth/success" element={<AuthSuccessPage />} />

        {/* Appointments */}
        <Route path="appointments/new" element={<AppointmentPage />} />
        <Route path="mis-citas" element={<MyAppointmentsPage />} />

        {/* Reschedule specific appointment */}
        <Route path="appointments/:appointmentId/reschedule" element={<ReschedulePage />} />

        {/* User settings */}
        <Route path="userSettings" element={<UserSettingsPage />} />

        {/* Future user pages */}
        {/* 
        <Route path="historial" element={<HistoryPage />} />
        <Route path="mis-tratamientos" element={<TreatmentsPage />} />
        <Route path="mis-documentos" element={<DocumentsPage />} />
        <Route path="mensajes" element={<MessagesPage />} />
        */}

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}