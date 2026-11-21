import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import "./installguide.css";
import {
  currentInstallContext,
  dismissInstallPrompt,
  getInstallSnapshot,
  promptInstall,
  subscribeInstallPrompt,
} from "../utilites/installprompt.js";
import {
  installPageUrl,
  shouldShowInstallSheet,
} from "../utilites/installplatform.js";

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2a1 1 0 0 1 .7.3l4.2 4.2a1 1 0 0 1-1.4 1.4L13 5.6V13a1 1 0 1 1-2 0V5.6L8.5 8.1a1 1 0 1 1-1.4-1.4l4.2-4.2a1 1 0 0 1 .7-.3z"
      />
      <path
        fill="currentColor"
        d="M6 9.5A2.5 2.5 0 0 0 3.5 12v6.5A2.5 2.5 0 0 0 6 21h12a2.5 2.5 0 0 0 2.5-2.5V12A2.5 2.5 0 0 0 18 9.5h-2.2a1 1 0 1 0 0 2H18a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V12a.5.5 0 0 1 .5-.5h2.2a1 1 0 1 0 0-2H6z"
      />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 8.2v7.6M8.2 12h7.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.2 12.2 11 15l4.8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="8"
        y="7"
        width="11"
        height="13"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6 15.5H5.5A1.5 1.5 0 0 1 4 14V5.5A1.5 1.5 0 0 1 5.5 4H14a1.5 1.5 0 0 1 1.5 1.5V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const GLYPHS = {
  share: ShareGlyph,
  add: AddGlyph,
  check: CheckGlyph,
  menu: MenuGlyph,
  copy: CopyGlyph,
};

function shareDetail(context) {
  if (context.browser === "safari" && context.ipad) {
    return "In Safari, Share is the square with an arrow in the top toolbar.";
  }
  if (context.browser === "safari") {
    return "In Safari, Share is the square with an arrow in the bottom toolbar.";
  }
  return `In ${context.browserLabel}, Share is the square with an arrow in the toolbar.`;
}

function menuDetail(context) {
  if (context.browser === "samsung") {
    return "In Samsung Internet, open the menu and tap Add page to, then Home screen.";
  }
  if (context.browser === "firefox") {
    return "In Firefox, open the menu and tap Add to Home screen.";
  }
  if (context.browser === "edge") {
    return "In Edge, open the menu (three dots) and tap Add to phone or Install app.";
  }
  return `In ${context.browserLabel}, open the menu (three dots) and tap Install app or Add to Home screen.`;
}

function guideContent(context) {
  if (context.mode === "installed") {
    return {
      intro: "Wings is already on this home screen. Open it from the icon.",
      steps: [],
    };
  }
  if (context.mode === "in-app") {
    const name = context.inApp?.id === "webview" ? "This app" : context.inApp?.name;
    return {
      intro: `${name}'s browser can't add Wings to your home screen. Open this page in ${context.openIn}.`,
      copy: true,
      steps: [
        {
          icon: "copy",
          title: "copy the link",
          text: "Use the button, or select the address below and copy it.",
        },
        {
          icon: "menu",
          title: `open ${context.openIn}`,
          text: `Paste the link into ${context.openIn}. Some apps also have Open in ${context.openIn} in the menu.`,
        },
        {
          icon: "add",
          title: "add to home screen",
          text: `Once the page is open in ${context.openIn}, follow the add steps there.`,
        },
      ],
    };
  }
  if (context.mode === "ios" && context.needsSafari) {
    return {
      intro: `${context.browserLabel} on this iOS version can't add to the home screen. Open the page in Safari.`,
      copy: true,
      steps: [
        {
          icon: "copy",
          title: "copy the link",
          text: "Copy the address, then open Safari and paste it.",
        },
        {
          icon: "share",
          title: "tap share",
          text: "In Safari, Share is the square with an arrow in the toolbar.",
        },
        {
          icon: "add",
          title: "add to home screen",
          text: "Scroll the share menu and tap Add to Home Screen, then Add.",
        },
      ],
    };
  }
  if (context.mode === "ios") {
    const intro = context.browser === "safari"
      ? "Safari can put Wings on your home screen. It takes three taps."
      : `${context.browserLabel} on iOS 16.4 or later can put Wings on your home screen from the share menu.`;
    return {
      intro,
      steps: [
        { icon: "share", title: "tap share", text: shareDetail(context) },
        {
          icon: "add",
          title: "add to home screen",
          text: "Scroll the share menu and tap Add to Home Screen.",
        },
        {
          icon: "check",
          title: "tap add",
          text: "Confirm, then open Wings from the new icon.",
        },
      ],
    };
  }
  if (context.mode === "android" || context.mode === "other") {
    return {
      intro: context.mode === "android"
        ? `${context.browserLabel} can add Wings to your home screen.`
        : "Your browser can add Wings to your home screen from its menu.",
      install: true,
      steps: [
        { icon: "menu", title: "open the menu", text: menuDetail(context) },
        {
          icon: "add",
          title: "add to home screen",
          text: "Confirm the install card. Wings then opens from its icon.",
        },
      ],
    };
  }
  return {
    intro: "Adding Wings to a home screen is for phones. On a computer, Chrome and Edge can install it from the icon in the address bar.",
    install: true,
    steps: [
      {
        icon: "menu",
        title: "install icon",
        text: "In Chrome or Edge, use the install icon in the address bar, or the menu item Install Wings.",
      },
    ],
  };
}

function useInstallController() {
  const { pathname } = useLocation();
  const install = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallSnapshot,
    getInstallSnapshot,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("idle");
  const linkRef = useRef(null);
  const panelRef = useRef(null);
  const detected = currentInstallContext();
  const installed = install.sessionInstalled || detected.installed;
  const context = installed
    ? { ...detected, installed: true, mode: "installed", needsSafari: false }
    : detected;
  const showSheet = shouldShowInstallSheet({
    installed,
    mobile: context.mobile,
    pathname,
    now: Date.now(),
    remindAt: install.memory.remindAt,
    sessionHidden: install.sessionHidden,
  });
  const pageUrl = installPageUrl(window.location.href);

  useEffect(() => {
    if (!showSheet) return undefined;
    document.documentElement.classList.add("disable-scroll");
    panelRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") dismissInstallPrompt();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("disable-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [showSheet]);

  async function onInstall() {
    setError("");
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "unavailable") {
      setError("Couldn't open the install card. Use the steps below.");
    }
  }

  async function onCopy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(pageUrl);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  }

  return {
    context,
    content: guideContent(context),
    showSheet,
    canPrompt: install.prompt !== null,
    error,
    busy,
    copyState,
    pageUrl,
    linkRef,
    panelRef,
    remindLater() {
      dismissInstallPrompt();
    },
    onInstall,
    onCopy,
  };
}

function InstallSteps({ steps }) {
  if (steps.length === 0) return null;
  return (
    <ol className="install-steps">
      {steps.map((step) => {
        const Glyph = GLYPHS[step.icon] || AddGlyph;
        return (
          <li key={step.title} className="install-step">
            <span className="install-step__icon">
              <Glyph />
            </span>
            <span>
              <span className="install-step__title">{step.title}</span>
              <span className="install-step__text">{step.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function InstallActions({ controller }) {
  const { context, content, canPrompt, error, busy, copyState, pageUrl, linkRef, onInstall, onCopy } = controller;
  const showInstall = content.install && canPrompt && context.mode !== "installed";
  return (
    <>
      <p className="install-guide__intro">{content.intro}</p>
      {showInstall && (
        <button type="button" className="install-action" onClick={onInstall} disabled={busy}>
          add to home screen
        </button>
      )}
      {error && <p className="install-guide__error">{error}</p>}
      {showInstall && (
        <p className="install-guide__fallback">If that doesn't open a card, use the menu.</p>
      )}
      {content.copy && (
        <div className="install-copy">
          <button type="button" className="install-action" onClick={onCopy}>
            {copyState === "copied" ? "link copied" : "copy link"}
          </button>
          <label className="install-copy__label">
            page link
            <input ref={linkRef} className="install-copy__input" readOnly value={pageUrl} onFocus={(event) => event.target.select()} />
          </label>
          {copyState === "copied" && (
            <p className="install-copy__status">Paste it into {context.openIn}.</p>
          )}
          {copyState === "manual" && (
            <p className="install-copy__status">Select the link above and copy it.</p>
          )}
        </div>
      )}
      <InstallSteps steps={content.steps} />
    </>
  );
}

export function InstallGuide() {
  const controller = useInstallController();
  const { context } = controller;
  return (
    <div
      className="install-guide"
      data-install-mode={context.mode}
      data-install-browser={context.browser}
      data-install-inapp={context.inApp?.id || ""}
      data-install-needs-safari={context.needsSafari ? "true" : "false"}
    >
      <InstallActions controller={controller} />
      {context.mode !== "installed" && (
        <p className="install-guide__note">You can keep using Wings in the browser.</p>
      )}
    </div>
  );
}

export function InstallSheet() {
  const controller = useInstallController();
  const { context, showSheet, panelRef, remindLater } = controller;

  if (!showSheet) return null;

  return (
    <div className="install-sheet">
      <div className="install-sheet__scrim" onClick={remindLater} />
      <div
        className="install-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-sheet-title"
        tabIndex={-1}
        ref={panelRef}
        data-install-sheet="open"
        data-install-mode={context.mode}
        data-install-browser={context.browser}
        data-install-inapp={context.inApp?.id || ""}
      >
        <div className="install-sheet__grabber" aria-hidden="true" />
        <button type="button" className="install-sheet__close" aria-label="remind me later" onClick={remindLater}>
          ×
        </button>
        <h2 id="install-sheet-title" className="install-sheet__title">add wings</h2>
        <InstallActions controller={controller} />
        <button type="button" className="install-later" onClick={remindLater}>
          remind me later
        </button>
        <p className="install-sheet__note">
          You can keep using Wings in the browser. Find this again from Learn, then Install.
        </p>
      </div>
    </div>
  );
}
