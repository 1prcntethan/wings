import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getAggregateFromServer,
  getCountFromServer,
  sum,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { commitUsernameClaim, deleteUserIdentity } from "../utilites/username";
import {
  MAX_STORED_SETS,
  countLoggedSets,
  rangeBounds,
  summarizeLogs,
  workoutDateCreditsStreak,
} from "../utilites/workoutstats.js";

export async function saveWorkoutLog(uid, workoutData) {
  const payload = { ...(workoutData || {}) };
  delete payload.setCount;
  const setCount = Math.min(MAX_STORED_SETS, countLoggedSets(payload.sections));
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const docRef = await addDoc(logsRef, {
    ...payload,
    setCount,
    loggedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateWorkoutLog(uid, logId, workoutData) {
  if (!uid || typeof logId !== "string" || !/^[A-Za-z0-9]+$/.test(logId)) {
    throw new Error("Missing workout.");
  }
  const payload = { ...(workoutData || {}) };
  delete payload.setCount;
  const setCount = Math.min(MAX_STORED_SETS, countLoggedSets(payload.sections));
  await updateDoc(doc(db, "users", uid, "workoutLogs", logId), {
    ...payload,
    setCount,
    loggedAt: serverTimestamp(),
  });
}

export async function getWorkoutLogs(uid, limitCount = 20) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const q = query(logsRef, orderBy("loggedAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getWorkoutLogsByDate(uid, startDate, endDate) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const q = query(
    logsRef,
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLatestWorkoutLog(uid) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const byDate = await getDocs(query(logsRef, orderBy("date", "desc"), limit(1)));
  if (!byDate.empty) return { id: byDate.docs[0].id, ...byDate.docs[0].data() };
  const byLoggedAt = await getDocs(query(logsRef, orderBy("loggedAt", "desc"), limit(1)));
  if (byLoggedAt.empty) return null;
  return { id: byLoggedAt.docs[0].id, ...byLoggedAt.docs[0].data() };
}

export async function getWorkoutStats(uid, range, today = getFitnessDateObject()) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  if (!range || range.kind === "all") {
    const [counted, summed] = await Promise.all([
      getCountFromServer(logsRef),
      getAggregateFromServer(logsRef, { sets: sum("setCount") }),
    ]);
    return {
      workouts: counted.data().count,
      sets: Number(summed.data().sets) || 0,
      durationSec: null,
      partialSets: true,
    };
  }

  const bounds = rangeBounds(today, range);
  const logs = await getWorkoutLogsByDate(uid, bounds.start, bounds.end);
  return { ...summarizeLogs(logs), partialSets: false };
}

export async function deleteWorkoutLog(uid, logId) {
  if (!uid || typeof logId !== "string" || !/^[A-Za-z0-9]+$/.test(logId)) {
    throw new Error("Missing workout.");
  }
  await deleteDoc(doc(db, "users", uid, "workoutLogs", logId));
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function ensureUserDoc(user) {
  if (!user?.uid) return;

  const userRef = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(userRef);
    // An existing account is left as-is. Replacing it here used to wipe progress.
    if (snap.exists()) return;
    // merge keeps fields this payload does not mention if the doc appears
    // between the read and the write. A failed read must not write at all.
    await setDoc(userRef, updateUserData(user), { merge: true });
  } catch (error) {
    console.error("ensureUserDoc failed", error);
  }
}

export function updateUserData(user) {
  return {
    schemaVersion: 2,
    email: user.email,
    authUID: user.uid,
    createdAt: serverTimestamp(),
    streak: {
      current: 0,
      longest: 0,
      lastLog: null,
    },

    workout: 0,
    rest: 0,
    skills: {
      push: null,
      pull: null,
      // Progress is 0–3: 0 locked, 1 unlocked, 2 in progress, 3 mastered.
    },
  };
}

export async function updateSkill(uid, skillName, progress) {
  const ref = doc(db, "users", uid);

  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const data = snap.data();
  const oldProgress = data?.skills?.[skillName];

  if (oldProgress === progress) {
    return true;
  }

  await updateDoc(ref, {
    [`skills.${skillName}`]: progress,
    updatedAt: serverTimestamp(),
  });
  return true;
}

export function getFitnessDateObject() {
  const now = new Date();
  const fitnessDate = new Date(now);

  if (now.getHours() < 4) {
    fitnessDate.setDate(fitnessDate.getDate() - 1);
  }

  return fitnessDate;
}

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// A streak is still alive on the fitness day after lastLog. Anything older shows as 0.
export function displayedStreak(streak, todayDate = getFitnessDateObject()) {
  const current = Number(streak?.current) || 0;
  const lastLog = streak?.lastLog || null;
  if (!lastLog || current <= 0) return 0;

  const today = formatDate(todayDate);
  const yesterday = formatDate(shiftDate(todayDate, -1));
  if (lastLog === today || lastLog === yesterday) return current;
  return 0;
}

export function buildStreakUpdate(data, type) {
  const streak = data.streak || {
    current: 0,
    longest: 0,
    lastLog: null,
  };

  const workoutCounter = Number(data.workout) || 0;
  const restCounter = Number(data.rest) || 0;

  const todayDate = getFitnessDateObject();
  const today = formatDate(todayDate);

  if (streak.lastLog === today) return null;

  const yesterdayStr = formatDate(shiftDate(todayDate, -1));

  const newCurrent = streak.lastLog === yesterdayStr ? streak.current + 1 : 1;
  const newLongest = Math.max(streak.longest, newCurrent);

  return {
    streak: {
      current: newCurrent,
      longest: newLongest,
      lastLog: today,
    },
    workout: type === "workout" ? workoutCounter + 1 : workoutCounter,
    rest: type === "rest" ? restCounter + 1 : restCounter,
  };
}

export async function logWorkout(uid, type) {
  const ref = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return null;

    const updates = buildStreakUpdate(snap.data(), type);
    if (!updates) return null;

    transaction.update(ref, updates);
    return updates;
  });
}

export async function creditWorkoutStreak(uid, workoutDate) {
  if (!workoutDateCreditsStreak(workoutDate, formatDate(getFitnessDateObject()))) {
    return { credited: false, reason: "not-today" };
  }
  const updates = await logWorkout(uid, "workout");
  if (!updates) return { credited: false, reason: "already-logged" };
  return { credited: true, updates };
}

function usernameTransactionStore(transaction) {
  return {
    async get(ref) {
      const snap = await transaction.get(doc(db, ref.collection, ref.id));
      return {
        exists: snap.exists(),
        data: snap.exists() ? snap.data() : null,
      };
    },
    set(ref, data) {
      if (ref.collection !== "usernames") {
        throw Object.assign(new Error("Refusing to replace that document."), {
          code: "invalid-argument",
        });
      }
      transaction.set(doc(db, ref.collection, ref.id), data);
    },
    update(ref, data) {
      if (ref.collection !== "users") {
        throw Object.assign(new Error("Refusing to replace that document."), {
          code: "invalid-argument",
        });
      }
      transaction.update(doc(db, ref.collection, ref.id), data);
    },
    delete(ref) {
      if (ref.collection !== "usernames" && ref.collection !== "users") {
        throw Object.assign(new Error("Refusing to delete that document."), {
          code: "invalid-argument",
        });
      }
      transaction.delete(doc(db, ref.collection, ref.id));
    },
  };
}

export async function updateUsername(uid, username) {
  await runTransaction(db, async (transaction) => {
    await commitUsernameClaim(usernameTransactionStore(transaction), uid, username);
  });
}

export async function deleteAccountData(uid) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const pageSize = 400;
  let remaining = false;

  for (let page = 0; page < 50; page += 1) {
    const snap = await getDocs(query(logsRef, limit(pageSize)));
    if (snap.empty) {
      remaining = false;
      break;
    }

    const batch = writeBatch(db);
    snap.docs.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
    remaining = snap.size === pageSize;
    if (!remaining) break;
  }

  if (remaining) {
    throw Object.assign(new Error("Couldn't finish deleting workout logs."), {
      code: "unavailable",
    });
  }

  await runTransaction(db, async (transaction) => {
    await deleteUserIdentity(usernameTransactionStore(transaction), uid);
  });
}
