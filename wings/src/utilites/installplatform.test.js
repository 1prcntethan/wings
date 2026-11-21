import assert from "node:assert/strict";
import test from "node:test";
import {
  INSTALL_DISMISS_COUNT_KEY,
  INSTALL_LEGACY_DISMISS_KEY,
  INSTALL_REMIND_KEY,
  INSTALL_SUCCESS_SNOOZE_MS,
  detectInstallContext,
  detectInAppBrowser,
  installPageUrl,
  iosBrowserCanInstall,
  readInstallMemory,
  rememberDismiss,
  rememberInstall,
  remindDelayMs,
  shouldShowInstallSheet,
} from "./installplatform.js";

const DAY = 24 * 60 * 60 * 1000;

function env(userAgent, extra = {}) {
  return detectInstallContext(
    {
      userAgent,
      platform: extra.platform || "",
      maxTouchPoints: extra.maxTouchPoints || 0,
      standalone: extra.standalone === true,
    },
    (query) => ({
      matches: extra.displayMode
        ? query.replace(/\s/g, "").includes(`display-mode:${extra.displayMode}`)
        : false,
    }),
  );
}

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1";
const OLDS_CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/110.0.5481.83 Mobile/15E148 Safari/604.1";
const NEW_CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/111.0.5563.72 Mobile/15E148 Safari/604.1";
const FIREFOX_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15";
const EDGE_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/126.0.2592.56 Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36";
const FIREFOX_ANDROID =
  "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0";
const SAMSUNG_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const DESKTOP_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const INSTAGRAM_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 321.0.0.0.0";
const INSTAGRAM_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 Instagram 321.0.0.0.0";
const TIKTOK =
  "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 musical_ly_2024001";
const SNAPCHAT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Snapchat/12.80.0";
const GMAIL =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.101 Mobile Safari/537.36 Gmail/2024.02.04.599";
const MESSENGER =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/440.0.0.0.0;]";
const FACEBOOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.0.0;]";
const WEBVIEW =
  "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36";

test("iPhone Safari is a mobile share-sheet install", () => {
  const context = env(SAFARI_IPHONE);
  assert.equal(context.mode, "ios");
  assert.equal(context.browser, "safari");
  assert.equal(context.mobile, true);
  assert.equal(context.installed, false);
  assert.equal(context.needsSafari, false);
  assert.equal(context.openIn, "Safari");
  assert.equal(context.inApp, null);
});

test("iPad and iPadOS desktop mode are treated as iOS", () => {
  const ipad = env(
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  );
  assert.equal(ipad.mode, "ios");
  assert.equal(ipad.ipad, true);
  assert.equal(ipad.browser, "safari");

  const ipados = env(DESKTOP_SAFARI, { platform: "MacIntel", maxTouchPoints: 5 });
  assert.equal(ipados.mode, "ios");
  assert.equal(ipados.ipad, true);
  assert.equal(ipados.browser, "safari");
});

test("a desktop Mac is not asked to install", () => {
  const mac = env(DESKTOP_SAFARI, { platform: "MacIntel", maxTouchPoints: 0 });
  assert.equal(mac.mode, "desktop");
  assert.equal(mac.mobile, false);
  const touched = env(DESKTOP_SAFARI, { platform: "MacIntel", maxTouchPoints: 1 });
  assert.equal(touched.mode, "desktop");
  const windows = env(DESKTOP_CHROME, { platform: "Win32" });
  assert.equal(windows.mode, "desktop");
  assert.equal(windows.browser, "chrome");
});

test("iOS Chrome, Edge, and Firefox use the share sheet on 16.4 and later", () => {
  const chrome = env(CHROME_IPHONE);
  assert.equal(chrome.mode, "ios");
  assert.equal(chrome.browser, "chrome");
  assert.equal(chrome.browserLabel, "Chrome");
  assert.equal(chrome.needsSafari, false);
  assert.equal(chrome.inApp, null);

  const edge = env(EDGE_IPHONE);
  assert.equal(edge.browser, "edge");
  assert.equal(edge.needsSafari, false);

  const firefox = env(FIREFOX_IPHONE);
  assert.equal(firefox.browser, "firefox");
  assert.equal(firefox.needsSafari, false);

  assert.equal(iosBrowserCanInstall(NEW_CHROME_IPHONE, "chrome"), true);
  assert.equal(env(NEW_CHROME_IPHONE).needsSafari, false);
  assert.equal(iosBrowserCanInstall(OLDS_CHROME_IPHONE, "chrome"), false);
  assert.equal(env(OLDS_CHROME_IPHONE).needsSafari, true);
  assert.equal(iosBrowserCanInstall(SAFARI_IPHONE, "safari"), true);
});

test("Android Chrome, Samsung Internet, and Firefox stay on Android", () => {
  const chrome = env(CHROME_ANDROID);
  assert.equal(chrome.mode, "android");
  assert.equal(chrome.browser, "chrome");
  assert.equal(chrome.openIn, "Chrome");
  assert.equal(chrome.inApp, null);

  const samsung = env(SAMSUNG_ANDROID);
  assert.equal(samsung.mode, "android");
  assert.equal(samsung.browser, "samsung");

  const firefox = env(FIREFOX_ANDROID);
  assert.equal(firefox.mode, "android");
  assert.equal(firefox.browser, "firefox");
});

test("in-app browsers are named and sent to Safari or Chrome", () => {
  const cases = [
    [INSTAGRAM_IPHONE, "instagram", "Instagram", "Safari"],
    [INSTAGRAM_ANDROID, "instagram", "Instagram", "Chrome"],
    [TIKTOK, "tiktok", "TikTok", "Chrome"],
    [SNAPCHAT, "snapchat", "Snapchat", "Safari"],
    [GMAIL, "gmail", "Gmail", "Chrome"],
    [MESSENGER, "messenger", "Messenger", "Safari"],
    [FACEBOOK, "facebook", "Facebook", "Safari"],
    [WEBVIEW, "webview", "This app", "Chrome"],
  ];
  for (const [ua, id, name, openIn] of cases) {
    const context = env(ua);
    assert.equal(context.mode, "in-app", ua);
    assert.equal(context.mobile, true, ua);
    assert.deepEqual(context.inApp, { id, name }, ua);
    assert.equal(context.openIn, openIn, ua);
    assert.equal(detectInAppBrowser(ua)?.id, id);
  }
});

test("Chrome itself is not treated as an in-app browser", () => {
  assert.equal(detectInAppBrowser(CHROME_ANDROID), null);
  assert.equal(detectInAppBrowser(DESKTOP_CHROME), null);
  assert.equal(detectInAppBrowser(CHROME_IPHONE), null);
});

test("standalone display mode and navigator.standalone count as installed", () => {
  for (const displayMode of ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"]) {
    const context = env(CHROME_ANDROID, { displayMode });
    assert.equal(context.installed, true, displayMode);
    assert.equal(context.mode, "installed", displayMode);
  }
  const safari = env(SAFARI_IPHONE, { standalone: true });
  assert.equal(safari.installed, true);
  assert.equal(safari.mode, "installed");
  const browser = env(SAFARI_IPHONE, { displayMode: "browser" });
  assert.equal(browser.installed, false);
  assert.equal(browser.mode, "ios");
});

test("the first-launch sheet only shows for a phone that has not snoozed", () => {
  const now = Date.UTC(2026, 10, 21);
  assert.equal(
    shouldShowInstallSheet({ mobile: true, pathname: "/", now, remindAt: 0 }),
    true,
  );
  assert.equal(
    shouldShowInstallSheet({ installed: true, mobile: true, pathname: "/", now }),
    false,
  );
  assert.equal(
    shouldShowInstallSheet({ mobile: false, pathname: "/", now }),
    false,
  );
  assert.equal(
    shouldShowInstallSheet({ mobile: true, pathname: "/install", now }),
    false,
  );
  assert.equal(
    shouldShowInstallSheet({ mobile: true, sessionHidden: true, pathname: "/", now }),
    false,
  );
  assert.equal(
    shouldShowInstallSheet({ mobile: true, pathname: "/", now, remindAt: now + DAY }),
    false,
  );
  assert.equal(
    shouldShowInstallSheet({ mobile: true, pathname: "/", now, remindAt: now - 1 }),
    true,
  );
});

test("remind later backs off from a week to a month", () => {
  assert.equal(remindDelayMs(1), 7 * DAY);
  assert.equal(remindDelayMs(2), 14 * DAY);
  assert.equal(remindDelayMs(3), 30 * DAY);
  assert.equal(remindDelayMs(5), 30 * DAY);

  const now = 1_700_000_000_000;
  const storage = memoryStorage();
  const first = rememberDismiss(storage, now);
  assert.equal(first.dismissCount, 1);
  assert.equal(first.remindAt, now + 7 * DAY);
  const second = rememberDismiss(storage, now);
  assert.equal(second.dismissCount, 2);
  assert.equal(second.remindAt, now + 14 * DAY);
  const third = rememberDismiss(storage, now);
  assert.equal(third.dismissCount, 3);
  assert.equal(third.remindAt, now + 30 * DAY);
});

test("an old permanent dismiss becomes a one-week snooze", () => {
  const now = 1_700_000_000_000;
  const storage = memoryStorage({ [INSTALL_LEGACY_DISMISS_KEY]: "1" });
  const memory = readInstallMemory(storage, now);
  assert.equal(memory.dismissCount, 1);
  assert.equal(memory.remindAt, now + 7 * DAY);
  assert.equal(storage.getItem(INSTALL_LEGACY_DISMISS_KEY), null);
  assert.equal(storage.getItem(INSTALL_REMIND_KEY), String(now + 7 * DAY));
  assert.equal(storage.getItem(INSTALL_DISMISS_COUNT_KEY), "1");
});

test("a successful install snoozes longer than a dismissal", () => {
  const now = 1_700_000_000_000;
  const storage = memoryStorage();
  rememberDismiss(storage, now);
  const installed = rememberInstall(storage, now);
  assert.equal(installed.remindAt, now + INSTALL_SUCCESS_SNOOZE_MS);
  assert.equal(installed.dismissCount, 1);
  const later = rememberInstall(storage, now + DAY);
  assert.equal(later.remindAt, now + DAY + INSTALL_SUCCESS_SNOOZE_MS);
  rememberDismiss(storage, now + DAY);
  assert.equal(readInstallMemory(storage, now).remindAt, later.remindAt);
});

test("a click event passed as the time still snoozes for a week", () => {
  const storage = memoryStorage();
  const before = Date.now();
  const memory = rememberDismiss(storage, { type: "click" });
  assert.equal(Number.isFinite(memory.remindAt), true);
  assert.ok(memory.remindAt >= before + 7 * DAY);
  assert.equal(
    shouldShowInstallSheet({
      mobile: true,
      pathname: "/",
      now: before,
      remindAt: memory.remindAt,
    }),
    false,
  );
});

test("the copied install link is the site root", () => {
  assert.equal(
    installPageUrl("https://wingssw.com/#/learn"),
    "https://wingssw.com/",
  );
  assert.equal(
    installPageUrl("https://wingssw.com/index.html?preview=1#/install"),
    "https://wingssw.com/",
  );
});
