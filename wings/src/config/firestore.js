import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export async function saveWorkoutLog(uid, workoutData) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const docRef = await addDoc(logsRef, {
    ...workoutData,
    loggedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getWorkoutLogs(uid, limitCount = 20) {
  const logsRef = collection(db, "users", uid, "workoutLogs");
  const q = query(logsRef, orderBy("loggedAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function ensureUserDoc(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  // An existing account is left as-is. Replacing it here used to wipe progress.
  if (snap.exists()) return;

  try {
    await setDoc(userRef, updateUserData(user));
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
      // 0 is locked, 1 is unlocked, 2 is mastered.
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

  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatDate(yesterdayDate);

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
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const updates = buildStreakUpdate(snap.data(), type);
  if (!updates) return null;

  await updateDoc(ref, updates);
  return updates;
}
