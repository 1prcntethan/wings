import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./installbanner.css";
import {
  canInstall,
  dismissInstallPrompt,
  isInstallDismissed,
  isInstalled,
  promptInstall,
  subscribeInstallPrompt,
} from "../utilites/installprompt.js";

export default function InstallBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(canInstall);
  const [dismissed, setDismissed] = useState(isInstallDismissed);

  useEffect(() => subscribeInstallPrompt((prompt) => setReady(Boolean(prompt))), []);

  if (isInstalled() || dismissed || location.pathname === "/install") {
    return null;
  }

  async function onInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      dismissInstallPrompt();
      setDismissed(true);
      return;
    }
    if (outcome === "unavailable") {
      navigate("/install");
    }
  }

  function onDismiss() {
    dismissInstallPrompt();
    setDismissed(true);
  }

  return (
    <div className="install-bar">
      <p className="install-bar__text">
        Add <span className="install-bar__brand">Wings</span> to your home screen.
      </p>
      {ready ? (
        <button type="button" className="install-bar__action" onClick={onInstall}>
          install
        </button>
      ) : (
        <Link to="/install" className="install-bar__action">
          add
        </Link>
      )}
      <button
        type="button"
        className="install-bar__dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
