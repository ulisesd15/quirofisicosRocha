// frontend/src/components/admin/pages/schedule/SchedulePage.jsx
//
// Container for the schedule management tabs: regular business hours,
// schedule exceptions, and public announcements.

import React, { useState } from "react";

import BusinessHoursTab from "./BusinessHoursTab";
import ExceptionsTab from "./ExceptionsTab";
import AnnouncementsTab from "./AnnouncementsTab";

const TABS = [
  { id: "business-hours", label: "Horarios Regulares", icon: "fa-clock" },
  { id: "exceptions", label: "Excepciones y Cierres", icon: "fa-calendar-times" },
  { id: "announcements", label: "Anuncios Públicos", icon: "fa-bullhorn" },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState("business-hours");

  return (
    <div className="admin-section pt-3 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="fas fa-calendar-alt me-2 text-primary" />
          Gestión de Horarios
        </h2>
      </div>

      {/* Schedule Management Tabs */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        {TABS.map((tab) => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
              className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
              type="button"
              role="tab"
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas ${tab.icon} me-2`} />
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tab-content">
        {activeTab === "business-hours" && <BusinessHoursTab />}
        {activeTab === "exceptions" && <ExceptionsTab />}
        {activeTab === "announcements" && <AnnouncementsTab />}
      </div>
    </div>
  );
}
