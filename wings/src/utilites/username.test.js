import assert from "node:assert/strict";
import test from "node:test";
import { accountErrorMessage } from "./account.js";
import {
  USERNAME_RULE_MESSAGE,
  USERNAME_TAKEN_MESSAGE,
  commitUsernameClaim,
  deleteUserIdentity,
  normalizeUsername,
  usernameError,
  usernameHandle,
} from "./username.js";

function profile(uid, extra = {}) {
  return {
    schemaVersion: 2,
    email: `${uid}@example.com`,
    authUID: uid,
    streak: { current: 4, longest: 9, lastLog: "2026-11-01" },
    workout: 3,
    rest: 1,
    skills: { push: 2, pull: null },
    ...extra,
  };
}

function createStore(seed = {}) {
  const users = new Map(Object.entries(seed.users ?? {}));
  const usernames = new Map(Object.entries(seed.usernames ?? {}));
  const ops = [];

  function table(collection) {
    if (collection === "users") return users;
    if (collection === "usernames") return usernames;
    throw new Error(`Unexpected collection ${collection}`);
  }

  return {
    ops,
    users,
    usernames,
    async get(ref) {
      ops.push(["get", ref.collection, ref.id]);
      const data = table(ref.collection).get(ref.id);
      return {
        exists: data !== undefined,
        data: data ? structuredClone(data) : null,
      };
    },
    async set(ref, data) {
      ops.push(["set", ref.collection, ref.id, structuredClone(data)]);
      if (ref.collection !== "usernames") {
        throw new Error(`Refusing to set ${ref.collection}`);
      }
      table(ref.collection).set(ref.id, structuredClone(data));
    },
    async update(ref, data) {
      ops.push(["update", ref.collection, ref.id, structuredClone(data)]);
      if (ref.collection !== "users") {
        throw new Error(`Refusing to update ${ref.collection}`);
      }
      const current = table(ref.collection).get(ref.id);
      if (!current) {
        throw Object.assign(new Error("missing user"), { code: "not-found" });
      }
      table(ref.collection).set(ref.id, { ...current, ...structuredClone(data) });
    },
    async delete(ref) {
      ops.push(["delete", ref.collection, ref.id]);
      table(ref.collection).delete(ref.id);
    },
  };
}

function readsBeforeWrites(ops) {
  const firstWrite = ops.findIndex((op) => op[0] !== "get");
  if (firstWrite === -1) return true;
  return ops.slice(firstWrite).every((op) => op[0] !== "get");
}

test("normalize collapses case-insensitive handles without changing display letters", () => {
  assert.equal(normalizeUsername("  Ethan   Smith  "), "Ethan Smith");
  assert.equal(normalizeUsername("\tEthan\nSmith\t"), "Ethan Smith");
  assert.equal(normalizeUsername(null), "");
  assert.equal(usernameHandle("  Ethan   Smith  "), "ethan smith");
  assert.equal(usernameHandle("ETHAN"), usernameHandle("ethan"));
  assert.equal(usernameHandle("bad name!"), "");
});

test("validation matches the stored handle limits", () => {
  assert.equal(usernameError(""), "");
  assert.equal(usernameError("ab"), "");
  assert.equal(usernameError("a b"), "");
  assert.equal(usernameError("a_b-1"), "");
  assert.equal(usernameError("A".repeat(24)), "");
  assert.equal(usernameError("a"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("A".repeat(25)), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("_ab"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("-ab"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("a.b"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("a/b"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("a  b"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("ab "), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError("__admin__"), USERNAME_RULE_MESSAGE);
  assert.equal(usernameError(12), USERNAME_RULE_MESSAGE);
});

test("a new username claims the lowercase handle and keeps progress", async () => {
  const store = createStore({
    users: { ada: profile("ada") },
  });

  await commitUsernameClaim(store, "ada", "  Ethan   Smith ");

  assert.deepEqual(store.usernames.get("ethan smith"), {
    uid: "ada",
    username: "Ethan Smith",
  });
  assert.equal(store.users.get("ada").email, "ada@example.com");
  assert.equal(store.users.get("ada").streak.current, 4);
  assert.equal(store.users.get("ada").skills.push, 2);
  assert.equal(store.users.get("ada").username, "Ethan Smith");
  assert.equal(store.users.get("ada").usernameLower, "ethan smith");
  assert.equal(readsBeforeWrites(store.ops), true);
  assert.equal(store.ops.some((op) => op[0] === "set" && op[1] === "users"), false);
});

test("case-insensitive collisions reject the second account", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan", usernameLower: "ethan" }),
      bea: profile("bea"),
    },
    usernames: {
      ethan: { uid: "ada", username: "Ethan" },
    },
  });
  const before = structuredClone(store.users.get("bea"));

  await assert.rejects(
    commitUsernameClaim(store, "bea", "ETHAN"),
    (error) => error.code === "already-exists" && error.message === USERNAME_TAKEN_MESSAGE,
  );

  assert.deepEqual(store.usernames.get("ethan"), { uid: "ada", username: "Ethan" });
  assert.deepEqual(store.users.get("bea"), before);
  assert.equal(store.ops.some((op) => op[0] !== "get"), false);
});

test("the owner can change capitalization without releasing the handle", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan", usernameLower: "ethan" }),
    },
    usernames: {
      ethan: { uid: "ada", username: "Ethan" },
    },
  });

  await commitUsernameClaim(store, "ada", "eThAn");

  assert.deepEqual(store.usernames.get("ethan"), { uid: "ada", username: "eThAn" });
  assert.equal(store.usernames.size, 1);
  assert.equal(store.users.get("ada").username, "eThAn");
  assert.equal(store.users.get("ada").usernameLower, "ethan");
  assert.equal(store.ops.some((op) => op[0] === "delete"), false);
});

test("a no-op save keeps a handle the account already owns", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan", usernameLower: "ethan" }),
    },
    usernames: {
      ethan: { uid: "ada", username: "Ethan" },
    },
  });

  await commitUsernameClaim(store, "ada", "Ethan");

  assert.deepEqual(store.usernames.get("ethan"), { uid: "ada", username: "Ethan" });
  assert.equal(store.users.get("ada").usernameLower, "ethan");
  assert.equal(store.users.get("ada").streak.longest, 9);
});

test("renaming releases the previous handle only when this account owns it", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan", usernameLower: "ethan" }),
    },
    usernames: {
      ethan: { uid: "ada", username: "Ethan" },
    },
  });

  await commitUsernameClaim(store, "ada", "Nova");

  assert.equal(store.usernames.has("ethan"), false);
  assert.deepEqual(store.usernames.get("nova"), { uid: "ada", username: "Nova" });
  assert.equal(store.users.get("ada").username, "Nova");
  assert.equal(store.users.get("ada").usernameLower, "nova");
  assert.equal(store.users.get("ada").workout, 3);
});

test("a legacy account claims its current name when no reservation exists", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan" }),
    },
  });

  await commitUsernameClaim(store, "ada", "Ethan");

  assert.deepEqual(store.usernames.get("ethan"), { uid: "ada", username: "Ethan" });
  assert.equal(store.users.get("ada").usernameLower, "ethan");
  assert.equal(store.users.get("ada").email, "ada@example.com");
  assert.equal(store.ops.some((op) => op[0] === "delete"), false);
});

test("a legacy rename succeeds when the old handle was never reserved", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan" }),
    },
  });

  await commitUsernameClaim(store, "ada", "Nova");

  assert.equal(store.usernames.has("ethan"), false);
  assert.deepEqual(store.usernames.get("nova"), { uid: "ada", username: "Nova" });
  assert.equal(store.users.get("ada").skills.pull, null);
});

test("a taken new handle does not release the name this account already owns", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan", usernameLower: "ethan" }),
      bea: profile("bea", { username: "Nova", usernameLower: "nova" }),
    },
    usernames: {
      ethan: { uid: "ada", username: "Ethan" },
      nova: { uid: "bea", username: "Nova" },
    },
  });

  await assert.rejects(
    commitUsernameClaim(store, "ada", "nova"),
    (error) => error.code === "already-exists",
  );

  assert.deepEqual(store.usernames.get("ethan"), { uid: "ada", username: "Ethan" });
  assert.deepEqual(store.usernames.get("nova"), { uid: "bea", username: "Nova" });
  assert.equal(store.users.get("ada").username, "Ethan");
  assert.equal(store.ops.some((op) => op[0] !== "get"), false);
});

test("a legacy name owned by someone else is not released", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan" }),
      bea: profile("bea", { username: "Bea", usernameLower: "bea" }),
    },
    usernames: {
      ethan: { uid: "bea", username: "Ethan" },
    },
  });

  await commitUsernameClaim(store, "ada", "Nova");

  assert.deepEqual(store.usernames.get("ethan"), { uid: "bea", username: "Ethan" });
  assert.deepEqual(store.usernames.get("nova"), { uid: "ada", username: "Nova" });
  assert.equal(store.users.get("bea").username, "Bea");
});

test("clearing a username releases the owned reservation", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan", usernameLower: "ethan" }),
    },
    usernames: {
      ethan: { uid: "ada", username: "Ethan" },
    },
  });

  await commitUsernameClaim(store, "ada", "   ");

  assert.equal(store.usernames.has("ethan"), false);
  assert.equal(store.users.get("ada").username, "");
  assert.equal(store.users.get("ada").usernameLower, "");
  assert.equal(store.users.get("ada").rest, 1);
});

test("clearing a legacy username with no reservation does not fail", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan" }),
    },
  });

  await commitUsernameClaim(store, "ada", "");

  assert.equal(store.usernames.size, 0);
  assert.equal(store.users.get("ada").username, "");
  assert.equal(store.users.get("ada").usernameLower, "");
});

test("an invalid username writes nothing", async () => {
  const store = createStore({
    users: { ada: profile("ada", { username: "Ethan" }) },
  });

  await assert.rejects(
    commitUsernameClaim(store, "ada", "bad name!"),
    (error) => error.code === "invalid-argument",
  );
  await assert.rejects(
    commitUsernameClaim(store, "ada", null),
    (error) => error.code === "invalid-argument",
  );

  assert.equal(store.ops.length, 0);
  assert.equal(store.users.get("ada").username, "Ethan");
  assert.equal(store.usernames.size, 0);
});

test("a missing account cannot claim a handle", async () => {
  const store = createStore();
  await assert.rejects(
    commitUsernameClaim(store, "ada", "Ethan"),
    (error) => error.code === "not-found",
  );
  assert.equal(store.usernames.size, 0);
  assert.equal(store.ops.some((op) => op[0] !== "get"), false);
});

test("deleting an account releases only the handles that account owns", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Alpha", usernameLower: "beta" }),
      bea: profile("bea", { username: "Bea", usernameLower: "bea" }),
    },
    usernames: {
      alpha: { uid: "ada", username: "Alpha" },
      beta: { uid: "ada", username: "Beta" },
      bea: { uid: "bea", username: "Bea" },
      ethan: { uid: "bea", username: "Ethan" },
    },
  });

  const result = await deleteUserIdentity(store, "ada");

  assert.deepEqual(result.releases, ["beta", "alpha"]);
  assert.equal(result.userExisted, true);
  assert.equal(store.users.has("ada"), false);
  assert.equal(store.usernames.has("alpha"), false);
  assert.equal(store.usernames.has("beta"), false);
  assert.deepEqual(store.usernames.get("bea"), { uid: "bea", username: "Bea" });
  assert.equal(store.users.get("bea").email, "bea@example.com");
  assert.equal(readsBeforeWrites(store.ops), true);
});

test("deleting a legacy account with no reservation still removes the user", async () => {
  const store = createStore({
    users: {
      ada: profile("ada", { username: "Ethan" }),
      bea: profile("bea"),
    },
    usernames: {
      ethan: { uid: "bea", username: "Ethan" },
    },
  });

  const result = await deleteUserIdentity(store, "ada");

  assert.deepEqual(result.releases, []);
  assert.equal(store.users.has("ada"), false);
  assert.deepEqual(store.usernames.get("ethan"), { uid: "bea", username: "Ethan" });
  assert.equal(store.users.has("bea"), true);
});

test("deleting an account that was never created is a no-op", async () => {
  const store = createStore({
    usernames: {
      ethan: { uid: "bea", username: "Ethan" },
    },
  });

  const result = await deleteUserIdentity(store, "ada");

  assert.equal(result.userExisted, false);
  assert.deepEqual(result.releases, []);
  assert.equal(store.usernames.has("ethan"), true);
  assert.equal(store.ops.some((op) => op[0] !== "get"), false);
});

test("account errors stay user-facing", () => {
  assert.equal(
    accountErrorMessage({ code: "already-exists" }),
    USERNAME_TAKEN_MESSAGE,
  );
  assert.equal(
    accountErrorMessage({ code: "invalid-argument" }),
    USERNAME_RULE_MESSAGE,
  );
  assert.equal(
    accountErrorMessage({ code: "permission-denied" }),
    "That change was blocked. Try again in a moment.",
  );
  assert.equal(
    accountErrorMessage({ code: "unavailable" }),
    "The server is unavailable. Try again.",
  );
  assert.equal(
    accountErrorMessage({ code: "deadline-exceeded" }),
    "The server is unavailable. Try again.",
  );
  assert.equal(
    accountErrorMessage({ code: "not-found" }),
    "Couldn't find your account. Try again.",
  );
  assert.equal(
    accountErrorMessage({ code: "auth/network-request-failed" }),
    "Network error. Check your connection and try again.",
  );
  assert.equal(accountErrorMessage({ code: "permission-denied" }).includes("permission-denied"), false);
});
