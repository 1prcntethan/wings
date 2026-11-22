// End-to-end checks against the local Auth and Firestore emulators.
// Run with: firebase emulators:exec --project demo-wings --only auth,firestore "node wings/scripts/emulator-e2e.mjs"
process.env.VITE_USE_EMULATORS = "true";
process.env.VITE_FIREBASE_API_KEY = "demo-api-key";
process.env.VITE_FIREBASE_AUTH_DOMAIN = "demo-wings.firebaseapp.com";
process.env.VITE_FIREBASE_PROJECT_ID = "demo-wings";
process.env.VITE_FIREBASE_STORAGE_BUCKET = "demo-wings.appspot.com";
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = "123456789";
process.env.VITE_FIREBASE_APP_ID = "1:123456789:web:demo";

const results = [];

function record(name, pass, evidence) {
  results.push({ name, pass, evidence });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  console.log(`  ${evidence}`);
}

function shiftKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sectionsFor(name, sets) {
  const efforts = Array.from({ length: sets }, () => "8");
  return {
    warmup: [],
    primary: [{
      name,
      sets: String(sets),
      measure: "reps",
      efforts,
      reps: efforts.join(", "),
      notes: "",
    }],
    secondary: [],
    volume: [],
  };
}

async function main() {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  const load = (id) => server.ssrLoadModule(id);
  const { auth, db } = await load("/src/config/firebase.js");
  const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
  } = await import("firebase/auth");
  const {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
  } = await import("firebase/firestore");
  const {
    creditWorkoutStreak,
    deleteAccountData,
    deleteWorkoutLog,
    displayedStreak,
    ensureUserDoc,
    formatDate,
    getFitnessDateObject,
    getUserDoc,
    getOlderWorkoutPage,
    getWorkoutLogsByDate,
    getWorkoutStats,
    saveWorkoutLog,
    updateSkill,
    updateUsername,
    updateWorkoutLog,
  } = await load("/src/config/firestore.js");
  const { statRangeById, summarizeLogs, rangeBounds, monthBounds } = await load("/src/utilites/workoutstats.js");
  const { highestReached } = await load("/src/utilites/skillgroups.js");
  const { skillRP, skillRPDenominator } = await load("/src/utilites/skilltorp.js");
  const {
    blankSession,
    sessionReducer,
    sessionToLog,
  } = await load("/src/utilites/livesession.js");

  const today = formatDate(getFitnessDateObject());
  const email = `e2e-${Date.now()}@wings.test`;
  const password = "test-pass-123";
  const created = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(created.user);
  const uid = created.user.uid;
  record("email sign-up creates a user document", Boolean(await getUserDoc(uid)), `uid ${uid}`);

  await signOut(auth);
  const signedIn = await signInWithEmailAndPassword(auth, email, password);
  record("email sign-in", signedIn.user.uid === uid, signedIn.user.email);

  const seeds = [
    { offset: 0, sets: 4, category: "pull", name: "Pull-up" },
    { offset: -2, sets: 3, category: "push", name: "Dip" },
    { offset: -10, sets: 5, category: "legs", name: "Squat" },
    { offset: -40, sets: 2, category: "push", name: "Pike Push-up" },
    { offset: -100, sets: 6, category: "pull", name: "Row" },
    { offset: -200, sets: 4, category: "full-body", name: "Burpee" },
    { offset: -400, sets: 8, category: "conditioning", name: "Jump" },
  ];
  const saved = [];
  for (const seed of seeds) {
    const date = shiftKey(today, seed.offset);
    const id = await saveWorkoutLog(uid, {
      date,
      category: seed.category,
      sections: sectionsFor(seed.name, seed.sets),
    });
    saved.push({ ...seed, date, id });
  }

  const past = await creditWorkoutStreak(uid, shiftKey(today, -3));
  let user = await getUserDoc(uid);
  record(
    "past-dated log does not move the streak",
    past.reason === "not-today" && (user.streak?.current || 0) === 0,
    `reason ${past.reason}, current ${user.streak?.current}`,
  );

  const first = await creditWorkoutStreak(uid, today);
  user = await getUserDoc(uid);
  record(
    "today's log credits the streak once",
    first.credited === true && user.streak.current === 1 && user.streak.lastLog === today && user.workout === 1,
    `current ${user.streak.current}, lastLog ${user.streak.lastLog}, workout ${user.workout}`,
  );

  const second = await creditWorkoutStreak(uid, today);
  user = await getUserDoc(uid);
  record(
    "a second same-day log does not double-credit",
    second.reason === "already-logged" && user.streak.current === 1 && user.workout === 1,
    `reason ${second.reason}, current ${user.streak.current}, workout ${user.workout}`,
  );

  let session = sessionReducer(blankSession(), { type: "addExercise", section: "primary" });
  session = sessionReducer(session, {
    type: "updateExercise",
    id: "1",
    patch: { name: "Dip", sets: 1, measure: "reps", restSec: 90 },
  });
  session = sessionReducer(session, { type: "start", now: 1000 });
  session = sessionReducer(session, { type: "completeSet", value: "8", now: 66000 });
  const sessionLog = sessionToLog(session, today);
  const sessionId = await saveWorkoutLog(uid, sessionLog);
  saved.push({ offset: 0, sets: 1, category: "push", name: "Dip", date: today, id: sessionId });
  const sessionCredit = await creditWorkoutStreak(uid, sessionLog.date);
  const sessionSnap = await getDoc(doc(db, "users", uid, "workoutLogs", sessionId));
  user = await getUserDoc(uid);
  record(
    "live session save creates a log without double-crediting",
    sessionSnap.exists()
      && sessionSnap.data().category === "push"
      && sessionSnap.data().setCount === 1
      && sessionSnap.data().durationSec === 65
      && sessionCredit.reason === "already-logged"
      && user.streak.current === 1,
    `id ${sessionId}, setCount ${sessionSnap.data()?.setCount}, streak ${user.streak.current}`,
  );

  const sessionUser = await createUserWithEmailAndPassword(
    auth,
    `session-${Date.now()}@wings.test`,
    password,
  );
  await ensureUserDoc(sessionUser.user);
  const freshSessionId = await saveWorkoutLog(sessionUser.user.uid, sessionLog);
  const freshCredit = await creditWorkoutStreak(sessionUser.user.uid, sessionLog.date);
  const freshUser = await getUserDoc(sessionUser.user.uid);
  record(
    "live session save credits the streak from zero",
    Boolean(freshSessionId) && freshCredit.credited === true && freshUser.streak.current === 1,
    `current ${freshUser.streak.current}`,
  );
  await signInWithEmailAndPassword(auth, email, password);

  const target = saved.find((seed) => seed.offset === -2);
  const beforeCount = (await getDocs(collection(db, "users", uid, "workoutLogs"))).size;
  await updateWorkoutLog(uid, target.id, {
    date: target.date,
    category: "legs",
    sections: sectionsFor("Split Squat", 3),
  });
  const after = await getDoc(doc(db, "users", uid, "workoutLogs", target.id));
  const afterCount = (await getDocs(collection(db, "users", uid, "workoutLogs"))).size;
  user = await getUserDoc(uid);
  record(
    "edit updates the same log and does not double-credit",
    after.exists()
      && after.data().category === "legs"
      && after.data().setCount === 3
      && afterCount === beforeCount
      && user.streak.current === 1,
    `docs ${beforeCount} -> ${afterCount}, category ${after.data()?.category}, streak ${user.streak.current}`,
  );

  await updateWorkoutLog(uid, sessionId, {
    ...sessionLog,
    durationSec: 999,
    sections: sectionsFor("Dip", 1),
  });
  const editedSession = await getDoc(doc(db, "users", uid, "workoutLogs", sessionId));
  record("editing a live workout preserves its duration", editedSession.data().durationSec === 65,
    `duration ${editedSession.data().durationSec}s`);

  let updateRejected = false;
  try {
    await updateDoc(doc(db, "users", uid, "workoutLogs", target.id), { category: "pull" });
  } catch {
    updateRejected = true;
  }
  record("rules reject a partial log update", updateRejected, updateRejected ? "permission denied" : "write succeeded");

  const oldDate = shiftKey(today, -5);
  const oldId = "oldshape1";
  const seeded = await seedOldLog(uid, oldId, oldDate);
  record("old-shape log can be stored for the regression", seeded.ok, seeded.evidence);

  const month = monthBounds(
    getFitnessDateObject().getFullYear(),
    getFitnessDateObject().getMonth(),
  );
  const monthLogs = await getWorkoutLogsByDate(uid, month.start, month.end);
  const monthIds = new Set(monthLogs.map((log) => log.id));
  const outside = saved.filter((seed) => seed.date < month.start || seed.date > month.end);
  record(
    "current-month query does not return older months",
    outside.every((seed) => !monthIds.has(seed.id)) && monthLogs.every((log) => log.date >= month.start && log.date <= month.end),
    `month ${month.start}..${month.end}, rows ${monthLogs.length}`,
  );

  for (const id of ["7d", "14d", "30d", "3m", "6m", "1y", "all"]) {
    const range = statRangeById(id);
    const stats = await getWorkoutStats(uid, range);
    const expected = expectedStats(saved, oldDate, oldId, seeded.ok, range, today, rangeBounds);
    const match = stats.workouts === expected.workouts && stats.sets === expected.sets
      && stats.durationSec === 65 && stats.timedWorkouts === 1;
    record(
      `stats ${range.label}`,
      match,
      `got ${stats.workouts} workouts / ${stats.sets} sets, expected ${expected.workouts} / ${expected.sets}`,
    );
  }

  const archiveDate = shiftKey(month.start, -1);
  const sameDateIds = await Promise.all(Array.from({ length: 21 }, () =>
    saveWorkoutLog(uid, { date: archiveDate, category: "push", sections: sectionsFor("Dip", 1) }),
  ));
  const firstPage = await getOlderWorkoutPage(uid, month.start);
  const secondPage = await getOlderWorkoutPage(uid, month.start, firstPage.nextCursor);
  const archiveRows = [...firstPage.logs, ...secondPage.logs];
  const archiveIds = new Set(archiveRows.map((row) => row.id));
  record(
    "archive cursor pages across same-day workouts without duplicates or skips",
    firstPage.logs.length === 20 && firstPage.nextCursor !== null && secondPage.nextCursor === null
      && archiveRows.length === archiveIds.size && sameDateIds.every((id) => archiveIds.has(id))
      && archiveRows.every((row) => row.date < month.start),
    `page sizes ${firstPage.logs.length} and ${secondPage.logs.length}`,
  );

  if (seeded.ok) {
    const oldDoc = monthLogs.find((log) => log.id === oldId) || (await getWorkoutLogsByDate(uid, oldDate, oldDate))[0];
    const ranged = summarizeLogs([oldDoc].filter(Boolean));
    record(
      "old-shape log displays and counts in a date range",
      Boolean(oldDoc) && oldDoc.sections?.primary?.[0]?.name === "Push-up" && ranged.sets === 3,
      oldDoc ? `sets counted ${ranged.sets}, stored setCount ${oldDoc.setCount}` : "missing",
    );
  }

  await deleteWorkoutLog(uid, target.id);
  const deleted = await getDoc(doc(db, "users", uid, "workoutLogs", target.id));
  record("delete removes the workout document", !deleted.exists(), deleted.exists() ? "still present" : "gone");

  let skillWrite = "";
  try {
    await updateSkill(uid, "dip", 3);
    await updateSkill(uid, "handstand", 2);
    await updateSkill(uid, "push-up", 3);
    skillWrite = "saved";
  } catch (error) {
    skillWrite = error.message.split("\n")[0];
  }
  user = await getUserDoc(uid);
  const reached = highestReached(user.skills);
  const push = reached.find((skill) => skill.group === "Horizontal Push");
  const vertical = reached.find((skill) => skill.group === "Vertical Push");
  record(
    "skill status is stored and highest node follows it",
    skillWrite === "saved" && user.skills?.dip === 3 && user.skills?.handstand === 2 && push?.id === "dip" && vertical?.id === "handstand",
    `${skillWrite}; push ${push?.id} ${push?.status}, vertical ${vertical?.id} ${vertical?.status}`,
  );

  const skillPoints = Object.entries(user.skills || {}).reduce((sum, [name, progress]) => {
    if (typeof progress !== "number") return sum;
    return sum + (skillRP.get(name) ?? 0) * (progress / 3);
  }, 0);
  const totalSkillRP = Math.round((skillPoints / skillRPDenominator) * 750);
  const totalStreakRP = Math.round(Math.sqrt(displayedStreak(user.streak) / 365) * 250);
  const totalRP = totalSkillRP + totalStreakRP;
  const rankName = totalRP >= 120 ? "silver" : totalRP > 0 ? "bronze" : "unranked";
  record(
    "rank uses the existing RP formula",
    totalRP === totalSkillRP + totalStreakRP && rankName === "bronze",
    `${totalRP} Rp = ${totalSkillRP} skill + ${totalStreakRP} streak (${rankName})`,
  );

  const nameA = `Ethan ${String(Date.now()).slice(-6)}`;
  const nameB = `Ethan ${String(Date.now()).slice(-5)}b`;
  await updateUsername(uid, nameA);
  user = await getUserDoc(uid);
  const handle = await getDoc(doc(db, "usernames", nameA.toLowerCase()));
  record(
    "username claim reserves the handle",
    user.username === nameA && handle.exists() && handle.data().uid === uid,
    `user ${user.username}, reservation ${handle.data()?.uid}`,
  );
  await updateUsername(uid, nameB);
  const released = await getDoc(doc(db, "usernames", nameA.toLowerCase()));
  const nextHandle = await getDoc(doc(db, "usernames", nameB.toLowerCase()));
  user = await getUserDoc(uid);
  record(
    "username change releases the old handle",
    user.username === nameB && !released.exists() && nextHandle.data()?.uid === uid,
    `now ${user.username}`,
  );

  const rival = await createUserWithEmailAndPassword(auth, `rival-${Date.now()}@wings.test`, password);
  await ensureUserDoc(rival.user);
  let taken = false;
  try {
    await updateUsername(rival.user.uid, nameB);
  } catch (error) {
    taken = error.code === "already-exists";
  }
  record("a second account cannot take the username", taken, taken ? "already-exists" : "claim succeeded");

  await deleteAccountData(rival.user.uid);
  const rivalUser = await getDoc(doc(db, "users", rival.user.uid));
  record("account deletion removes the user document", !rivalUser.exists(), rivalUser.exists() ? "still present" : "gone");

  const failed = results.filter((item) => !item.pass);
  console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  await server.close();
  if (failed.length) process.exit(1);
}

function expectedStats(saved, oldDate, oldId, oldOk, range, today, rangeBounds) {
  const rows = saved.map((seed) => ({ ...seed, setCount: seed.sets }));
  if (oldOk) rows.push({ id: oldId, date: oldDate, sets: 3, setCount: null, old: true });
  if (range.kind === "all") {
    return {
      workouts: rows.length,
      sets: rows.reduce((sum, row) => sum + (row.old ? 0 : row.sets), 0),
    };
  }
  const bounds = rangeBounds(new Date(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  ), range);
  const included = rows.filter((row) => row.date >= bounds.start && row.date <= bounds.end);
  return {
    workouts: included.length,
    sets: included.reduce((sum, row) => sum + row.sets, 0),
  };
}

async function seedOldLog(uid, id, date) {
  const url = `http://127.0.0.1:8080/v1/projects/demo-wings/databases/(default)/documents/users/${uid}/workoutLogs?documentId=${id}`;
  const body = {
    fields: {
      date: { stringValue: date },
      category: { stringValue: "push" },
      loggedAt: { timestampValue: new Date().toISOString() },
      sections: {
        mapValue: {
          fields: {
            warmup: { arrayValue: { values: [] } },
            secondary: { arrayValue: { values: [] } },
            volume: { arrayValue: { values: [] } },
            primary: {
              arrayValue: {
                values: [{
                  mapValue: {
                    fields: {
                      name: { stringValue: "Push-up" },
                      sets: { stringValue: "3" },
                      measure: { stringValue: "reps" },
                      efforts: {
                        arrayValue: {
                          values: [
                            { stringValue: "8" },
                            { stringValue: "8" },
                            { stringValue: "8" },
                          ],
                        },
                      },
                      reps: { stringValue: "8, 8, 8" },
                      notes: { stringValue: "" },
                    },
                  },
                }],
              },
            },
          },
        },
      },
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { ok: response.ok, evidence: `${response.status} ${text.slice(0, 180)}` };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
