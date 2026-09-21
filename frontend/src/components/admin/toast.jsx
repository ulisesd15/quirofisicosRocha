// frontend/src/components/admin/toast.jsx
//
// Lightweight toast notifications for the admin panel.
// Usage: showToast("Guardado", "success") from anywhere, and mount
// <AdminToasts /> once inside AdminLayout.

import React, { useEffect, useState } from "react";

const TOAST_EVENT = "admin-toast";

/**
 * Fires a toast notification.
 * @param {string} message - Text to display
 * @param {"info"|"success"|"error"} [type]
 * @param {number} [timeout] - Milliseconds before auto-dismiss
 */
export function showToast(message, type = "info", timeout = 3500) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { message, type, timeout } })
  );
}

let nextToastId = 1;

export default function AdminToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type, timeout } = event.detail;
      const id = nextToastId++;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeout || 3500);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container position-fixed p-3"
      style={{ top: 0, right: 0, zIndex: 1090 }}
    >
      {toasts.map((toast) => {
        const alertClass =
          toast.type === "success"
            ? "alert-success"
            : toast.type === "error"
              ? "alert-danger"
              : "alert-info";

        return (
          <div
            key={toast.id}
            className={`alert ${alertClass} shadow mb-2`}
            role="alert"
            style={{ minWidth: "280px" }}
          >
            <i className="fas fa-info-circle me-2" />
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
