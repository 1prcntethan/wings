import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { subscribeAuthBoot } from "./auth-bootstrap";
import { auth } from "./firebase";
import { ensureUserDoc } from "./firestore";

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
    return subscribeAuthBoot({
      auth,
      onAuthStateChanged,
      ensureUserDoc,
      onChange(next) {
        setCurrentUser(next.currentUser);
        setUserLoggedIn(next.userLoggedIn);
        setDbReady(next.dbReady);
        setLoading(next.loading);
      },
    });
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userLoggedIn, loading, dbReady }}>
      {children}
    </AuthContext.Provider>
  );
}
