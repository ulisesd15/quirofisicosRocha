// frontend/src/main.jsx
import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

// Registers window.authManager so login/register pages, the navbar,
// and API helpers share one auth source of truth.
import "./components/utils/auth";


const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Could not find the #root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);