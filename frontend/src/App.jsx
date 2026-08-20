import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthSuccessPage from './pages/AuthSuccessPage';
import NotFoundPage from './pages/NotFoundPage';

import BookAppointmentPage from './pages/BookAppointmentPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import ReschedulePage from './pages/ReschedulePage';
import UserSettingsPage from './pages/UserSettingsPage';

// Admin panel migration is deferred — out of scope for now.

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth-success" element={<AuthSuccessPage />} />

        {/* /appointment allows guest booking in the old flow, so it stays public. */}
        <Route path="/appointment" element={<BookAppointmentPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/mis-citas" element={<MyAppointmentsPage />} />
          <Route path="/reschedule/:id" element={<ReschedulePage />} />
          <Route path="/user-settings" element={<UserSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
