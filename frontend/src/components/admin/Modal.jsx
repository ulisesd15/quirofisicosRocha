// frontend/src/components/admin/Modal.jsx
//
// Controlled Bootstrap-styled modal that does not depend on the global
// Bootstrap JS bundle. Render it with `show` and provide an onClose.

import React, { useEffect } from "react";

export default function Modal({
  show,
  title,
  onClose,
  children,
  footer,
  size = "",
}) {
  useEffect(() => {
    if (!show) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    };
  }, [show, onClose]);

  if (!show) return null;

  const dialogClass =
    size === "lg" ? "modal-lg" : size === "sm" ? "modal-sm" : "";

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1050 }}
      />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ zIndex: 1055 }}
      >
        <div className={`modal-dialog ${dialogClass}`}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
