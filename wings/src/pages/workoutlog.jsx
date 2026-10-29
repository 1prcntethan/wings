import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CreatableSelect from "react-select/creatable";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import BetaDisclaimer from "../components/betadisclaimer";
import "./workoutlog.css";
import { useAuth } from "../config/auth-context.jsx";
import { skillTitle } from "../utilites/skilltitles.js";
import {
  DEFAULT_REST,
  DRAFT_KEY,
  REST_STEPS,
  formatClock,
  normalizeWorkoutLog,
  parseDraft,
  restSeconds,
} from "../utilites/livesession.js";
import { shareWorkoutCard } from "../utilites/progresscard.js";
import {
  formatDate,
  getFitnessDateObject,
  getUserDoc,
  getWorkoutLogs,
  logWorkout,
  saveWorkoutLog,
} from "../config/firestore.js";

// ─── section config ────────────────────────────────────────────────────────────
// Each section has a label, a max number of exercises, and a hint shown in the UI.
const SECTIONS = [
  {
    key: "warmup",
    label: "Warmup",
    max: 2,
    hint: "e.g. shoulder rotations, scapular pulls",
  },
  {
    key: "primary",
    label: "Primary Skill",
    max: 2,
    hint: "e.g. planche attempts, handstand practice",
  },
  {
    key: "secondary",
    label: "Secondary",
    max: 3,
    hint: "e.g. planche leans, tuck planche holds",
  },
  {
    key: "volume",
    label: "Volume / Accessory",
    max: 3,
    hint: "e.g. dips, push-ups, core work",
  },
];

// ─── blank exercise factory ────────────────────────────────────────────────────
const WORKOUT_CATEGORIES = ["push", "pull", "legs", "full-body", "conditioning"];
const MAX_SETS = 4;

const skillOptions = [...skillTitle.keys()].map((name) => ({
  value: name,
  label: name,
}));

const skillSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 34,
    height: 34,
    width: "100%",
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: 4,
    boxShadow: "none",
    fontSize: "0.85rem",
    cursor: "text",
    "&:hover": {
      border: "1px solid rgba(255, 255, 255, 0.15)",
    },
    ...(state.isFocused && {
      borderColor: "rgba(255, 255, 255, 0.5)",
      boxShadow: "none",
    }),
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "0 8px",
    height: 32,
  }),
  input: (provided) => ({
    ...provided,
    margin: 0,
    padding: 0,
    color: "#f3f3f3",
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "rgba(255, 255, 255, 0.45)",
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#f3f3f3",
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#641b547a" : "#333333",
    color: "white",
    fontFamily: "Fira Sans",
    fontWeight: 200,
    cursor: "pointer",
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#333333",
    borderRadius: 0,
    boxShadow: "none",
    zIndex: 30,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 30,
  }),
  menuList: (provided) => ({
    ...provided,
    backgroundColor: "#333333",
    padding: 0,
  }),
  noOptionsMessage: (provided) => ({
    ...provided,
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: 4,
    color: "rgb(128, 128, 128)",
    "&:hover": {
      color: "rgb(128, 128, 128)",
    },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: 4,
    color: "rgb(128, 128, 128)",
    "&:hover": {
      color: "rgb(128, 128, 128)",
    },
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: "rgb(128, 128, 128)",
  }),
};

function blankExercise() {
  return { name: "", sets: "", measure: "reps", efforts: [], notes: "", restSec: DEFAULT_REST };
}

function setCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > MAX_SETS) return 0;
  return count;
}

function resizeEfforts(efforts, count) {
  return Array.from({ length: count }, (_, index) => efforts?.[index] ?? "");
}

function fromSavedExercise(raw) {
  if (!raw || typeof raw !== "object") return blankExercise();

  const sets = raw.sets == null ? "" : String(raw.sets);
  const count = setCount(sets);
  let efforts = Array.isArray(raw.efforts)
    ? raw.efforts.map((value) => String(value ?? ""))
    : [];

  if (efforts.length === 0 && count > 0) {
    const legacy = String(raw.reps ?? "").trim();
    if (/^\d+(\.\d)?$/.test(legacy)) {
      efforts = Array.from({ length: count }, () => legacy);
    }
  }

  return {
    name: raw.name == null ? "" : String(raw.name),
    sets,
    measure: raw.measure === "hold" ? "hold" : "reps",
    efforts: count > 0 ? resizeEfforts(efforts, count) : efforts,
    notes: raw.notes == null ? "" : String(raw.notes),
    restSec: restSeconds(raw.restSec) ?? DEFAULT_REST,
  };
}

function restDetail(exercise) {
  const seconds = restSeconds(exercise?.restSec);
  if (seconds == null) return "";
  return `rest ${formatClock(seconds * 1000)}`;
}

function exerciseDetail(exercise) {
  const efforts = Array.isArray(exercise.efforts)
    ? exercise.efforts.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (efforts.length > 0) {
    const unit = exercise.measure === "hold" ? "s" : "";
    const values = efforts.map((value) => `${value}${unit}`).join(", ");
    const sets = exercise.sets || efforts.length;
    return `${sets} × ${values}`;
  }

  if (exercise.sets && exercise.reps) return `${exercise.sets} × ${exercise.reps}`;
  if (exercise.sets) return `${exercise.sets} sets`;
  if (exercise.reps) return String(exercise.reps);
  return "";
}

function validateWorkout(formData) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return "Enter a valid date.";

  const [year, month, day] = formData.date.split("-").map(Number);
  const entered = new Date(year, month - 1, day);
  if (
    entered.getFullYear() !== year ||
    entered.getMonth() !== month - 1 ||
    entered.getDate() !== day
  ) {
    return "Enter a valid date.";
  }

  const today = getFitnessDateObject();
  today.setHours(0, 0, 0, 0);
  if (entered > today) return "That date is still in the future.";
  if (!WORKOUT_CATEGORIES.includes(formData.category)) {
    return "Pick a workout category.";
  }

  let named = 0;
  for (const section of SECTIONS) {
    const rows = formData.sections?.[section.key];
    for (const exercise of Array.isArray(rows) ? rows : []) {
      if (!exercise || typeof exercise !== "object") continue;
      const name = String(exercise.name ?? "").trim();
      const sets = exercise.sets ?? "";
      const notes = (exercise.notes ?? "").trim();
      const efforts = Array.isArray(exercise.efforts) ? exercise.efforts : [];
      const effortsBlank = efforts.every((value) => String(value ?? "").trim() === "");
      const empty = name === "" && sets === "" && notes === "" && effortsBlank;
      if (empty) continue;
      if (!name) return "Every filled row needs an exercise name.";
      if (name.length > 80) return "Exercise names need to be 80 characters or less.";
      const count = setCount(sets);
      if (count === 0) return "Sets need to be a whole number from 1 to 4.";
      if (exercise.measure !== "reps" && exercise.measure !== "hold") {
        return "Choose reps or hold for each exercise.";
      }
      if (efforts.length !== count) return "Enter a value for each set.";
      for (const value of efforts) {
        const entry = String(value ?? "").trim();
        if (exercise.measure === "hold") {
          const seconds = Number(entry);
          if (!/^\d+(\.\d)?$/.test(entry) || seconds <= 0 || seconds > 600) {
            return "Hold times need to be seconds from 0.1 to 600.";
          }
        } else if (!/^\d+$/.test(entry) || Number(entry) < 1 || Number(entry) > 999) {
          return "Reps need to be a whole number from 1 to 999.";
        }
      }
      if (notes.length > 200) return "Notes need to be 200 characters or less.";
      if (restSeconds(exercise.restSec) == null) {
        return "Rest needs to be from 1:00 to 6:00, in 30 second steps.";
      }
      named += 1;
    }
  }

  if (named === 0) return "Add at least one exercise before saving.";
  return null;
}

// ─── blank log factory ─────────────────────────────────────────────────────────
function blankLog() {
  const sections = {};
  SECTIONS.forEach((s) => {
    sections[s.key] = Array.from({ length: s.max }, blankExercise);
  });
  return {
    date: formatDate(getFitnessDateObject()),
    category: "push",
    sections,
  };
}

// ─── sub-components ────────────────────────────────────────────────────────────

function ExerciseRow({ exercise, onChange, onEffort }) {
  const name = exercise.name ?? "";
  const count = setCount(exercise.sets);
  const hold = exercise.measure === "hold";

  return (
    <div className="wl-exercise">
      <div className="wl-skill-select">
        <CreatableSelect
          options={skillOptions}
          value={name ? { value: name, label: name } : null}
          onChange={(option) => onChange("name", option?.value ?? "")}
          onCreateOption={(input) => onChange("name", input)}
          placeholder="type or search a skill"
          formatCreateLabel={(input) => `use "${input}"`}
          isClearable
          menuPortalTarget={document.body}
          menuPosition="fixed"
          classNamePrefix="wl-skill-select"
          styles={skillSelectStyles}
        />
      </div>
      <div className="wl-exercise-meta">
        <label className="wl-mini-label wl-sets">
          sets
          <input
            className="wl-input"
            placeholder="1–4"
            type="number"
            min="1"
            max={MAX_SETS}
            inputMode="numeric"
            value={exercise.sets}
            onChange={(e) => onChange("sets", e.target.value)}
          />
        </label>
        <label className="wl-mini-label wl-rest">
          rest
          <select
            className="wl-input"
            aria-label="rest"
            value={restSeconds(exercise.restSec) ?? DEFAULT_REST}
            onChange={(e) => onChange("restSec", Number(e.target.value))}
          >
            {REST_STEPS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {formatClock(seconds * 1000)}
              </option>
            ))}
          </select>
        </label>
        <div className="wl-measure" role="group" aria-label="reps or hold">
          <button
            type="button"
            className={!hold ? "is-active" : ""}
            onClick={() => onChange("measure", "reps")}
          >
            reps
          </button>
          <button
            type="button"
            className={hold ? "is-active" : ""}
            onClick={() => onChange("measure", "hold")}
          >
            hold
          </button>
        </div>
      </div>
      {count > 0 && (
        <div className={`wl-set-grid wl-set-grid--${count}`}>
          {Array.from({ length: count }, (_, index) => (
            <label key={index} className="wl-mini-label">
              set {index + 1}
              <input
                className="wl-input"
                inputMode={hold ? "decimal" : "numeric"}
                placeholder={hold ? "sec" : "reps"}
                aria-label={`set ${index + 1} ${hold ? "hold seconds" : "reps"}`}
                value={exercise.efforts?.[index] ?? ""}
                onChange={(e) => onEffort(index, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
      <input
        className="wl-input"
        placeholder="notes (optional)"
        value={exercise.notes}
        onChange={(e) => onChange("notes", e.target.value)}
      />
    </div>
  );
}

function SectionBlock({ section, exercises, onChange, onEffort }) {
  return (
    <div className="wl-section">
      <div className="wl-section-header">
        <span className="wl-section-label">{section.label}</span>
        <span className="wl-section-hint">{section.hint}</span>
        <span className="wl-section-limit">max {section.max}</span>
      </div>
      {exercises.map((ex, i) => (
        <ExerciseRow
          key={i}
          exercise={ex}
          onChange={(field, val) => onChange(section.key, i, field, val)}
          onEffort={(setIndex, val) => onEffort(section.key, i, setIndex, val)}
        />
      ))}
    </div>
  );
}

function LogCard({ log, onCopy, onStart, startDisabled }) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);

  const hasExercises = (sectionKey) => {
    const rows = log.sections?.[sectionKey];
    return Array.isArray(rows) && rows.some((e) => String(e?.name ?? "").trim() !== "");
  };

  return (
    <div className="wl-card">
      <div className="wl-card-header" onClick={() => setOpen((o) => !o)}>
        <div className="wl-card-meta">
          <span className="wl-card-date">{log.date}</span>
          <span className={`wl-card-category wl-cat--${log.category}`}>
            {log.category}
          </span>
        </div>
        <div className="wl-card-actions">
          <button
            type="button"
            className="wl-copy-btn"
            disabled={log.pending || startDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onStart(log);
            }}
          >
            start
          </button>
          <button
            type="button"
            className="wl-copy-btn"
            disabled={log.pending}
            onClick={(e) => {
              e.stopPropagation();
              onCopy(log);
            }}
          >
            {log.pending ? "saving" : "copy"}
          </button>
          <button
            type="button"
            className="wl-copy-btn"
            disabled={sharing}
            onClick={async (e) => {
              e.stopPropagation();
              if (sharing) return;
              setSharing(true);
              setShareError(null);
              try {
                await shareWorkoutCard(log);
              } catch (error) {
                if (error?.name !== "AbortError") {
                  setShareError("Couldn't make that image. Try again.");
                }
              } finally {
                setSharing(false);
              }
            }}
          >
            {sharing ? "…" : "share"}
          </button>
          <span className="wl-card-toggle">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {shareError && <p className="wl-card-share-error">{shareError}</p>}

      {open && (
        <div className="wl-card-body">
          {SECTIONS.map((s) =>
            hasExercises(s.key) ? (
              <div key={s.key} className="wl-card-section">
                <div className="wl-card-section-title">{s.label}</div>
                {(Array.isArray(log.sections?.[s.key]) ? log.sections[s.key] : [])
                  .filter((e) => String(e?.name ?? "").trim() !== "")
                  .map((e, i) => {
                    const detail = [exerciseDetail(e), restDetail(e)].filter(Boolean).join(" · ");
                    return (
                    <div key={i} className="wl-card-exercise">
                      <span className="wl-card-ex-name">{e.name}</span>
                      {detail && (
                        <span className="wl-card-ex-detail">{detail}</span>
                      )}
                      {e.notes ? (
                        <span className="wl-card-ex-notes">{e.notes}</span>
                      ) : null}
                    </div>
                    );
                  })}
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function WorkoutLog() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sessionDraft, setSessionDraft] = useState(null);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);
  const [reloadLogs, setReloadLogs] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(blankLog());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [streakWarning, setStreakWarning] = useState(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    try {
      setSessionDraft(parseDraft(localStorage.getItem(DRAFT_KEY)));
    } catch {
      setSessionDraft(null);
    }
  }, []);

  // ── fetch past logs ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setLogs([]);
      setLogsLoading(false);
      setLogsError(null);
      return;
    }

    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);
    getWorkoutLogs(currentUser.uid)
      .then((rows) => {
        if (!cancelled) setLogs(rows.map((row) => normalizeWorkoutLog(row)));
      })
      .catch(() => {
        if (!cancelled) setLogsError("Couldn't load your workouts.");
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, reloadLogs]);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    getUserDoc(currentUser.uid)
      .then((data) => {
        if (cancelled) return;
        setUsername(typeof data?.username === "string" ? data.username : "");
      })
      .catch(() => {
        if (!cancelled) setUsername("");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // ── field updater ────────────────────────────────────────────────────────────
  function updateExercise(sectionKey, index, field, value) {
    setFormData((prev) => {
      const updatedSection = prev.sections[sectionKey].map((ex, i) => {
        if (i !== index) return ex;
        if (field === "sets") {
          const count = setCount(value);
          return { ...ex, sets: value, efforts: resizeEfforts(ex.efforts, count) };
        }
        return { ...ex, [field]: value };
      });
      return {
        ...prev,
        sections: { ...prev.sections, [sectionKey]: updatedSection },
      };
    });
  }

  function updateEffort(sectionKey, index, setIndex, value) {
    setFormData((prev) => {
      const updatedSection = prev.sections[sectionKey].map((ex, i) => {
        if (i !== index) return ex;
        const efforts = resizeEfforts(ex.efforts, setCount(ex.sets));
        efforts[setIndex] = value;
        return { ...ex, efforts };
      });
      return {
        ...prev,
        sections: { ...prev.sections, [sectionKey]: updatedSection },
      };
    });
  }

  function sanitizeWorkout(data) {
    const sections = {};
    SECTIONS.forEach((section) => {
      const rows = data.sections?.[section.key];
      sections[section.key] = (Array.isArray(rows) ? rows : [])
        .filter((exercise) => String(exercise?.name ?? "").trim() !== "")
        .map((exercise) => {
          const efforts = resizeEfforts(exercise.efforts, setCount(exercise.sets)).map((value) =>
            String(value).trim(),
          );
          return {
            name: String(exercise.name ?? "").trim(),
            sets: String(setCount(exercise.sets)),
            measure: exercise.measure === "hold" ? "hold" : "reps",
            efforts,
            reps: efforts.join(", "),
            notes: (exercise.notes ?? "").trim(),
            restSec: restSeconds(exercise.restSec) ?? DEFAULT_REST,
          };
        });
    });
    return {
      date: data.date,
      category: data.category,
      sections,
    };
  }

  // ── save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!currentUser) {
      setSaveError("Sign in to save a workout.");
      return;
    }

    const error = validateWorkout(formData);
    if (error) {
      setSaveError(error);
      return;
    }
    if (saving) return;

    const snapshot = formData;
    const savedShape = sanitizeWorkout(formData);
    const tempId = `pending-${Date.now()}`;
    setSaveError(null);
    setStreakWarning(null);
    setSaving(true);
    setLogs((prev) => [{ id: tempId, ...savedShape, pending: true }, ...prev]);
    setFormData(blankLog());
    setShowForm(false);

    try {
      const saved = await saveWorkoutLog(currentUser.uid, savedShape);
      setLogs((prev) =>
        prev.map((log) =>
          log.id === tempId ? { id: saved, ...savedShape, pending: false } : log,
        ),
      );
      if (savedShape.date === formatDate(getFitnessDateObject())) {
        try {
          await logWorkout(currentUser.uid, "workout");
        } catch {
          setStreakWarning("Workout saved, but the streak didn't update.");
        }
      }
    } catch {
      setLogs((prev) => prev.filter((log) => log.id !== tempId));
      setFormData(snapshot);
      setShowForm(true);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleStart(log) {
    if (sessionDraft) return;
    navigate("/workoutlog/session", { state: { fresh: true, log } });
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // The banner still closes. A leftover draft can be discarded again.
    }
    setSessionDraft(null);
    setConfirmDiscardDraft(false);
  }

  function handleCopy(log) {
    // rebuild sections to match current SECTIONS config
    // in case section slots have changed since the log was saved
    const sections = {};
    SECTIONS.forEach((s) => {
      const saved = Array.isArray(log.sections?.[s.key]) ? log.sections[s.key] : [];
      // pad or trim to current max
      const padded = Array.from({ length: s.max }, (_, i) =>
        fromSavedExercise(saved[i]),
      );
      sections[s.key] = padded;
    });

    setFormData({
      date: formatDate(getFitnessDateObject()), // today's date, not the old one
      category: WORKOUT_CATEGORIES.includes(log.category) ? log.category : "push",
      sections,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />
      <BetaDisclaimer />

      <h1 className="workout-welcome">
        {username || currentUser?.email}'s workout log
      </h1>

      <div className="workout-container">
        <div className="wl-choices">
          <section className="wl-choice">
            <h2>start session</h2>
            <p>
              Use this when you are about to train. Plan the exercises, hold time, and rest time for each set. Workout will log automatically when you finish.
            </p>
            {currentUser ? (
              <button
                type="button"
                className="log-workout"
                disabled={Boolean(sessionDraft)}
                onClick={() => navigate("/workoutlog/session", { state: { fresh: true } })}
              >
                start session
              </button>
            ) : (
              <Link to="/login" className="log-workout">
                sign in
              </Link>
            )}
          </section>
          <section className="wl-choice">
            <h2>new workout</h2>
            <p>
              Use this after you have already trained. Write down the exercises and
              the reps or holds you did.
            </p>
            {currentUser ? (
              <button
                type="button"
                className="log-workout"
                onClick={() => setShowForm((s) => !s)}
              >
                {showForm ? "cancel" : "+ new workout"}
              </button>
            ) : (
              <Link to="/login" className="log-workout">
                sign in
              </Link>
            )}
          </section>
        </div>
        <p className="workout-caption" style={{ fontWeight: "200" }}>
          Don't know how to structure your workout? Check out the{" "}
          <Link to="/training/beginnerworkout" className="log-caption-link">
            beginner workout guide
          </Link>{" "}
          or the{" "}
          <Link to="/training/intermediateworkout" className="log-caption-link">
            intermediate workout guide
          </Link>{" "}
          to learn how to craft a successful workout.
        </p>
      </div>

      {/* ── log form ── */}
      {showForm && (
        <div className="workout-container">
          <div className="wl-form">
            {/* date + category row */}
            <div className="wl-form-top">
              <div className="wl-field">
                <label className="wl-label">Date</label>
                <input
                  className="wl-input"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div className="wl-field">
                <label className="wl-label">Category</label>
                <select
                  className="category-selector"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, category: e.target.value }))
                  }
                >
                  <option value="push">push</option>
                  <option value="pull">pull</option>
                  <option value="legs">legs</option>
                  <option value="full-body">full body</option>
                  <option value="conditioning">conditioning</option>
                </select>
              </div>
            </div>

            {SECTIONS.map((s) => (
              <SectionBlock
                key={s.key}
                section={s}
                exercises={formData.sections[s.key]}
                onChange={updateExercise}
                onEffort={updateEffort}
              />
            ))}

            {saveError && <p className="wl-error">{saveError}</p>}

            <button
              className="log-workout"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "saving..." : "save workout"}
            </button>
          </div>
        </div>
      )}

      {currentUser && sessionDraft && (
        <div className="workout-container">
          <div className="wl-resume">
            {confirmDiscardDraft ? (
              <>
                <p>Discard the workout in progress?</p>
                <div className="wl-log-actions">
                  <button type="button" className="log-workout" onClick={discardDraft}>
                    discard
                  </button>
                  <button
                    type="button"
                    className="log-workout wl-start-session"
                    onClick={() => setConfirmDiscardDraft(false)}
                  >
                    keep it
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>You have a workout in progress.</p>
                <div className="wl-log-actions">
                  <button
                    type="button"
                    className="log-workout"
                    onClick={() => navigate("/workoutlog/session")}
                  >
                    resume
                  </button>
                  <button
                    type="button"
                    className="log-workout wl-start-session"
                    onClick={() => setConfirmDiscardDraft(true)}
                  >
                    discard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── past logs ── */}
      <div className="workout-container">
        <div className="wl-logs-header">past workouts</div>
        {streakWarning && <p className="wl-error">{streakWarning}</p>}
        {!currentUser ? (
          <p className="wl-empty">
            Sign in to save workouts and see them here.{" "}
            <Link to="/login" className="log-caption-link">
              Sign in
            </Link>
          </p>
        ) : logsLoading ? (
          <p className="wl-empty">loading...</p>
        ) : logsError ? (
          <p className="wl-error">
            {logsError}{" "}
            <button
              className="log-workout"
              onClick={() => setReloadLogs((count) => count + 1)}
            >
              retry
            </button>
          </p>
        ) : logs.length === 0 ? (
          <p className="wl-empty">
            No workouts logged yet. Hit <i> + new workout </i> to get started.
          </p>
        ) : (
          <div className="wl-log-list">
            {logs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                onCopy={handleCopy}
                onStart={handleStart}
                startDisabled={Boolean(sessionDraft)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── donate ── */}
      <div className="dashboard-donate">
        <div>
          Enjoying this platform? Support its development. Donate through{" "}
          <a
            href="https://ko-fi.com/wingssw"
            className="donate-link"
            target="_blank"
            rel="noopener"
          >
            Ko-fi
          </a>{" "}
          or{" "}
          <a
            href="https://www.paypal.com/donate/?hosted_button_id=RNREJQ826VL46"
            className="donate-link"
            target="_blank"
            rel="noopener"
          >
            Paypal
          </a>
          !!
        </div>
      </div>

      <Footer />
    </>
  );
}
