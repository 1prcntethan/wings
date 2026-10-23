import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CreatableSelect from "react-select/creatable";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import BetaDisclaimer from "../components/betadisclaimer";
import "./workoutlog.css";
import { useAuth } from "../config/auth-context.jsx";
import { skillTitle } from "../utilites/skilltitles.js";
import {
  formatDate,
  getFitnessDateObject,
  getWorkoutLogs,
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
  return { name: "", sets: "", reps: "", holdTime: "", notes: "" };
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
    for (const exercise of formData.sections?.[section.key] ?? []) {
      const name = (exercise.name ?? "").trim();
      const sets = exercise.sets ?? "";
      const reps = exercise.reps ?? "";
      const notes = exercise.notes ?? "";
      const empty = name === "" && sets === "" && reps === "" && notes === "";
      if (empty) continue;
      if (!name) return "Every filled row needs an exercise name.";
      if (name.length > 80) return "Exercise names need to be 80 characters or less.";
      if (sets !== "") {
        const setCount = Number(sets);
        if (!Number.isInteger(setCount) || setCount < 1 || setCount > 99) {
          return "Sets need to be a whole number from 1 to 99.";
        }
      }
      if (String(reps).length > 20) {
        return "Reps or hold time need to be 20 characters or less.";
      }
      if (String(notes).length > 200) {
        return "Notes need to be 200 characters or less.";
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

function ExerciseRow({ exercise, onChange }) {
  const name = exercise.name ?? "";
  return (
    <div className="wl-exercise-row">
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
          styles={skillSelectStyles}
        />
      </div>
      <input
        className="wl-input wl-input--small"
        placeholder="sets"
        type="number"
        min="1"
        value={exercise.sets}
        onChange={(e) => onChange("sets", e.target.value)}
      />
      <input
        className="wl-input wl-input--hold"
        placeholder="reps / hold (s)"
        value={exercise.reps}
        onChange={(e) => onChange("reps", e.target.value)}
      />
      <input
        className="wl-input wl-input--notes"
        placeholder="notes (optional)"
        value={exercise.notes}
        onChange={(e) => onChange("notes", e.target.value)}
      />
    </div>
  );
}

function SectionBlock({ section, exercises, onChange, isHold }) {
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
          isHold={isHold}
          onChange={(field, val) => onChange(section.key, i, field, val)}
        />
      ))}
    </div>
  );
}

function LogCard({ log, onCopy }) {
  const [open, setOpen] = useState(false);

  const hasExercises = (sectionKey) =>
    log.sections?.[sectionKey]?.some((e) => (e.name ?? "").trim() !== "");

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
            className="wl-copy-btn"
            disabled={log.pending}
            onClick={(e) => {
              e.stopPropagation();
              onCopy(log);
            }}
          >
            {log.pending ? "saving" : "copy"}
          </button>
          <span className="wl-card-toggle">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className="wl-card-body">
          {SECTIONS.map((s) =>
            hasExercises(s.key) ? (
              <div key={s.key} className="wl-card-section">
                <div className="wl-card-section-title">{s.label}</div>
                {log.sections[s.key]
                  .filter((e) => (e.name ?? "").trim() !== "")
                  .map((e, i) => (
                    <div key={i} className="wl-card-exercise">
                      <span className="wl-card-ex-name">{e.name}</span>
                      <span className="wl-card-ex-detail">
                        {e.sets && `${e.sets} sets`}
                        {e.reps && ` × ${e.reps}`}
                        {e.notes && ` — ${e.notes}`}
                      </span>
                    </div>
                  ))}
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

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);
  const [reloadLogs, setReloadLogs] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(blankLog());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // primary section uses hold time if category is push (isometric heavy)
  // you can refine this logic — for now primary is always "hold eligible"
  const primaryIsHold = true;

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
        if (!cancelled) setLogs(rows);
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

  // ── field updater ────────────────────────────────────────────────────────────
  function updateExercise(sectionKey, index, field, value) {
    setFormData((prev) => {
      const updatedSection = prev.sections[sectionKey].map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex,
      );
      return {
        ...prev,
        sections: { ...prev.sections, [sectionKey]: updatedSection },
      };
    });
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
    const tempId = `pending-${Date.now()}`;
    setSaveError(null);
    setSaving(true);
    setLogs((prev) => [{ id: tempId, ...snapshot, pending: true }, ...prev]);
    setFormData(blankLog());
    setShowForm(false);

    try {
      const saved = await saveWorkoutLog(currentUser.uid, snapshot);
      setLogs((prev) =>
        prev.map((log) =>
          log.id === tempId ? { id: saved, ...snapshot, pending: false } : log,
        ),
      );
    } catch {
      setLogs((prev) => prev.filter((log) => log.id !== tempId));
      setFormData(snapshot);
      setShowForm(true);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy(log) {
    // rebuild sections to match current SECTIONS config
    // in case section slots have changed since the log was saved
    const sections = {};
    SECTIONS.forEach((s) => {
      const saved = log.sections?.[s.key] ?? [];
      // pad or trim to current max
      const padded = Array.from(
        { length: s.max },
        (_, i) => saved[i] ?? blankExercise(),
      );
      sections[s.key] = padded;
    });

    setFormData({
      date: formatDate(getFitnessDateObject()), // today's date, not the old one
      category: log.category,
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

      <div className="workout-welcome">
        welcome to the wings workout log,
        {"  "}
        <div className="workout-welcome__email">{currentUser?.email}</div>
      </div>

      {/* ── new log button ── */}
      <div className="workout-container">
        <div
          className="workout-display"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <p style={{ margin: 0, fontFamily: "Fira Sans", fontWeight: "200" }}>
            Log a new workout session with structured exercise tracking.
          </p>
          <button
            className="log-workout"
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm ? "cancel" : "+ new workout"}
          </button>
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

            {/* column headers */}
            <div className="wl-exercise-row wl-exercise-row--header">
              <span className="wl-col--name">exercise</span>
              <span className="wl-col--small">sets</span>
              <span className="wl-col--hold">reps / hold (s)</span>
              <span className="wl-col--notes">notes</span>
            </div>

            {/* sections */}
            {SECTIONS.map((s) => (
              <SectionBlock
                key={s.key}
                section={s}
                exercises={formData.sections[s.key]}
                onChange={updateExercise}
                // only primary skill uses hold time toggle; others use reps
                isHold={s.key === "primary" && primaryIsHold}
              />
            ))}

            {saveError && <p className="wl-error">{saveError}</p>}

            <button
              className="log-workout"
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: "1rem" }}
            >
              {saving ? "saving..." : "save workout"}
            </button>
          </div>
        </div>
      )}

      {/* ── past logs ── */}
      <div className="workout-container">
        <div className="wl-logs-header">past workouts</div>
        {logsLoading ? (
          <p style={{ padding: "1rem" }}>loading...</p>
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
          <p
            style={{
              padding: "1rem",
              opacity: 0.8,
              fontFamily: "Fira Sans",
              fontWeight: "200",
            }}
          >
            No workouts logged yet. Hit <i> + new workout </i> to get started.
          </p>
        ) : (
          <div className="wl-log-list">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} onCopy={handleCopy} />
            ))}
          </div>
        )}
      </div>

      {/* ── donate ── */}
      <div className="dashboard-donate">
        <div>
          Enjoying this platform? Support its development. Donate through{" "}
          <Link to="https://ko-fi.com/wingssw" className="donate-link">
            Ko-fi
          </Link>{" "}
          or{" "}
          <Link
            to="https://www.paypal.com/donate/?hosted_button_id=RNREJQ826VL46"
            className="donate-link"
          >
            Paypal
          </Link>
          !!
        </div>
      </div>

      <Footer />
    </>
  );
}
