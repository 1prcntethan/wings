import {
  detectInstallContext,
  readInstallMemory,
  rememberDismiss,
  rememberInstall,
} from "./installplatform.js";

let deferredPrompt = null;
let sessionHidden = false;
let sessionInstalled = false;
let memory = { remindAt: 0, dismissCount: 0 };
let memoryLoaded = false;
let snapshot = null;
const listeners = new Set();

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ensureMemory() {
  if (memoryLoaded) return;
  memoryLoaded = true;
  memory = readInstallMemory(browserStorage(), Date.now());
}

function publish() {
  ensureMemory();
  snapshot = {
    prompt: deferredPrompt,
    sessionHidden,
    sessionInstalled,
    memory,
  };
  listeners.forEach((listener) => listener());
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallSnapshot() {
  if (!snapshot) {
    ensureMemory();
    snapshot = {
      prompt: deferredPrompt,
      sessionHidden,
      sessionInstalled,
      memory,
    };
  }
  return snapshot;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  publish();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  sessionInstalled = true;
  sessionHidden = true;
  memory = rememberInstall(browserStorage(), Date.now());
  memoryLoaded = true;
  publish();
});

export function currentInstallContext() {
  return detectInstallContext(window.navigator, (query) => window.matchMedia(query));
}

export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  const prompt = deferredPrompt;
  try {
    // prompt() has to run in the tap, before any store update re-renders the button.
    const pending = prompt.prompt();
    deferredPrompt = null;
    publish();
    await pending;
    const choice = await prompt.userChoice;
    const outcome = choice?.outcome === "accepted" ? "accepted" : "dismissed";
    sessionHidden = true;
    if (outcome === "accepted") {
      sessionInstalled = true;
      memory = rememberInstall(browserStorage(), Date.now());
    } else {
      memory = rememberDismiss(browserStorage(), Date.now());
    }
    memoryLoaded = true;
    publish();
    return outcome;
  } catch {
    deferredPrompt = null;
    publish();
    return "unavailable";
  }
}

export function dismissInstallPrompt(now = Date.now()) {
  sessionHidden = true;
  memory = rememberDismiss(browserStorage(), now);
  memoryLoaded = true;
  publish();
  return memory;
}
