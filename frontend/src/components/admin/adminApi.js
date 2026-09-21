// frontend/src/components/admin/adminApi.js
//
// Shared fetch wrapper for all admin API calls.
// Uses relative /api URLs so the Vite dev proxy works in development
// and same-origin requests work in production.

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("userToken") ||
    ""
  );
}

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Performs an authenticated request against the admin API.
 * @param {string} path - Route beginning with /api
 * @param {object} [options] - fetch options (method, body as object, etc.)
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} with a Spanish, user-facing message on failure
 */
export async function adminApi(path, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: authHeaders(),
    ...options,
  };

  if (options.body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(path, config);
  } catch (networkError) {
    console.error("[adminApi] Network error:", networkError);
    throw new Error("No se pudo conectar con el servidor");
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (parseError) {
      data = null;
    }
  }

  if (!response.ok) {
    // 401/403 means the session expired; let the layout handle it.
    const error = new Error(
      data?.error ||
        data?.message ||
        `Error del servidor (${response.status})`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

/** Formats an ISO date or YYYY-MM-DD string for display. */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Formats a HH:mm(:ss) time string as a 12-hour AM/PM string. */
export function formatTime(timeStr) {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":"))
    return "";
  const [hour, minute] = timeStr.split(":");
  let h = parseInt(hour, 10);
  if (isNaN(h) || minute === undefined) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
}

/** Maps an appointment status to its Bootstrap badge class. */
export function statusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "bg-warning text-dark";
    case "confirmed":
      return "bg-success";
    case "completed":
      return "bg-primary";
    case "cancelled":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

/** Maps an appointment status to its Spanish label. */
export function statusText(status) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmada";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
}
