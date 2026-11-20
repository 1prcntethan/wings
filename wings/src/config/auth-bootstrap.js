// Boot must always settle. Auth and Firestore can reject or hang when the
// device is offline, and a stale in-flight callback must not overwrite a newer
// sign-in or a sign-out.
export const AUTH_BOOT_TIMEOUT_MS = 15000;

export function subscribeAuthBoot({
  auth,
  onAuthStateChanged,
  ensureUserDoc,
  onChange,
  timeoutMs = AUTH_BOOT_TIMEOUT_MS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
}) {
  let active = true;
  let generation = 0;
  let sawAuthEvent = false;
  let snapshot = {
    currentUser: null,
    userLoggedIn: false,
    dbReady: false,
    loading: true,
  };
  const timers = new Set();

  function schedule(fn, ms) {
    const id = setTimer(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function cancel(id) {
    if (id == null || !timers.has(id)) return;
    timers.delete(id);
    clearTimer(id);
  }

  function publish(patch) {
    snapshot = { ...snapshot, ...patch };
    if (!active) return;
    onChange(snapshot);
  }

  function settle(id, user) {
    if (!active || id !== generation) return;
    publish({
      currentUser: user,
      userLoggedIn: Boolean(user),
      dbReady: true,
      loading: false,
    });
  }

  function prepareUser(user, id) {
    return Promise.resolve()
      .then(() => {
        // A cached token still works offline. Forcing a refresh rejects when
        // Auth is unreachable and used to leave the shell on the spinner.
        return user.getIdToken();
      })
      .catch((error) => {
        console.error("Auth token unavailable", error);
      })
      .then(() => {
        if (!active || id !== generation) return;
        return ensureUserDoc(user);
      })
      .catch((error) => {
        console.error("ensureUserDoc failed", error);
      });
  }

  if (!auth) {
    publish({
      currentUser: null,
      userLoggedIn: false,
      dbReady: true,
      loading: false,
    });
    return () => {
      active = false;
    };
  }

  const bootTimer = schedule(() => {
    if (!active || sawAuthEvent) return;
    console.error("Auth boot timed out");
    settle(generation, null);
  }, timeoutMs);

  let unsubscribe = () => {};
  try {
    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        sawAuthEvent = true;
        cancel(bootTimer);
        const id = ++generation;
        publish({ loading: true, dbReady: false });

        if (!user) {
          settle(id, null);
          return;
        }

        const timer = schedule(() => {
          console.error("Auth boot timed out");
          settle(id, user);
        }, timeoutMs);

        prepareUser(user, id).finally(() => {
          cancel(timer);
          settle(id, user);
        });
      },
      (error) => {
        sawAuthEvent = true;
        cancel(bootTimer);
        console.error("Auth state failed", error);
        const id = ++generation;
        settle(id, snapshot.currentUser);
      },
    );
  } catch (error) {
    sawAuthEvent = true;
    cancel(bootTimer);
    console.error("Auth state failed", error);
    settle(generation, null);
  }

  if (typeof unsubscribe !== "function") unsubscribe = () => {};

  return () => {
    active = false;
    for (const id of timers) clearTimer(id);
    timers.clear();
    unsubscribe();
  };
}
