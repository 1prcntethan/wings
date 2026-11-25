const dsn = import.meta.env?.VITE_SENTRY_DSN;

export function sentryEnabled() {
  return typeof dsn === "string" && dsn.trim() !== "";
}

let ready = null;

function loadSentry() {
  if (!sentryEnabled()) return Promise.resolve(null);
  if (!ready) {
    ready = import("@sentry/react").then((Sentry) => {
      if (!Sentry.getClient()) {
        Sentry.init({
          dsn: dsn.trim(),
          environment: import.meta.env?.MODE,
          sendDefaultPii: false,
        });
      }
      return Sentry;
    });
  }
  return ready;
}

export function initSentry() {
  if (!sentryEnabled()) return;
  loadSentry().catch((error) => {
    console.error("Sentry unavailable", error);
  });
}

export function reportError(error, context) {
  if (!sentryEnabled() || !error) return;
  loadSentry()
    .then((Sentry) => {
      if (!Sentry) return;
      Sentry.captureException(error, context ? { extra: context } : undefined);
    })
    .catch(() => {});
}
