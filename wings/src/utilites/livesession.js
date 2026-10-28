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
  };
}

export function defaultMeasure(metric) {
  return metric === "Isometric" ? "hold" : "reps";
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
  if (typeof state?.startedAt !== "number" || typeof now !== "number") return 0;
  return Math.max(0, now - state.startedAt);
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
    for (const raw of log?.sections?.[section] ?? []) {
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
        restSec: DEFAULT_REST,
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

function advance(state) {
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
  if (nextIndex >= state.exercises.length) {
    return { ...state, phase: "summary", endsAt: null, cursor: null };
  }
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
        return { ...updated, phase: "summary", endsAt: null, cursor: null };
      }
      return {
        ...updated,
        phase: "resting",
        endsAt: action.now + exercise.restSec * 1000,
      };
    }
    case "skipRest": {
      if (state.phase !== "resting") return state;
      return advance(state);
    }
    case "restFinished": {
      if (state.phase !== "resting") return state;
      if (typeof action.now !== "number" || typeof state.endsAt !== "number") return state;
      if (action.now < state.endsAt) return state;
      return advance(state);
    }
    case "endWorkout": {
      if (state.phase !== "exercising" && state.phase !== "resting") return state;
      return { ...state, phase: "summary", endsAt: null, cursor: null };
    }
    default:
      return state;
  }
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
    });
  }
  return {
    date,
    category: state.category,
    sections,
  };
}

export function serializeDraft(state) {
  return JSON.stringify(state);
}

export function parseDraft(raw) {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!PHASES.includes(data.phase)) return null;
    if (!CATEGORIES.includes(data.category)) return null;
    if (!Array.isArray(data.exercises)) return null;
    return data;
  } catch {
    return null;
  }
}
