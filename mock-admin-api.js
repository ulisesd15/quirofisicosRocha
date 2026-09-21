// Test-only mock of the backend admin API with in-memory data.
// Shape-compatible with backend/routes/adminRoutes.js for UI verification.
const express = require("express");
const app = express();
app.use(express.json());

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

const users = [
  { id: 1, fullName: "Admin General", email: "admin@test.com", phone: "6641110000", role: "admin", provider: "local", isVerified: true, createdAt: "2026-01-10T10:00:00Z" },
  { id: 2, fullName: "María López", email: "maria@test.com", phone: "6642220000", role: "user", provider: "local", isVerified: true, createdAt: "2026-02-11T10:00:00Z" },
  { id: 3, fullName: "Juan Pérez", email: "juan@test.com", phone: "6643330000", role: "user", provider: "google", isVerified: false, createdAt: "2026-03-12T10:00:00Z" },
];

const appointments = [
  { id: 1, fullName: "María López", email: "maria@test.com", phone: "6642220000", date: today, time: "10:00:00", status: "confirmed", note: "Consulta inicial", userId: 2 },
  { id: 2, fullName: "Juan Pérez", email: "juan@test.com", phone: "6643330000", date: tomorrow, time: "16:30:00", status: "pending", note: "", userId: 3 },
  { id: 3, fullName: "María López", email: "maria@test.com", phone: "6642220000", date: today, time: "12:00:00", status: "completed", note: "Terapia", userId: 2 },
];

let businessHours = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day, i) => ({
  id: i + 1, dayOfWeek: day, isOpen: day !== "Sunday",
  openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00",
}));

let scheduleExceptions = [
  { id: 1, reason: "Día del clínico", description: "Capacitación", startDate: tomorrow, endDate: null, isClosed: true, customOpenTime: null, customCloseTime: null },
];

let announcements = [
  { id: 1, title: "Promoción de temporada", message: "20% de descuento en terapia.", announcementType: "info", priority: "normal", startDate: today, endDate: null, showOnHomepage: true, createdByName: "Admin General" },
];

let settings = {
  clinicName: { value: "Quirofísicos Rocha" },
  clinicPhone: { value: "6641234567" },
  clinicAddress: { value: "Av. Revolución 123, Tijuana" },
  clinicEmail: { value: "contacto@rocha.com" },
  clinicDescription: { value: "Clínica quiropráctica" },
  appointmentDuration: { value: "60" },
  advanceBookingDays: { value: "30" },
  autoConfirmAppointments: { value: "false" },
};

// --- Auth ---
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ success: false, message: "Credenciales inválidas" });
  res.json({ success: true, message: "ok", token: "mock-token", user: { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, authProvider: "local" } });
});

app.get("/api/auth/profile", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token !== "mock-token") return res.status(401).json({ error: "Unauthorized" });
  const user = users[0];
  res.json({ id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, authProvider: "local", isVerified: true, createdAt: user.createdAt });
});

// --- Dashboard ---
app.get("/api/admin/dashboard/stats", (req, res) => {
  res.json({
    totalUsers: users.length,
    totalAppointments: appointments.length,
    todayAppointments: appointments.filter((a) => a.date === today).length,
    pendingAppointments: appointments.filter((a) => a.status === "pending").length,
    recentAppointments: appointments.slice(0, 5).map((a) => ({ id: a.id, fullName: a.fullName, email: a.email, date: a.date, time: a.time, status: a.status })),
  });
});

// --- Users ---
app.get("/api/admin/users", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  res.json({
    users: users.map((u) => ({ id: u.id, name: u.fullName, fullName: u.fullName, email: u.email, phone: u.phone, provider: u.provider, role: u.role, createdAt: u.createdAt })).slice((page - 1) * limit, page * limit),
    pagination: { currentPage: page, totalPages: Math.ceil(users.length / limit), totalRecords: users.length, limit },
  });
});

app.get("/api/admin/users/unverified", (req, res) => {
  res.json({ users: users.filter((u) => !u.isVerified && u.role !== "admin") });
});

app.get("/api/admin/users/:id", (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

app.put("/api/admin/users/:id", (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  Object.assign(user, req.body);
  res.json({ message: "User updated" });
});

app.put("/api/admin/users/:id/verify", (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (user) user.isVerified = true;
  res.json({ message: "verified" });
});

app.delete("/api/admin/users/:id", (req, res) => {
  const idx = users.findIndex((u) => u.id === Number(req.params.id));
  if (idx >= 0) users.splice(idx, 1);
  res.json({ message: "deleted" });
});

// --- Appointments ---
app.get("/api/admin/appointments", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  res.json({
    appointments: appointments.slice((page - 1) * limit, page * limit),
    pagination: { currentPage: page, totalPages: Math.ceil(appointments.length / limit), totalRecords: appointments.length, limit },
  });
});

app.get("/api/admin/appointments/pending", (req, res) => {
  res.json(appointments.filter((a) => a.status === "pending").map((a) => ({ ...a, user: users.find((u) => u.id === a.userId) })));
});

app.get("/api/admin/appointments/:id", (req, res) => {
  const apt = appointments.find((a) => a.id === Number(req.params.id));
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  res.json({ appointment: apt });
});

app.put("/api/admin/appointments/:id", (req, res) => {
  const apt = appointments.find((a) => a.id === Number(req.params.id));
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  Object.assign(apt, req.body);
  res.json({ message: "Appointment updated" });
});

app.put("/api/admin/appointments/:id/approve", (req, res) => {
  const apt = appointments.find((a) => a.id === Number(req.params.id));
  if (apt) {
    apt.status = "confirmed";
    const u = users.find((x) => x.id === apt.userId);
    if (u) u.isVerified = true;
  }
  res.json({ message: "Cita aprobada y usuario verificado correctamente." });
});

app.delete("/api/admin/appointments/:id", (req, res) => {
  const idx = appointments.findIndex((a) => a.id === Number(req.params.id));
  if (idx >= 0) appointments.splice(idx, 1);
  res.json({ message: "deleted" });
});

// --- Business hours ---
app.get("/api/business-hours", (req, res) => res.json({ businessHours }));

app.put("/api/admin/business-hours", (req, res) => {
  businessHours = req.body.businessHours.map((bh, i) => ({ id: i + 1, ...bh }));
  res.json({ message: "Business hours updated successfully" });
});

// --- Schedule exceptions ---
app.get("/api/admin/schedule-exceptions", (req, res) => res.json({ scheduleExceptions }));

app.post("/api/admin/schedule-exceptions", (req, res) => {
  const id = Math.max(0, ...scheduleExceptions.map((e) => e.id)) + 1;
  scheduleExceptions.push({ id, ...req.body, isActive: true });
  res.json({ message: "Schedule exception added successfully", id });
});

app.delete("/api/admin/schedule-exceptions/:id", (req, res) => {
  scheduleExceptions = scheduleExceptions.filter((e) => e.id !== Number(req.params.id));
  res.json({ message: "deleted" });
});

// --- Announcements ---
app.get("/api/admin/announcements", (req, res) => res.json(announcements));

app.post("/api/admin/announcements", (req, res) => {
  const id = Math.max(0, ...announcements.map((a) => a.id)) + 1;
  announcements.push({ id, ...req.body, isActive: true, createdByName: "Admin General" });
  res.json({ message: "Announcement added successfully", id });
});

app.delete("/api/admin/announcements/:id", (req, res) => {
  announcements = announcements.filter((a) => a.id !== Number(req.params.id));
  res.json({ message: "deleted" });
});

// --- Settings ---
app.get("/api/admin/settings", (req, res) => res.json(settings));

app.put("/api/admin/settings", (req, res) => {
  (req.body.settings || []).forEach(({ key, value }) => {
    settings[key] = settings[key] || {};
    settings[key].value = value;
  });
  res.json({ message: "Settings updated" });
});

// --- Server status + misc ---
app.get("/api/admin/server/status", (req, res) => {
  res.json({ isHealthy: true, uptime: "3600 seconds", cpuUsage: 12, memoryUsage: 96 });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/announcements/active", (req, res) => res.json([]));

app.listen(5001, () => console.log("Mock admin API on :5001"));
