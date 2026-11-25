export const DRAFT_KEY = "wings-live-session";

export const SECTION_ORDER = ["warmup", "primary", "secondary", "volume"];

export const SECTION_LABELS = {
  warmup: "Warmup",
  primary: "Primary Skill",
  secondary: "Secondary",
  volume: "Volume / Accessory",
};

export const SECTION_LIMITS = {
  warmup: 2,
  primary: 2,
  secondary: 3,
  volume: 3,
};

export const CATEGORIES = ["push", "pull", "legs", "full-body", "conditioning"];

export const REST_STEPS = [60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];

export const DEFAULT_REST = 90;

export const MAX_SETS = 4;

export const MAX_DURATION_SEC = 4 * 60 * 60;

export const MAX_SESSION_MS = MAX_DURATION_SEC * 1000;

const PHASES = ["planning", "exercising", "resting", "summary"];

export function blankSession() {
  return {
    phase: "planning",
    category: "push",
    exercises: [],
    nextId: 1,
    cursor: null,
    endsAt: null,
    startedAt: null,
    finishedAt: null,
  };
}

export function defaultMeasure(metric) {
  return metric === "Isometric" ? "hold" : "reps";
}

// Older logs have no rest. null means it was never recorded, so the card
// does not invent one. A new session still needs a number to count down.
export function restSeconds(value) {
  const seconds = Number(value);
  return REST_STEPS.includes(seconds) ? seconds : null;
}

export function normalizeWorkoutLog(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sections = {};
  const stored = source.sections && typeof source.sections === "object" ? source.sections : {};
  for (const section of SECTION_ORDER) {
    const list = stored[section];
    sections[section] = Array.isArray(list)
      ? list.map(normalizeStoredExercise).filter(Boolean)
      : [];
  }
  const category = typeof source.category === "string" ? source.category : "";
  return {
    id: source.id,
    date: typeof source.date === "string" ? source.date : "",
    category,
    sections,
    ...(Number.isFinite(source.durationSec) && source.durationSec >= 0
      ? { durationSec: source.durationSec }
      : {}),
    pending: Boolean(source.pending),
  };
}

function normalizeStoredExercise(raw) {
  if (!raw || typeof raw !== "object") return null;
  const efforts = Array.isArray(raw.efforts)
    ? raw.efforts.map((value) => String(value ?? "").trim()).filter((value) => value !== "")
    : [];
  return {
    name: raw.name == null ? "" : String(raw.name),
    sets: raw.sets == null || raw.sets === "" ? "" : String(raw.sets),
    measure: raw.measure === "hold" ? "hold" : "reps",
    efforts,
    reps: raw.reps == null ? "" : String(raw.reps),
    notes: raw.notes == null ? "" : String(raw.notes),
    restSec: restSeconds(raw.restSec),
  };
}

export function remainingMs(endsAt, now) {
  if (typeof endsAt !== "number" || typeof now !== "number") return 0;
  return Math.max(0, endsAt - now);
}

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function durationMs(state, now) {
  const end = state?.finishedAt ?? now;
  if (!Number.isFinite(state?.startedAt) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - state.startedAt);
}

export function effortError(measure, value) {
  const entry = String(value ?? "").trim();
  if (measure === "hold") {
    const seconds = Number(entry);
    if (!/^\d+(\.\d)?$/.test(entry) || seconds <= 0 || seconds > 600) {
      return "Hold times need to be seconds from 0.1 to 600.";
    }
    return null;
  }
  if (!/^\d+$/.test(entry) || Number(entry) < 1 || Number(entry) > 999) {
    return "Reps need to be a whole number from 1 to 999.";
  }
  return null;
}

export function planError(state) {
  if (!CATEGORIES.includes(state.category)) return "Pick a workout category.";
  if (state.exercises.length === 0) return "Add an exercise before starting.";
  for (const exercise of state.exercises) {
    const name = exercise.name.trim();
    if (!name) return "Every exercise needs a name.";
    if (name.length > 80) return "Exercise names need to be 80 characters or less.";
    if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > MAX_SETS) {
      return "Sets need to be a whole number from 1 to 4.";
    }
    if (exercise.measure !== "reps" && exercise.measure !== "hold") {
      return "Choose reps or hold for each exercise.";
    }
    if (!REST_STEPS.includes(exercise.restSec)) {
      return "Rest needs to be from 1:00 to 6:00, in 30 second steps.";
    }
    if (exercise.notes.length > 200) return "Notes need to be 200 characters or less.";
  }
  return null;
}

export function hasLoggedWork(state) {
  return state.exercises.some((exercise) => exercise.efforts.length > 0);
}

function savedEfforts(raw) {
  if (Array.isArray(raw?.efforts) && raw.efforts.some((value) => String(value ?? "").trim())) {
    return raw.efforts.map((value) => String(value ?? "").trim()).filter(Boolean);
  }
  return String(raw?.reps ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function plannedSets(raw) {
  const count = Number(raw?.sets);
  if (!Number.isInteger(count) || count < 1 || count > MAX_SETS) return 0;
  return count;
}

function insertBySection(exercises, exercise) {
  const sectionIndex = SECTION_ORDER.indexOf(exercise.section);
  let insertAt = exercises.length;
  for (let index = 0; index < exercises.length; index += 1) {
    if (SECTION_ORDER.indexOf(exercises[index].section) > sectionIndex) {
      insertAt = index;
      break;
    }
  }
  return [...exercises.slice(0, insertAt), exercise, ...exercises.slice(insertAt)];
}

export function sessionFromLog(log) {
  const session = blankSession();
  if (CATEGORIES.includes(log?.category)) session.category = log.category;

  const exercises = [];
  let nextId = 1;
  for (const section of SECTION_ORDER) {
    const list = log?.sections?.[section];
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const name = String(raw?.name ?? "").trim().slice(0, 80);
      const sets = plannedSets(raw);
      if (!name || sets === 0) continue;
      exercises.push({
        id: String(nextId),
        section,
        name,
        sets,
        measure: raw?.measure === "hold" ? "hold" : "reps",
        notes: String(raw?.notes ?? "").slice(0, 200),
        restSec: restSeconds(raw?.restSec) ?? DEFAULT_REST,
        lastTime: savedEfforts(raw),
        efforts: [],
      });
      nextId += 1;
    }
  }

  return { ...session, exercises, nextId };
}

function patchExercise(exercise, patch) {
  const next = { ...exercise };
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    if (typeof patch.name !== "string" || patch.name.length > 80) return null;
    next.name = patch.name;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "sets")) {
    const sets = Number(patch.sets);
    if (!Number.isInteger(sets) || sets < 1 || sets > MAX_SETS) return null;
    next.sets = sets;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "measure")) {
    if (patch.measure !== "reps" && patch.measure !== "hold") return null;
    next.measure = patch.measure;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
    if (typeof patch.notes !== "string" || patch.notes.length > 200) return null;
    next.notes = patch.notes;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "restSec")) {
    if (!REST_STEPS.includes(patch.restSec)) return null;
    next.restSec = patch.restSec;
  }
  return next;
}

function finishWorkout(state, finishedAt) {
  return { ...state, phase: "summary", finishedAt, endsAt: null, cursor: null };
}

function advance(state, now) {
  const exercise = state.exercises[state.cursor.exerciseIndex];
  if (exercise.efforts.length < exercise.sets) {
    return {
      ...state,
      phase: "exercising",
      endsAt: null,
      cursor: {
        exerciseIndex: state.cursor.exerciseIndex,
        setIndex: exercise.efforts.length,
      },
    };
  }
  const nextIndex = state.cursor.exerciseIndex + 1;
  if (nextIndex >= state.exercises.length) return finishWorkout(state, now);
  return {
    ...state,
    phase: "exercising",
    endsAt: null,
    cursor: { exerciseIndex: nextIndex, setIndex: 0 },
  };
}

export function sessionReducer(state, action) {
  switch (action.type) {
    case "setCategory": {
      if (state.phase !== "planning") return state;
      if (!CATEGORIES.includes(action.category)) return state;
      return { ...state, category: action.category };
    }
    case "addExercise": {
      if (state.phase !== "planning") return state;
      if (!SECTION_ORDER.includes(action.section)) return state;
      const count = state.exercises.filter((exercise) => exercise.section === action.section).length;
      if (count >= SECTION_LIMITS[action.section]) return state;
      const exercise = {
        id: String(state.nextId),
        section: action.section,
        name: "",
        sets: 3,
        measure: "reps",
        notes: "",
        restSec: DEFAULT_REST,
        lastTime: null,
        efforts: [],
      };
      return {
        ...state,
        nextId: state.nextId + 1,
        exercises: insertBySection(state.exercises, exercise),
      };
    }
    case "updateExercise": {
      if (state.phase !== "planning") return state;
      const index = state.exercises.findIndex((exercise) => exercise.id === action.id);
      if (index === -1) return state;
      const next = patchExercise(state.exercises[index], action.patch ?? {});
      if (!next) return state;
      const exercises = state.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? next : exercise,
      );
      return { ...state, exercises };
    }
    case "removeExercise": {
      if (state.phase !== "planning") return state;
      const exercises = state.exercises.filter((exercise) => exercise.id !== action.id);
      if (exercises.length === state.exercises.length) return state;
      return { ...state, exercises };
    }
    case "start": {
      if (state.phase !== "planning") return state;
      if (planError(state)) return state;
      return {
        ...state,
        phase: "exercising",
        startedAt: action.now,
        endsAt: null,
        cursor: { exerciseIndex: 0, setIndex: 0 },
        exercises: state.exercises.map((exercise) => ({
          ...exercise,
          name: exercise.name.trim(),
          notes: exercise.notes.trim(),
        })),
      };
    }
    case "completeSet": {
      if (state.phase !== "exercising" || !state.cursor) return state;
      const index = state.cursor.exerciseIndex;
      const exercise = state.exercises[index];
      if (!exercise || state.cursor.setIndex !== exercise.efforts.length) return state;
      if (effortError(exercise.measure, action.value)) return state;
      const efforts = [...exercise.efforts, String(action.value).trim()];
      const exercises = state.exercises.map((item, itemIndex) =>
        itemIndex === index ? { ...item, efforts } : item,
      );
      const updated = { ...state, exercises };
      const finishedExercise = efforts.length >= exercise.sets;
      const lastExercise = index === exercises.length - 1;
      if (finishedExercise && lastExercise) {
        return finishWorkout(updated, action.now);
      }
      return {
        ...updated,
        phase: "resting",
        endsAt: action.now + exercise.restSec * 1000,
      };
    }
    case "skipRest": {
      if (state.phase !== "resting") return state;
      return advance(state, action.now);
    }
    case "restFinished": {
      if (state.phase !== "resting") return state;
      if (typeof action.now !== "number" || typeof state.endsAt !== "number") return state;
      if (action.now < state.endsAt) return state;
      return advance(state, action.now);
    }
    case "endWorkout": {
      if (state.phase !== "exercising" && state.phase !== "resting") return state;
      return finishWorkout(state, action.now);
    }
    case "autoEnd": {
      if (!sessionExceeded(state, action.now)) return state;
      return capSession(state);
    }
    default:
      return state;
  }
}

export function sessionExceeded(state, now) {
  return (state?.phase === "exercising" || state?.phase === "resting")
    && Number.isFinite(state.startedAt)
    && Number.isFinite(now)
    && now - state.startedAt >= MAX_SESSION_MS;
}

export function capSession(state) {
  return {
    ...finishWorkout(state, state.startedAt + MAX_SESSION_MS),
    autoEnded: true,
  };
}

export function sessionToLog(state, date) {
  const sections = {
    warmup: [],
    primary: [],
    secondary: [],
    volume: [],
  };
  for (const exercise of state.exercises) {
    if (exercise.efforts.length === 0) continue;
    const efforts = exercise.efforts.map((value) => String(value).trim());
    sections[exercise.section].push({
      name: exercise.name.trim(),
      sets: String(efforts.length),
      measure: exercise.measure === "hold" ? "hold" : "reps",
      efforts,
      reps: efforts.join(", "),
      notes: exercise.notes.trim(),
      restSec: restSeconds(exercise.restSec) ?? DEFAULT_REST,
    });
  }
  const durationSec = storedDurationSec(state);
  return {
    date,
    ...(durationSec == null ? {} : { durationSec }),
    category: state.category,
    sections,
  };
}

function storedDurationSec(state) {
  if (!Number.isFinite(state?.startedAt) || !Number.isFinite(state?.finishedAt)) return undefined;
  const seconds = Math.ceil(Math.max(0, state.finishedAt - state.startedAt) / 1000);
  return Math.min(MAX_DURATION_SEC, Math.max(0, seconds));
}

const FINALIZE_LOCK = "wings-session-finalize-lock";

export function claimExpiredDraft(now = Date.now()) {
  let raw = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  const draft = parseDraft(raw);
  const expired = sessionExceeded(draft, now);
  const capped = Boolean(draft?.autoEnded) && draft?.phase === "summary";
  if (!expired && !capped) return null;
  try {
    if (localStorage.getItem(FINALIZE_LOCK)) return null;
    localStorage.setItem(FINALIZE_LOCK, "1");
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    return null;
  }
  return { draft: expired ? capSession(draft) : draft, raw };
}

export function finishClaim(raw, saved) {
  try {
    if (!saved && raw) localStorage.setItem(DRAFT_KEY, raw);
    localStorage.removeItem(FINALIZE_LOCK);
  } catch {
    // A leftover lock blocks a second save until storage works again.
  }
}

export function serializeDraft(state) {
  return JSON.stringify(state);
}

function normalizeDraftExercise(exercise) {
  if (!exercise || typeof exercise !== "object") return null;
  const sets = Number(exercise.sets);
  return {
    ...exercise,
    id: exercise.id == null ? "" : String(exercise.id),
    section: SECTION_ORDER.includes(exercise.section) ? exercise.section : "volume",
    name: typeof exercise.name === "string" ? exercise.name : "",
    sets: Number.isInteger(sets) && sets >= 1 && sets <= MAX_SETS ? sets : 1,
    measure: exercise.measure === "hold" ? "hold" : "reps",
    notes: typeof exercise.notes === "string" ? exercise.notes : "",
    restSec: restSeconds(exercise.restSec) ?? DEFAULT_REST,
    lastTime: Array.isArray(exercise.lastTime)
      ? exercise.lastTime.map((value) => String(value ?? ""))
      : null,
    efforts: Array.isArray(exercise.efforts)
      ? exercise.efforts.map((value) => String(value ?? ""))
      : [],
  };
}

export function parseDraft(raw) {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!PHASES.includes(data.phase)) return null;
    if (!CATEGORIES.includes(data.category)) return null;
    if (!Array.isArray(data.exercises)) return null;
    return {
      ...data,
      exercises: data.exercises.map(normalizeDraftExercise).filter(Boolean),
    };
  } catch {
    return null;
  }
}
