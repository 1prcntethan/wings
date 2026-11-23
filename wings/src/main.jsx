import "./utilites/installprompt.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./config/auth-context.jsx";
import { ErrorBoundary } from "./components/errorboundary.jsx";
import { initSentry } from "./config/sentry.js";

const CHUNK_RELOAD = "wings-chunk-reload";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD)) return;
    sessionStorage.setItem(CHUNK_RELOAD, "1");
  } catch {
    return;
  }
  window.location.reload();
});

initSentry();

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>,
);
