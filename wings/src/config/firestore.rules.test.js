import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  setDoc,
  setLogLevel,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { skillDB } from "../utilites/skilltodb.js";

// These tests load firestore.rules into the local emulator. demo-* never
// reaches a live Firebase project, and the suite refuses any other host.
const PROJECT_ID = "demo-wings";
const emulatorHost = globalThis.process?.env?.FIRESTORE_EMULATOR_HOST ?? "";

if (!PROJECT_ID.startsWith("demo-")) {
  throw new Error("Refusing to run rules tests against a live project.");
}
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(emulatorHost)) {
  throw new Error(
    "Firestore rules tests require the local emulator (FIRESTORE_EMULATOR_HOST).",
  );
}

setLogLevel("silent");

const skillIds = [...new Set(skillDB.values())];
let testEnv;

function dbFor(uid) {
  return testEnv
    .authenticatedContext(uid, { email: `${uid}@example.com` })
    .firestore();
}

function userDoc(db, uid) {
  return doc(db, "users", uid);
}

function newUser(uid) {
  return {
    schemaVersion: 2,
    email: `${uid}@example.com`,
    authUID: uid,
    createdAt: serverTimestamp(),
    streak: { current: 0, longest: 0, lastLog: null },
    workout: 0,
    rest: 0,
    skills: { push: null, pull: null },
  };
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

async function createUser(uid) {
  const db = dbFor(uid);
  await assertSucceeds(
    setDoc(userDoc(db, uid), newUser(uid), { merge: true }),
  );
  return db;
}

function skillWrite(db, uid, skillId, progress) {
  return updateDoc(userDoc(db, uid), {
    [`skills.${skillId}`]: progress,
    updatedAt: serverTimestamp(),
  });
}

async function assertDenied(write) {
  const error = await assertFails(write);
  assert.equal(error.code, "permission-denied");
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(
        new URL("../../../firestore.rules", import.meta.url),
        "utf8",
      ),
      host: "127.0.0.1",
      port: Number(emulatorHost.split(":")[1]),
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

describe("skill progress rules", { concurrency: 1 }, () => {
  test("a new user's first skill write saves, then a later change saves", async () => {
    const uid = "new-user";
    const db = await createUser(uid);

    await assertSucceeds(skillWrite(db, uid, "dip", 1));
    const created = await getDoc(userDoc(db, uid));
    assert.equal(created.data().skills.dip, 1);
    assert.equal(created.data().skills.push, null);
    assert.equal(created.data().skills.pull, null);

    await assertSucceeds(skillWrite(db, uid, "dip", 3));
    const updated = await getDoc(userDoc(db, uid));
    assert.equal(updated.data().skills.dip, 3);
  });

  test("every catalog skill can be added and then updated on one account", async () => {
    const uid = "catalog";
    const db = await createUser(uid);

    for (const skillId of skillIds) {
      await assertSucceeds(skillWrite(db, uid, skillId, 1));
    }

    const saved = await getDoc(userDoc(db, uid));
    for (const skillId of skillIds) {
      assert.equal(saved.data().skills[skillId], 1);
      await assertSucceeds(skillWrite(db, uid, skillId, 2));
    }

    const changed = await getDoc(userDoc(db, uid));
    for (const skillId of skillIds) {
      assert.equal(changed.data().skills[skillId], 2);
    }
    assert.equal(changed.data().skills.push, null);
  });

  test("statuses outside 0-3 are rejected", async () => {
    const uid = "bad-status";
    const db = await createUser(uid);

    for (const progress of [0, 1, 2, 3]) {
      await assertSucceeds(skillWrite(db, uid, "push-up", progress));
    }
    for (const progress of [4, -1, 1.5, "1", null, true]) {
      await assertDenied(skillWrite(db, uid, "push-up", progress));
    }

    const saved = await getDoc(userDoc(db, uid));
    assert.equal(saved.data().skills["push-up"], 3);
  });

  test("an unknown skill id is rejected", async () => {
    const uid = "unknown-skill";
    const db = await createUser(uid);
    await assertDenied(skillWrite(db, uid, "not-a-skill", 1));
    await assertDenied(skillWrite(db, uid, "push", 2));
  });

  test("another user and a signed-out client cannot write progress", async () => {
    const uid = "owner";
    await createUser(uid);
    const owner = dbFor(uid);
    await assertSucceeds(skillWrite(owner, uid, "handstand", 2));

    const intruder = dbFor("intruder");
    await assertDenied(skillWrite(intruder, uid, "handstand", 3));

    const signedOut = testEnv.unauthenticatedContext().firestore();
    await assertDenied(skillWrite(signedOut, uid, "handstand", 0));

    const saved = await getDoc(userDoc(owner, uid));
    assert.equal(saved.data().skills.handstand, 2);
  });

  test("a write cannot remove a skill, change two skills, or touch another field", async () => {
    const uid = "shape";
    const db = await createUser(uid);
    await assertSucceeds(skillWrite(db, uid, "l-sit", 1));
    await assertSucceeds(skillWrite(db, uid, "v-sit", 2));

    await assertDenied(
      updateDoc(userDoc(db, uid), {
        "skills.l-sit": deleteField(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertDenied(
      updateDoc(userDoc(db, uid), {
        "skills.l-sit": 3,
        "skills.v-sit": 3,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertDenied(
      updateDoc(userDoc(db, uid), {
        "skills.l-sit": 3,
        email: "other@example.com",
        updatedAt: serverTimestamp(),
      }),
    );

    const saved = await getDoc(userDoc(db, uid));
    assert.equal(saved.data().skills["l-sit"], 1);
    assert.equal(saved.data().skills["v-sit"], 2);
    assert.equal(saved.data().email, "shape@example.com");
  });

  test("an older account with no skills map can save its first skill", async () => {
    const uid = "legacy";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", uid), {
        schemaVersion: 2,
        email: `${uid}@example.com`,
        authUID: uid,
        createdAt: new Date(),
        streak: { current: 0, longest: 0, lastLog: null },
        workout: 0,
        rest: 0,
      });
    });

    const db = dbFor(uid);
    await assertSucceeds(skillWrite(db, uid, "pull-up", 2));
    const saved = await getDoc(userDoc(db, uid));
    assert.equal(saved.data().skills["pull-up"], 2);
  });

  test("a full map at the size bound can change a skill, and one past it cannot", async () => {
    const skills = { push: null, pull: null };
    for (const skillId of skillIds) skills[skillId] = 0;
    let extra = 0;
    while (Object.keys(skills).length < 120) {
      skills[`legacy-${extra}`] = 1;
      extra += 1;
    }

    const atBound = "size-bound";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", atBound), {
        schemaVersion: 2,
        email: `${atBound}@example.com`,
        authUID: atBound,
        skills,
      });
    });
    const boundDb = dbFor(atBound);
    await assertSucceeds(skillWrite(boundDb, atBound, "victorian", 3));
    const saved = await getDoc(userDoc(boundDb, atBound));
    assert.equal(saved.data().skills.victorian, 3);

    const over = "size-over";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", over), {
        schemaVersion: 2,
        email: `${over}@example.com`,
        authUID: over,
        skills: { ...skills, "one-more": 1 },
      });
    });
    await assertDenied(skillWrite(dbFor(over), over, "victorian", 2));
  });

  test("streak and workout-log rules still accept their existing writes", async () => {
    const uid = "other-rules";
    const db = await createUser(uid);
    const today = utcDay();

    await assertSucceeds(
      updateDoc(userDoc(db, uid), {
        streak: { current: 1, longest: 1, lastLog: today },
        workout: 1,
        rest: 0,
      }),
    );

    const sections = {
      warmup: [],
      primary: [],
      secondary: [],
      volume: [],
    };
    await assertDenied(
      addDoc(collection(db, "users", uid, "workoutLogs"), {
        date: today,
        category: "push",
        sections,
        loggedAt: serverTimestamp(),
      }),
    );
    const logRef = await assertSucceeds(
      addDoc(collection(db, "users", uid, "workoutLogs"), {
        date: today,
        category: "push",
        setCount: 8,
        sections,
        loggedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(logRef, {
        category: "pull",
        setCount: 9,
        loggedAt: serverTimestamp(),
      }),
    );
    await assertDenied(
      updateDoc(logRef, {
        category: "legs",
      }),
    );
  });

  test("workout duration is optional on create and immutable on edit", async () => {
    const uid = "duration-owner";
    const db = await createUser(uid);
    const logs = collection(db, "users", uid, "workoutLogs");
    const workout = {
      date: utcDay(),
      category: "push",
      setCount: 1,
      sections: { warmup: [], primary: [], secondary: [], volume: [] },
      loggedAt: serverTimestamp(),
    };
    for (const durationSec of [-1, 2.5, null, "60"]) {
      await assertDenied(addDoc(logs, { ...workout, durationSec }));
    }
    const manual = await assertSucceeds(addDoc(logs, workout));
    const timed = await assertSucceeds(addDoc(logs, { ...workout, durationSec: 65 }));
    const edit = { category: "pull", loggedAt: serverTimestamp() };
    await assertSucceeds(updateDoc(timed, edit));
    await assertDenied(updateDoc(timed, { ...edit, durationSec: 66 }));
    await assertDenied(updateDoc(timed, { ...edit, durationSec: deleteField() }));
    await assertDenied(updateDoc(manual, { ...edit, durationSec: 65 }));
    assert.equal((await getDoc(timed)).data().durationSec, 65);
  });

});
