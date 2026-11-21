// Pure install-platform checks. This file never touches window, so node tests can import it.

export const INSTALL_REMIND_KEY = "wings-install-remind-at";
export const INSTALL_DISMISS_COUNT_KEY = "wings-install-dismiss-count";
export const INSTALL_LEGACY_DISMISS_KEY = "wings-install-dismissed";

const DAY_MS = 24 * 60 * 60 * 1000;
export const INSTALL_SUCCESS_SNOOZE_MS = 90 * DAY_MS;

const BROWSER_LABELS = {
  safari: "Safari",
  chrome: "Chrome",
  firefox: "Firefox",
  edge: "Edge",
  samsung: "Samsung Internet",
  opera: "Opera",
  other: "your browser",
};

const IN_APP_BROWSERS = [
  { id: "instagram", name: "Instagram", pattern: /Instagram/i },
  { id: "tiktok", name: "TikTok", pattern: /TikTok|musical_ly|BytedanceWebview|ByteLocale/i },
  { id: "snapchat", name: "Snapchat", pattern: /Snapchat/i },
  { id: "gmail", name: "Gmail", pattern: /\bGmail\b|com\.google\.android\.gm/i },
  { id: "messenger", name: "Messenger", pattern: /Messenger|FB_IAB\/MESSENGER|FBAN\/Messenger/i },
  { id: "facebook", name: "Facebook", pattern: /FBAN|FBAV|FB_IAB|FBIOS/i },
  { id: "webview", name: "This app", pattern: /;\s*wv\)/i },
];

function userAgentOf(nav) {
  return String(nav?.userAgent || "");
}

export function isIos(nav) {
  const ua = userAgentOf(nav);
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return nav?.platform === "MacIntel" && (nav?.maxTouchPoints || 0) > 1;
}

export function isIpad(nav) {
  const ua = userAgentOf(nav);
  if (/iPad/i.test(ua)) return true;
  return isIos(nav) && nav?.platform === "MacIntel" && (nav?.maxTouchPoints || 0) > 1;
}

export function detectInAppBrowser(ua) {
  for (const rule of IN_APP_BROWSERS) {
    if (rule.pattern.test(ua)) {
      return { id: rule.id, name: rule.name };
    }
  }
  return null;
}

export function iosVersion(ua) {
  const match = /OS (\d+)[_.](\d+)/i.exec(ua);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function iosBrowser(ua) {
  if (/CriOS/i.test(ua)) return "chrome";
  if (/FxiOS/i.test(ua)) return "firefox";
  if (/EdgiOS/i.test(ua)) return "edge";
  if (/OPiOS/i.test(ua)) return "opera";
  return "safari";
}

export function androidBrowser(ua) {
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/EdgA|Edg\//i.test(ua)) return "edge";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/OPR\/|Opera/i.test(ua)) return "opera";
  if (/Chrome|CriOS/i.test(ua)) return "chrome";
  return "other";
}

// Safari can always add to the home screen. Other iOS browsers gained the
// share-sheet action in iOS 16.4.
export function iosBrowserCanInstall(ua, browser) {
  if (browser === "safari") return true;
  const version = iosVersion(ua);
  if (!version) return true;
  return version.major > 16 || (version.major === 16 && version.minor >= 4);
}

export function isStandalone(nav, matchMedia) {
  if (nav?.standalone === true) return true;
  if (typeof matchMedia !== "function") return false;
  const modes = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"];
  return modes.some((mode) => {
    try {
      return matchMedia(`(display-mode: ${mode})`).matches === true;
    } catch {
      return false;
    }
  });
}

export function detectInstallContext(nav, matchMedia) {
  const ua = userAgentOf(nav);
  const installed = isStandalone(nav, matchMedia);
  const inApp = detectInAppBrowser(ua);
  const ios = isIos(nav);
  const android = /Android/i.test(ua) && !ios;
  const mobile = Boolean(inApp) || ios || android || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  let browser = "other";
  if (ios) browser = iosBrowser(ua);
  else if (android) browser = androidBrowser(ua);
  else if (/Edg\//i.test(ua)) browser = "edge";
  else if (/Firefox/i.test(ua)) browser = "firefox";
  else if (/Chrome/i.test(ua)) browser = "chrome";
  else if (/Safari/i.test(ua)) browser = "safari";

  const os = ios ? "ios" : android ? "android" : "other";
  let mode = "desktop";
  if (installed) mode = "installed";
  else if (inApp) mode = "in-app";
  else if (!mobile) mode = "desktop";
  else if (ios) mode = "ios";
  else if (android) mode = "android";
  else mode = "other";

  const needsSafari = mode === "ios" && !iosBrowserCanInstall(ua, browser);

  return {
    installed,
    mobile,
    os,
    browser,
    browserLabel: BROWSER_LABELS[browser] || BROWSER_LABELS.other,
    inApp,
    openIn: ios ? "Safari" : "Chrome",
    mode,
    ipad: isIpad(nav),
    needsSafari,
  };
}

export function remindDelayMs(dismissCount) {
  if (dismissCount >= 3) return 30 * DAY_MS;
  if (dismissCount >= 2) return 14 * DAY_MS;
  return 7 * DAY_MS;
}

function parseStoredNumber(value) {
  if (value == null || value === "") return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

function asTime(now) {
  return typeof now === "number" && Number.isFinite(now) ? now : Date.now();
}

function writeMemory(storage, memory) {
  try {
    storage.setItem(INSTALL_DISMISS_COUNT_KEY, String(memory.dismissCount));
    storage.setItem(INSTALL_REMIND_KEY, String(memory.remindAt));
    storage.removeItem(INSTALL_LEGACY_DISMISS_KEY);
  } catch {
    // Private browsing can block storage. The sheet still hides for this visit.
  }
}

export function readInstallMemory(storage, now = Date.now()) {
  const stamp = asTime(now);
  if (!storage) return { remindAt: 0, dismissCount: 0 };
  const remindAt = parseStoredNumber(storage.getItem(INSTALL_REMIND_KEY));
  const dismissCount = parseStoredNumber(storage.getItem(INSTALL_DISMISS_COUNT_KEY));
  const legacy = storage.getItem(INSTALL_LEGACY_DISMISS_KEY) === "1";
  if (!legacy) return { remindAt, dismissCount };
  if (remindAt > 0) {
    try {
      storage.removeItem(INSTALL_LEGACY_DISMISS_KEY);
    } catch {
      // Ignore a blocked remove. The timestamp already snoozes the sheet.
    }
    return { remindAt, dismissCount };
  }
  const migrated = {
    dismissCount: Math.max(dismissCount, 1),
    remindAt: stamp + remindDelayMs(1),
  };
  writeMemory(storage, migrated);
  return migrated;
}

export function rememberDismiss(storage, now) {
  const stamp = asTime(now);
  const memory = readInstallMemory(storage, stamp);
  const dismissCount = memory.dismissCount + 1;
  const next = {
    dismissCount,
    remindAt: Math.max(memory.remindAt, stamp + remindDelayMs(dismissCount)),
  };
  if (storage) writeMemory(storage, next);
  return next;
}

export function rememberInstall(storage, now) {
  const stamp = asTime(now);
  const memory = readInstallMemory(storage, stamp);
  const next = {
    dismissCount: memory.dismissCount,
    remindAt: Math.max(memory.remindAt, stamp + INSTALL_SUCCESS_SNOOZE_MS),
  };
  if (storage) writeMemory(storage, next);
  return next;
}

export function shouldShowInstallSheet({
  installed = false,
  mobile = false,
  pathname = "/",
  now = 0,
  remindAt = 0,
  sessionHidden = false,
} = {}) {
  if (installed || sessionHidden || !mobile) return false;
  if (pathname === "/install" || pathname === "/install/") return false;
  if (Number.isFinite(remindAt) && remindAt > now) return false;
  return true;
}

export function installPageUrl(href) {
  const url = new URL(href, "https://wingssw.com");
  url.hash = "";
  url.search = "";
  url.pathname = "/";
  return url.href;
}
