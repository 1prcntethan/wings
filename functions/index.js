import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onUserDeleted } from "firebase-functions/v2/identity";

initializeApp();

const PAGE = 400;

export const cleanupDeletedUser = onUserDeleted(async (event) => {
  const uid = event.data?.uid;
  if (!uid) return;

  const db = getFirestore();
  const logs = db.collection("users").doc(uid).collection("workoutLogs");
  for (;;) {
    const snap = await logs.limit(PAGE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
    if (snap.size < PAGE) break;
  }

  const names = await db.collection("usernames").where("uid", "==", uid).get();
  const batch = db.batch();
  names.docs.forEach((entry) => batch.delete(entry.ref));
  batch.delete(db.collection("users").doc(uid));
  await batch.commit();
});
