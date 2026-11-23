import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../config/auth-context.jsx";
import { reportError } from "../config/sentry.js";
import {
  claimExpiredDraft,
  finishClaim,
  hasLoggedWork,
  sessionToLog,
} from "../utilites/livesession.js";

export function ExpiredSessionSaver() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!currentUser || location.pathname === "/workoutlog/session") return undefined;
    let cancelled = false;
    const claimed = claimExpiredDraft(Date.now());
    if (!claimed) return undefined;

    if (!hasLoggedWork(claimed.draft)) {
      finishClaim(null, true);
      setNotice("This session auto-ended at 4 hours.");
      return undefined;
    }

    import("../config/firestore.js")
      .then(async (store) => {
        const log = sessionToLog(
          claimed.draft,
          store.formatDate(store.getFitnessDateObject()),
        );
        await store.saveWorkoutLog(currentUser.uid, log);
        try {
          await store.creditWorkoutStreak(currentUser.uid, log.date);
        } catch {
          // The workout is saved. The streak can catch up on the next log.
        }
        finishClaim(claimed.raw, true);
        if (!cancelled) setNotice("This session auto-ended at 4 hours.");
      })
      .catch((error) => {
        reportError(error, { where: "auto-end" });
        finishClaim(claimed.raw, false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, location.pathname]);

  if (!notice) return null;
  return (
    <div className="wings-toast" role="status">
      <p className="wings-toast__card">{notice}</p>
    </div>
  );
}
