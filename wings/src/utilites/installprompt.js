const DISMISS_KEY = "wings-install-dismissed";

let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(deferredPrompt));
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  notify();
});

export function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  const agent = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(agent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  );
}

export function isInAppBrowser() {
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance/i.test(
    window.navigator.userAgent,
  );
}

export function installBrowserName() {
  return isIOS() ? "Safari" : "Chrome";
}

export function canInstall() {
  return deferredPrompt !== null;
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  listener(deferredPrompt);
  return () => listeners.delete(listener);
}

export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    notify();
    return "unavailable";
  }
}

export function isInstallDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private browsing can block storage. The bar still hides for this visit.
  }
}
