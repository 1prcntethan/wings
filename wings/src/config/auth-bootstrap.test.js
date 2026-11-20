import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_BOOT_TIMEOUT_MS, subscribeAuthBoot } from "./auth-bootstrap.js";

function createClock() {
  let now = 0;
  let seq = 1;
  const timers = new Map();

  function flush() {
    const due = [...timers.entries()]
      .filter(([, timer]) => timer.at <= now)
      .sort((a, b) => a[1].at - b[1].at || a[1].seq - b[1].seq);
    if (due.length === 0) return;
    const [id, timer] = due[0];
    timers.delete(id);
    timer.fn();
    flush();
  }

  return {
    setTimer(fn, ms) {
      const id = seq;
      seq += 1;
      timers.set(id, { fn, at: now + ms, seq: id });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    advance(ms) {
      now += ms;
      flush();
    },
  };
}

function createAuth() {
  let next = null;
  let error = null;
  let unsubscribeCount = 0;
  return {
    auth: { name: "auth" },
    onAuthStateChanged(receivedAuth, onNext, onError) {
      assert.equal(receivedAuth, this.auth);
      next = onNext;
      error = onError;
      return () => {
        unsubscribeCount += 1;
        next = null;
        error = null;
      };
    },
    emit(user) {
      next?.(user);
    },
    fail(err) {
      error?.(err);
    },
    get unsubscribeCount() {
      return unsubscribeCount;
    },
  };
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

async function withSilentConsole(fn) {
  const restore = console.error;
  console.error = () => {};
  try {
    await fn();
  } finally {
    console.error = restore;
  }
}

function listen(authApi, overrides = {}) {
  const clock = overrides.clock || createClock();
  const states = [];
  const stop = subscribeAuthBoot({
    auth: authApi.auth,
    onAuthStateChanged: authApi.onAuthStateChanged.bind(authApi),
    ensureUserDoc: overrides.ensureUserDoc || (async () => {}),
    onChange(state) {
      states.push({ ...state });
    },
    timeoutMs: overrides.timeoutMs ?? 1000,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { clock, states, stop };
}

test("default boot timeout is finite", () => {
  assert.equal(AUTH_BOOT_TIMEOUT_MS, 15000);
});

test("signed-out auth settles so public routes can render", () => {
  const authApi = createAuth();
  const { states } = listen(authApi);
  authApi.emit(null);

  const settled = states.at(-1);
  assert.equal(settled.currentUser, null);
  assert.equal(settled.userLoggedIn, false);
  assert.equal(settled.dbReady, true);
  assert.equal(settled.loading, false);
});

test("token and user-doc failures still settle with the cached user", async () => {
  const authApi = createAuth();
  const user = {
    uid: "user-1",
    getIdToken() {
      return Promise.reject(Object.assign(new Error("offline"), {
        code: "auth/network-request-failed",
      }));
    },
  };
  let ensureCalls = 0;
  const { states } = listen(authApi, {
    ensureUserDoc() {
      ensureCalls += 1;
      return Promise.reject(Object.assign(new Error("unavailable"), {
        code: "unavailable",
      }));
    },
  });

  await withSilentConsole(async () => {
    authApi.emit(user);
    await flush();
  });

  assert.equal(ensureCalls, 1);
  const settled = states.at(-1);
  assert.equal(settled.currentUser, user);
  assert.equal(settled.userLoggedIn, true);
  assert.equal(settled.dbReady, true);
  assert.equal(settled.loading, false);
});

test("a hanging token refresh settles and still ensures the doc later", async () => {
  const authApi = createAuth();
  let resolveToken = null;
  const user = {
    uid: "user-2",
    getIdToken() {
      return new Promise((resolve) => {
        resolveToken = resolve;
      });
    },
  };
  let ensureCalls = 0;
  const { clock, states } = listen(authApi, {
    timeoutMs: 1000,
    ensureUserDoc() {
      ensureCalls += 1;
      return Promise.resolve();
    },
  });

  await withSilentConsole(async () => {
    authApi.emit(user);
    await flush();
    assert.equal(states.at(-1).loading, true);
    clock.advance(1000);
  });

  assert.equal(states.at(-1).loading, false);
  assert.equal(states.at(-1).dbReady, true);
  assert.equal(states.at(-1).currentUser, user);
  assert.equal(ensureCalls, 0);

  resolveToken();
  await flush();
  assert.equal(ensureCalls, 1);
  assert.equal(states.at(-1).currentUser, user);
  assert.equal(states.at(-1).loading, false);
});

test("a hanging user-doc read cannot hold the spinner", async () => {
  const authApi = createAuth();
  const user = {
    uid: "user-3",
    getIdToken() {
      return Promise.resolve("token");
    },
  };
  const { clock, states } = listen(authApi, {
    timeoutMs: 1000,
    ensureUserDoc() {
      return new Promise(() => {});
    },
  });

  await withSilentConsole(async () => {
    authApi.emit(user);
    await flush();
    clock.advance(1000);
  });

  assert.equal(states.at(-1).currentUser, user);
  assert.equal(states.at(-1).loading, false);
  assert.equal(states.at(-1).dbReady, true);
});

test("auth observer errors and a silent observer settle logged out", async () => {
  const errored = createAuth();
  const errorListen = listen(errored);
  await withSilentConsole(async () => {
    errored.fail(new Error("auth/network-request-failed"));
  });
  assert.equal(errorListen.states.at(-1).loading, false);
  assert.equal(errorListen.states.at(-1).dbReady, true);
  assert.equal(errorListen.states.at(-1).currentUser, null);

  const silent = createAuth();
  const silentListen = listen(silent, { timeoutMs: 1000 });
  await withSilentConsole(async () => {
    silentListen.clock.advance(1000);
  });
  assert.equal(silentListen.states.at(-1).loading, false);
  assert.equal(silentListen.states.at(-1).dbReady, true);
  assert.equal(silentListen.states.at(-1).userLoggedIn, false);
});

test("missing auth settles logged out without subscribing", () => {
  let calls = 0;
  const states = [];
  const stop = subscribeAuthBoot({
    auth: null,
    onAuthStateChanged() {
      calls += 1;
      throw new Error("should not subscribe");
    },
    ensureUserDoc: async () => {},
    onChange(state) {
      states.push({ ...state });
    },
    timeoutMs: 1000,
    setTimer() {
      throw new Error("should not wait");
    },
    clearTimer() {},
  });

  assert.equal(calls, 0);
  assert.equal(states.at(-1).loading, false);
  assert.equal(states.at(-1).dbReady, true);
  assert.equal(states.at(-1).currentUser, null);
  stop();
});

test("subscribe throwing settles logged out", async () => {
  const states = [];
  await withSilentConsole(async () => {
    subscribeAuthBoot({
      auth: {},
      onAuthStateChanged() {
        throw new Error("persistence blocked");
      },
      ensureUserDoc: async () => {},
      onChange(state) {
        states.push({ ...state });
      },
      timeoutMs: 1000,
      setTimer() {
        return 1;
      },
      clearTimer() {},
    });
  });

  assert.equal(states.at(-1).loading, false);
  assert.equal(states.at(-1).dbReady, true);
  assert.equal(states.at(-1).currentUser, null);
});

test("sign-out wins over an in-flight sign-in", async () => {
  const authApi = createAuth();
  let resolveToken = null;
  const user = {
    uid: "user-4",
    getIdToken() {
      return new Promise((resolve) => {
        resolveToken = resolve;
      });
    },
  };
  let ensureCalls = 0;
  const { states } = listen(authApi, {
    ensureUserDoc() {
      ensureCalls += 1;
      return Promise.resolve();
    },
  });

  authApi.emit(user);
  await flush();
  assert.equal(typeof resolveToken, "function");
  authApi.emit(null);
  resolveToken();
  await flush();

  assert.equal(ensureCalls, 0);
  assert.equal(states.at(-1).currentUser, null);
  assert.equal(states.at(-1).userLoggedIn, false);
  assert.equal(states.at(-1).loading, false);
  assert.equal(states.at(-1).dbReady, true);
});

test("unmount ignores a late token and cancels the boot timer", async () => {
  const authApi = createAuth();
  let resolveToken = null;
  const user = {
    uid: "user-5",
    getIdToken() {
      return new Promise((resolve) => {
        resolveToken = resolve;
      });
    },
  };
  let ensureCalls = 0;
  const { clock, states, stop } = listen(authApi, {
    timeoutMs: 1000,
    ensureUserDoc() {
      ensureCalls += 1;
      return Promise.resolve();
    },
  });

  authApi.emit(user);
  await flush();
  const countAfterEmit = states.length;
  assert.equal(typeof resolveToken, "function");
  stop();
  assert.equal(authApi.unsubscribeCount, 1);
  resolveToken();
  await flush();
  clock.advance(5000);

  assert.equal(states.length, countAfterEmit);
  assert.equal(ensureCalls, 0);
  assert.equal(states.at(-1).loading, true);
});

test("a late auth user still applies after the initial boot timeout", async () => {
  const authApi = createAuth();
  const user = {
    uid: "user-6",
    getIdToken() {
      return Promise.resolve("token");
    },
  };
  const { clock, states } = listen(authApi, { timeoutMs: 1000 });

  await withSilentConsole(async () => {
    clock.advance(1000);
  });
  assert.equal(states.at(-1).loading, false);
  assert.equal(states.at(-1).currentUser, null);

  authApi.emit(user);
  await flush();
  assert.equal(states.at(-1).currentUser, user);
  assert.equal(states.at(-1).userLoggedIn, true);
  assert.equal(states.at(-1).loading, false);
});
