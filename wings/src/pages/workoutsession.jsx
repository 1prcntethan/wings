import { useEffect, useReducer, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import BetaDisclaimer from "../components/betadisclaimer";
import { useAuth } from "../config/auth-context.jsx";
import { formatDate, getFitnessDateObject, saveWorkoutLog } from "../config/firestore.js";
import {
  DRAFT_KEY,
  blankSession,
  hasLoggedWork,
  parseDraft,
  serializeDraft,
  sessionFromLog,
  sessionReducer,
  sessionToLog,
} from "../utilites/livesession.js";
import { SessionPlan } from "./sessionplan.jsx";
import { SessionLive } from "./sessionlive.jsx";
import "./workoutsession.css";

function readStoredDraft() {
  try {
    return parseDraft(localStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}

function createInitial(routeState) {
  if (!routeState?.fresh) {
    const saved = readStoredDraft();
    if (saved) return saved;
  }
  if (routeState?.log) return sessionFromLog(routeState.log);
  return blankSession();
}

export function WorkoutSession() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, dispatch] = useReducer(sessionReducer, location.state, createInitial);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const savingLock = useRef(false);

  useEffect(() => {
    const untouched =
      session.phase === "planning" && session.exercises.length === 0 && session.startedAt == null;
    try {
      if (untouched) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      localStorage.setItem(DRAFT_KEY, serializeDraft(session));
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage throws on this turn
      setSaveError("Couldn't keep a backup of this session on this device.");
    }
  }, [session]);

  useEffect(() => {
    if (session.phase !== "resting") return undefined;
    const check = () => {
      const current = Date.now();
      setNow(current);
      if (session.endsAt != null && current >= session.endsAt) {
        dispatch({ type: "restFinished", now: current });
      }
    };
    const id = window.setInterval(check, 250);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session.phase, session.endsAt]);

  useEffect(() => {
    if (session.phase !== "exercising" && session.phase !== "resting") return undefined;
    if (!navigator.wakeLock?.request) return undefined;
    let released = false;
    let sentinel = null;
    const request = () => {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (released) {
            lock.release().catch(() => {});
            return;
          }
          sentinel = lock;
        })
        .catch(() => {});
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release?.().catch(() => {});
    };
  }, [session.phase]);

  function dispatchSession(action) {
    setNow(Date.now());
    dispatch(action);
  }

  function discard() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // The in-memory session is still dropped by leaving the page.
    }
    navigate("/workoutlog");
  }

  async function save() {
    if (savingLock.current || !currentUser || !hasLoggedWork(session)) return;
    savingLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await saveWorkoutLog(
        currentUser.uid,
        sessionToLog(session, formatDate(getFitnessDateObject())),
      );
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // The workout is already saved.
      }
      navigate("/workoutlog");
    } catch {
      savingLock.current = false;
      setSaveError("Couldn't save that workout. Your session is still here.");
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      {session.phase === "planning" && <BetaDisclaimer />}
      <main
        className={
          session.phase === "exercising" || session.phase === "resting" ? "ls-page ls-page--focus" : "ls-page"
        }
      >
        {!currentUser ? (
          <div className="ls-live">
            <h1>live workout</h1>
            <p className="ls-empty">Sign in to plan and save a workout.</p>
            <Link to="/login" className="ls-primary">
              sign in
            </Link>
          </div>
        ) : session.phase === "planning" ? (
          <>
            {confirmDiscard ? (
              <div className="ls-live">
                <h1>discard session?</h1>
                <p className="ls-empty">This plan will be removed from this device.</p>
                <button type="button" className="ls-primary" onClick={discard}>
                  discard
                </button>
                <button type="button" className="ls-ghost" onClick={() => setConfirmDiscard(false)}>
                  keep planning
                </button>
              </div>
            ) : (
              <>
                {saveError && <p className="ls-error">{saveError}</p>}
                <SessionPlan
                  session={session}
                  dispatch={dispatchSession}
                  onBack={() => navigate("/workoutlog")}
                  onDiscard={() => setConfirmDiscard(true)}
                />
              </>
            )}
          </>
        ) : (
          <SessionLive
            key={`${session.phase}-${session.cursor?.exerciseIndex ?? "x"}-${session.cursor?.setIndex ?? "x"}`}
            session={session}
            dispatch={dispatchSession}
            now={now}
            onSave={save}
            saving={saving}
            saveError={saveError}
            onDiscard={discard}
          />
        )}
      </main>
      {(session.phase === "planning" || session.phase === "summary") && <Footer />}
    </>
  );
}
