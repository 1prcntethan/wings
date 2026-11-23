import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeAuthBoot } from "./auth-bootstrap";
import { reportError } from "./sentry.js";

const AuthContext = createContext();

// Hook and provider share this file so auth state stays in one place.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    Promise.all([
      import("./firebase.js"),
      import("firebase/auth"),
      import("./firestore.js"),
    ])
      .then(([firebaseMod, authMod, firestoreMod]) => {
        if (!active) return;
        unsubscribe = subscribeAuthBoot({
          auth: firebaseMod.auth,
          onAuthStateChanged: authMod.onAuthStateChanged,
          ensureUserDoc: firestoreMod.ensureUserDoc,
          onChange(next) {
            setCurrentUser(next.currentUser);
            setUserLoggedIn(next.userLoggedIn);
            setDbReady(next.dbReady);
            setLoading(next.loading);
          },
        });
      })
      .catch((error) => {
        reportError(error, { where: "auth-boot" });
        console.error("Auth boot failed", error);
        if (!active) return;
        setCurrentUser(null);
        setUserLoggedIn(false);
        setDbReady(true);
        setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userLoggedIn, loading, dbReady }}>
      {children}
    </AuthContext.Provider>
  );
}
