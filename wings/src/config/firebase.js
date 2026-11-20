import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const measurementId = import.meta.env.VITE_MEASUREMENT_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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

// Analytics is skipped without a measurement id. On Firebase 12, getAnalytics()
// still returns in that case, then the config fetch rejects with nothing to
// fall back to. It also throws synchronously when appId or apiKey is missing.
function enableAnalytics() {
  if (!app || !firebaseConfig.measurementId) return;

  try {
    isSupported()
      .then((supported) => {
        if (!supported) return;
        try {
          analytics = getAnalytics(app);
        } catch (error) {
          console.error("Firebase Analytics unavailable", error);
        }
      })
      .catch((error) => {
        console.error("Firebase Analytics unavailable", error);
      });
  } catch (error) {
    console.error("Firebase Analytics unavailable", error);
  }
}

enableAnalytics();