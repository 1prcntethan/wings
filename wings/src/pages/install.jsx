import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import BetaDisclaimer from "../components/betadisclaimer";
import "./install.css";
import {
  canInstall,
  installBrowserName,
  isInAppBrowser,
  isInstalled,
  isIOS,
  promptInstall,
  subscribeInstallPrompt,
} from "../utilites/installprompt.js";

function InstallSteps() {
  const [ready, setReady] = useState(canInstall);
  const [installError, setInstallError] = useState(null);
  const browser = installBrowserName();

  useEffect(
    () => subscribeInstallPrompt((prompt) => setReady(Boolean(prompt))),
    [],
  );

  if (isInstalled()) {
    return <p>Wings is already on your home screen.</p>;
  }

  async function onInstall() {
    setInstallError(null);
    const outcome = await promptInstall();
    if (outcome === "unavailable") {
      setInstallError("Couldn't open the install sheet. Use the steps below.");
    }
  }

  if (isInAppBrowser()) {
    return (
      <>
        <p>This browser can't add Wings to your home screen.</p>
        <ol>
          <li>Open the menu in this browser.</li>
          <li>Tap Open in {browser}.</li>
          <li>Come back to this page and follow the steps there.</li>
        </ol>
      </>
    );
  }

  if (isIOS()) {
    return (
      <>
        <p>Safari can add Wings to your home screen.</p>
        <ol>
          <li>
            Tap the Share button at the bottom of Safari. It is a square with
            an arrow pointing up.
          </li>
          <li>Scroll the share sheet and tap Add to Home Screen.</li>
          <li>Tap Add.</li>
        </ol>
      </>
    );
  }

  return (
    <>
      <p>Chrome can add Wings to your home screen.</p>
      {ready && (
        <button type="button" className="install-page__button" onClick={onInstall}>
          install Wings
        </button>
      )}
      {installError && <p className="install-page__error">{installError}</p>}
      <ol>
        <li>Tap the menu (three dots) in Chrome.</li>
        <li>Tap Install app, or Add to Home screen.</li>
        <li>Confirm.</li>
      </ol>
    </>
  );
}

export function Install() {
  return (
    <>
      <Navbar />
      <BetaDisclaimer />
      <div className="install-text">
        <div className="install-title">add Wings to your home screen</div>
        <InstallSteps />
      </div>
    </>
  );
}
