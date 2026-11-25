import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const viteEnv = import.meta.env || {};
const nodeEnv = globalThis["process"]?.env;
const useEmulators = viteEnv.VITE_USE_EMULATORS === "true" || nodeEnv?.VITE_USE_EMULATORS === "true";

function envValue(name, emulatorFallback) {
  const fromVite = typeof viteEnv[name] === "string" ? viteEnv[name] : "";
  const fromNode = typeof nodeEnv?.[name] === "string" ? nodeEnv[name] : "";
  return fromVite || fromNode || (useEmulators ? emulatorFallback : undefined);
}

const measurementId = envValue("VITE_MEASUREMENT_ID", "");

const firebaseConfig = {
  apiKey: envValue("VITE_FIREBASE_API_KEY", "demo-api-key"),
  authDomain: envValue("VITE_FIREBASE_AUTH_DOMAIN", "demo-wings.firebaseapp.com"),
  projectId: envValue("VITE_FIREBASE_PROJECT_ID", "demo-wings"),
  storageBucket: envValue("VITE_FIREBASE_STORAGE_BUCKET", "demo-wings.appspot.com"),
  messagingSenderId: envValue("VITE_FIREBASE_MESSAGING_SENDER_ID", "123456789"),
  appId: envValue("VITE_FIREBASE_APP_ID", "1:123456789:web:demo"),
};

if (typeof measurementId === "string" && measurementId.trim()) {
  firebaseConfig.measurementId = measurementId.trim();
}

// These stay null when startup throws, so a bad config or unsupported
// environment cannot take the public shell down with the module.
export let app = null;
export let auth = null;
export let db = null;
export let analytics = null;

try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase init failed", error);
}

if (app) {
  try {
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase Auth unavailable", error);
  }

  try {
    db = getFirestore(app);
  } catch (error) {
    console.error("Firestore unavailable", error);
  }
}

if (useEmulators && auth) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  } catch (error) {
    console.error("Auth emulator connection failed", error);
  }
}
if (useEmulators && db) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch (error) {
    console.error("Firestore emulator connection failed", error);
  }
}

// Analytics is skipped without a measurement id. On Firebase 12, getAnalytics()
// still returns in that case, then the config fetch rejects with nothing to
// fall back to. It also throws synchronously when appId or apiKey is missing.
function enableAnalytics() {
  if (!app || !firebaseConfig.measurementId) return;

  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => isSupported().then((supported) => {
      if (!supported) return;
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.error("Firebase Analytics unavailable", error);
      }
    }))
    .catch((error) => {
      console.error("Firebase Analytics unavailable", error);
    });
}

function enableAppCheck() {
  const siteKey = envValue("VITE_APPCHECK_SITE_KEY", "");
  if (!app || typeof siteKey !== "string" || !siteKey.trim()) return;
  const providerName = String(envValue("VITE_APPCHECK_PROVIDER", "enterprise") || "enterprise").toLowerCase();

  import("firebase/app-check")
    .then((appCheck) => {
      const provider = providerName === "v3"
        ? new appCheck.ReCaptchaV3Provider(siteKey.trim())
        : new appCheck.ReCaptchaEnterpriseProvider(siteKey.trim());
      appCheck.initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    })
    .catch((error) => {
      console.error("App Check unavailable", error);
    });
}

enableAnalytics();
enableAppCheck();