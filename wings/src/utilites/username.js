// usernames/{handle} reserves a case-insensitive handle for one account.
// The id is the normalized handle. The document stores { uid, username }
// and nothing private, so a later friend-group lookup can resolve a handle
// without reading the owner's user document.

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{1,23}$/;

export const USERNAME_RULE_MESSAGE =
  "Use 2–24 characters. Start with a letter or number. Letters, numbers, spaces, _ and - only.";

export const USERNAME_TAKEN_MESSAGE = "That username is already taken.";

function coded(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function normalizeUsername(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function isStoredUsername(value) {
  return typeof value === "string"
    && USERNAME_PATTERN.test(value)
    && !value.includes("  ")
    && !value.endsWith(" ");
}

export function usernameError(value) {
  if (value === "") return "";
  if (!isStoredUsername(value)) return USERNAME_RULE_MESSAGE;
  return "";
}

export function usernameHandle(value) {
  const normalized = normalizeUsername(value);
  if (!isStoredUsername(normalized)) return "";
  return normalized.toLowerCase();
}

function storedUsernameHandles(userData) {
  if (!userData || typeof userData !== "object") return [];
  const handles = [];
  const seen = new Set();
  const candidates = [userData.usernameLower, userData.username];
  for (const candidate of candidates) {
    const handle = usernameHandle(candidate);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    handles.push(handle);
  }
  return handles;
}

function reservationOf(reservations, handle) {
  if (!reservations || typeof reservations.get !== "function") return null;
  const data = reservations.get(handle);
  return data && typeof data === "object" ? data : null;
}

function planUsernameWrite({ uid, username, userData, reservations }) {
  if (typeof username !== "string") {
    throw coded("invalid-argument", USERNAME_RULE_MESSAGE);
  }
  const problem = usernameError(username);
  if (problem) throw coded("invalid-argument", problem);
  if (!userData) throw coded("not-found", "Couldn't find your account.");

  const nextHandle = username ? usernameHandle(username) : "";
  if (username && !nextHandle) throw coded("invalid-argument", USERNAME_RULE_MESSAGE);

  if (nextHandle) {
    const current = reservationOf(reservations, nextHandle);
    if (current && current.uid !== uid) {
      throw coded("already-exists", USERNAME_TAKEN_MESSAGE);
    }
  }

  const claims = [];
  if (nextHandle) {
    claims.push({
      handle: nextHandle,
      data: { uid, username },
    });
  }

  const releases = [];
  for (const handle of storedUsernameHandles(userData)) {
    if (handle === nextHandle) continue;
    const current = reservationOf(reservations, handle);
    if (current && current.uid === uid) releases.push(handle);
  }

  return {
    userPatch: {
      username,
      usernameLower: nextHandle,
    },
    claims,
    releases,
  };
}

function planUsernameRelease({ uid, userData, reservations }) {
  const releases = [];
  for (const handle of storedUsernameHandles(userData)) {
    const current = reservationOf(reservations, handle);
    if (current && current.uid === uid) releases.push(handle);
  }
  return releases;
}

function assertUid(uid) {
  if (typeof uid !== "string" || uid === "") {
    throw coded("invalid-argument", "Couldn't find your account.");
  }
}

async function readReservations(store, handles) {
  const reservations = new Map();
  for (const handle of handles) {
    const snap = await store.get({ collection: "usernames", id: handle });
    reservations.set(handle, snap?.exists ? snap.data : null);
  }
  return reservations;
}

export async function commitUsernameClaim(store, uid, rawUsername) {
  assertUid(uid);
  if (typeof rawUsername !== "string") {
    throw coded("invalid-argument", USERNAME_RULE_MESSAGE);
  }
  const username = normalizeUsername(rawUsername);
  const problem = usernameError(username);
  if (problem) throw coded("invalid-argument", problem);

  const userRef = { collection: "users", id: uid };
  const userSnap = await store.get(userRef);
  const userData = userSnap?.exists ? userSnap.data : null;
  if (!userData) throw coded("not-found", "Couldn't find your account.");

  const handles = storedUsernameHandles(userData);
  const nextHandle = username ? usernameHandle(username) : "";
  if (nextHandle && !handles.includes(nextHandle)) handles.push(nextHandle);

  const reservations = await readReservations(store, handles);
  const plan = planUsernameWrite({
    uid,
    username,
    userData,
    reservations,
  });

  for (const claim of plan.claims) {
    await store.set({ collection: "usernames", id: claim.handle }, claim.data);
  }
  for (const handle of plan.releases) {
    await store.delete({ collection: "usernames", id: handle });
  }
  await store.update(userRef, plan.userPatch);
  return plan;
}

export async function deleteUserIdentity(store, uid) {
  assertUid(uid);
  const userRef = { collection: "users", id: uid };
  const userSnap = await store.get(userRef);
  const userData = userSnap?.exists ? userSnap.data : null;
  const reservations = await readReservations(store, storedUsernameHandles(userData));
  const releases = planUsernameRelease({ uid, userData, reservations });

  for (const handle of releases) {
    await store.delete({ collection: "usernames", id: handle });
  }
  if (userData) await store.delete(userRef);
  return { userExisted: Boolean(userData), releases };
}
