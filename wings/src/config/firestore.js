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
  startAfter,
  getDocs,
  getAggregateFromServer,
  getCountFromServer,
  count,
  sum,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { db } from "./firebase";
import { commitUsernameClaim, deleteUserIdentity } from "../utilites/username";
import { reportError } from "./sentry.js";
import {
  monthCacheKey,
  peekMonthLogs,
  storeMonthLogs,
  invalidateMonthLogs,
} from "../utilites/monthlogcache.js";
import {
  MAX_STORED_SETS,
  countLoggedSets,
  monthBounds,
  rangeBounds,
  workoutDateCreditsStreak,
} from "../utilites/workoutstats.js";
import { buildStreakUpdate as buildStreakUpdateCore } from "../utilites/streakupdate.js";

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
  invalidateMonthLogs(uid);
  return docRef.id;
}

export async function updateWorkoutLog(uid, logId, workoutData) {
  if (!uid || typeof logId !== "string" || !/^[A-Za-z0-9]+$/.test(logId)) {
    throw new Error("Missing workout.");
  }
  const { date, category, sections, durationSec } = workoutData;
  const setCount = Math.min(MAX_STORED_SETS, countLoggedSets(sections));
  const payload = {
    date,
    category,
    sections,
    setCount,
    loggedAt: serverTimestamp(),
  };
  if (durationSec == null) payload.durationSec = deleteField();
  else payload.durationSec = durationSec;
  await updateDoc(doc(db, "users", uid, "workoutLogs", logId), payload);
  invalidateMonthLogs(uid);
}

export async function getWorkoutLogs(uid, limitCount = 20) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const q = query(logsRef, orderBy("loggedAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export const MONTH_LOG_LIMIT = 120;
const MONTH_CACHE_MS = 5 * 60 * 1000;
const monthInflight = new Map();

export async function getWorkoutLogsByDate(uid, startDate, endDate, limitCount = MONTH_LOG_LIMIT) {
  const key = monthCacheKey(uid, startDate, endDate);
  const hit = peekMonthLogs(key);
  if (hit && Date.now() - hit.at < MONTH_CACHE_MS) return hit.logs;
  if (monthInflight.has(key)) return monthInflight.get(key);

  const pending = (async () => {
    const logsRef = collection(db, "users", uid, "workoutLogs");
    const q = query(
      logsRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    storeMonthLogs(key, logs);
    return logs;
  })();
  monthInflight.set(key, pending);
  try {
    return await pending;
  } finally {
    monthInflight.delete(key);
  }
}

const HISTORY_PAGE_SIZE = 20;

export async function getOlderWorkoutPage(uid, beforeDate, cursor = null) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const constraints = [
    where("date", "<", beforeDate),
    orderBy("date", "desc"),
    orderBy("loggedAt", "desc"),
  ];
  if (cursor) constraints.push(startAfter(cursor));
  const snap = await getDocs(query(logsRef, ...constraints, limit(HISTORY_PAGE_SIZE + 1)));
  const page = snap.docs.slice(0, HISTORY_PAGE_SIZE);
  return {
    logs: page.map((row) => ({ id: row.id, ...row.data() })),
    nextCursor: snap.size > HISTORY_PAGE_SIZE ? page.at(-1) : null,
  };
}

export async function getLatestWorkoutLog(uid) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const byDate = await getDocs(query(logsRef, orderBy("date", "desc"), limit(1)));
  if (!byDate.empty) return { id: byDate.docs[0].id, ...byDate.docs[0].data() };
  const byLoggedAt = await getDocs(query(logsRef, orderBy("loggedAt", "desc"), limit(1)));
  if (byLoggedAt.empty) return null;
  return { id: byLoggedAt.docs[0].id, ...byLoggedAt.docs[0].data() };
}

async function aggregateStats(logsQuery) {
  const [counted, summed, timed] = await Promise.all([
    getCountFromServer(logsQuery),
    getAggregateFromServer(logsQuery, { sets: sum("setCount") }),
    getAggregateFromServer(query(logsQuery, where("durationSec", ">=", 0)), {
      seconds: sum("durationSec"),
      workouts: count(),
    }),
  ]);
  const timedWorkouts = timed.data().workouts;
  return {
    workouts: counted.data().count,
    sets: Number(summed.data().sets) || 0,
    durationSec: timedWorkouts ? Number(timed.data().seconds) || 0 : null,
    timedWorkouts,
    partialSets: true,
  };
}

export async function getWorkoutStats(uid, range, today = getFitnessDateObject()) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  if (!range || range.kind === "all") return aggregateStats(logsRef);

  const bounds = range.kind === "month"
    ? monthBounds(today.getFullYear(), today.getMonth())
    : rangeBounds(today, range);
  const ranged = query(
    logsRef,
    where("date", ">=", bounds.start),
    where("date", "<=", bounds.end),
  );
  return aggregateStats(ranged);
}

export async function deleteWorkoutLog(uid, logId) {
  if (!uid || typeof logId !== "string" || !/^[A-Za-z0-9]+$/.test(logId)) {
    throw new Error("Missing workout.");
  }
  await deleteDoc(doc(db, "users", uid, "workoutLogs", logId));
  invalidateMonthLogs(uid);
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

const DELETING_KEY = "wings-deleting-uid";

export function markDeletingLocal(uid) {
  try {
    localStorage.setItem(DELETING_KEY, uid);
  } catch {
    // The server tombstone is the copy that survives a storage failure.
  }
}

function deletingLocally(uid) {
  try {
    return localStorage.getItem(DELETING_KEY) === uid;
  } catch {
    return false;
  }
}

export async function ensureUserDoc(user) {
  if (!user?.uid) return;

  const userRef = doc(db, "users", user.uid);
  try {
    if (deletingLocally(user.uid)) return;
    const marker = await getDoc(doc(db, "deletions", user.uid));
    if (marker.exists() && marker.data()?.deleting === true) return;
    const snap = await getDoc(userRef);
    // An existing account is left as-is, including one flagged deleting.
    // Replacing it here used to wipe progress.
    if (snap.exists()) return;
    // merge keeps fields this payload does not mention if the doc appears
    // between the read and the write. A failed read must not write at all.
    await setDoc(userRef, updateUserData(user), { merge: true });
  } catch (error) {
    reportError(error, { where: "ensureUserDoc" });
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
  return buildStreakUpdateCore(data, type, getFitnessDateObject());
}

export async function logWorkout(uid, type) {
  const ref = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return null;

    const updates = buildStreakUpdateCore(snap.data(), type, getFitnessDateObject());
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
  const userRef = doc(db, "users", uid);
  const staged = await runTransaction(db, async (transaction) => {
    const store = usernameTransactionStore(transaction);
    return commitUsernameClaim({
      ...store,
      set() {},
      update() {},
      delete() {},
    }, uid, username);
  });

  const current = await getDoc(userRef);
  const previousPatch = {
    username: typeof current.data()?.username === "string" ? current.data().username : "",
    usernameLower: typeof current.data()?.usernameLower === "string" ? current.data().usernameLower : "",
  };
  const released = [];
  for (const handle of staged.releases) {
    const ref = doc(db, "usernames", handle);
    const snap = await getDoc(ref);
    if (snap.exists()) released.push({ handle, data: snap.data() });
    await deleteDoc(ref);
  }
  try {
    await updateDoc(userRef, staged.userPatch);
    await runTransaction(db, async (transaction) => {
      for (const claim of staged.claims) {
        transaction.set(doc(db, "usernames", claim.handle), claim.data);
      }
    });
  } catch (error) {
    await updateDoc(userRef, previousPatch).catch(() => {});
    for (const entry of released) {
      await setDoc(doc(db, "usernames", entry.handle), entry.data).catch(() => {});
    }
    throw error;
  }
}

export async function deleteUserDocument(uid) {
  await deleteDoc(doc(db, "users", uid));
}

export async function deleteAccountData(uid) {
  markDeletingLocal(uid);
  await setDoc(doc(db, "deletions", uid), { deleting: true }, { merge: true });
  await updateDoc(doc(db, "users", uid), { deleting: true });

  const logsRef = collection(db, "users", uid, "workoutLogs");
  const pageSize = 400;
  for (;;) {
    const snap = await getDocs(query(logsRef, limit(pageSize)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }

  await runTransaction(db, async (transaction) => {
    await deleteUserIdentity(usernameTransactionStore(transaction), uid, { keepUserDoc: true });
  });
  invalidateMonthLogs(uid);
}
