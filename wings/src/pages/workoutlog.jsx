import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CreatableSelect from "react-select/creatable";
import Navbar from "../components/navbar";
import "./workoutlog.css";
import { loadDesignPreview } from "../utilites/designpreview.js";
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
import WorkoutHistory from "../components/workoutloghistory.jsx";
import {
  creditWorkoutStreak,
  deleteWorkoutLog,
  formatDate,
  getFitnessDateObject,
  getOlderWorkoutPage,
  getWorkoutLogsByDate,
  getWorkoutStats,
  saveWorkoutLog,
  updateWorkoutLog,
} from "../config/firestore.js";
import {
  DEFAULT_STAT_RANGE,
  formatTrainedTime,
  groupArchiveLogs,
  historyPlaceholders,
  monthBounds,
  monthLabel,
  rangeBounds,
  statRangeById,
  summarizeLogs,
} from "../utilites/workoutstats.js";

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

export function WorkoutLog() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);
  const archiveCursor = useRef(null);
  const changedLogs = useRef(new Set());
  const savingLock = useRef(false);
  const previewRef = useRef(null);
  const [sessionDraft, setSessionDraft] = useState(null);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(blankLog());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [streakWarning, setStreakWarning] = useState(null);
  const [rangeId, setRangeId] = useState(DEFAULT_STAT_RANGE);
  const [stats, setStats] = useState(null);
  const [statsStatus, setStatsStatus] = useState("loading");
  const [statsError, setStatsError] = useState(null);
  const [statsRetry, setStatsRetry] = useState(0);
  const [currentLogs, setCurrentLogs] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("loading");
  const [currentError, setCurrentError] = useState(null);
  const [currentRetry, setCurrentRetry] = useState(0);
  const [olderLogs, setOlderLogs] = useState([]);
  const [archiveStatus, setArchiveStatus] = useState("loading");
  const [archiveRequest, setArchiveRequest] = useState(0);
  const today = getFitnessDateObject();
  const monthStart = monthBounds(today.getFullYear(), today.getMonth()).start;
  const [canLoadArchive, setCanLoadArchive] = useState(false);
  const [openKeys, setOpenKeys] = useState({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (typeof location.state?.streakWarning === "string") {
      setStreakWarning(location.state.streakWarning);
    }
  }, [location.state]);

  useEffect(() => {
    try {
      setSessionDraft(parseDraft(localStorage.getItem(DRAFT_KEY)));
    } catch {
      setSessionDraft(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStatsStatus("loading");
      setStatsError(null);
      const preview = previewRef.current || (await loadDesignPreview());
      if (cancelled) return;
      if (preview) {
        previewRef.current = preview;
        const today = getFitnessDateObject();
        const range = statRangeById(rangeId);
        if (range.kind === "all") {
          setStats(preview.previewAllTime);
        } else {
          const bounds = rangeBounds(today, range);
          const logs = preview.previewWorkoutLogs(today).filter(
            (log) => log.date >= bounds.start && log.date <= bounds.end,
          );
          setStats({ ...summarizeLogs(logs), partialSets: false });
        }
        setStatsStatus("ready");
        return;
      }
      if (!currentUser) {
        setStats(null);
        setStatsStatus("ready");
        return;
      }
      try {
        const next = await getWorkoutStats(currentUser.uid, statRangeById(rangeId));
        if (!cancelled) {
          setStats(next);
          setStatsStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatsError("Couldn't load those stats.");
          setStatsStatus("error");
        }
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [currentUser, rangeId, statsRetry]);

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      setCurrentStatus("loading");
      setCurrentError(null);
      const preview = previewRef.current || (await loadDesignPreview());
      if (cancelled) return;
      if (preview) {
        previewRef.current = preview;
        const today = getFitnessDateObject();
        const bounds = monthBounds(today.getFullYear(), today.getMonth());
        setCurrentLogs(
          preview.previewWorkoutLogs(today).filter(
            (log) => log.date >= bounds.start && log.date <= bounds.end,
          ),
        );
        setCanLoadArchive(true);
        setCurrentStatus("ready");
        return;
      }
      if (!currentUser) {
        setCurrentLogs([]);
        setCanLoadArchive(true);
        setCurrentStatus("ready");
        return;
      }
      const today = getFitnessDateObject();
      const bounds = monthBounds(today.getFullYear(), today.getMonth());
      try {
        const rows = await getWorkoutLogsByDate(currentUser.uid, bounds.start, bounds.end);
        if (!cancelled) {
          const rowsFromServer = rows.filter((row) => !changedLogs.current.has(row.id));
          setCurrentLogs((logs) => [
            ...logs.filter((log) => log.pending || changedLogs.current.has(log.id)),
            ...rowsFromServer.map(normalizeWorkoutLog),
          ]);
          setCanLoadArchive(true);
          setCurrentStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setCurrentError("Couldn't load this month.");
          setCanLoadArchive(true);
          setCurrentStatus("error");
        }
      }
    }

    loadMonth();
    return () => {
      cancelled = true;
    };
  }, [currentUser, currentRetry]);

  useEffect(() => {
    if (!canLoadArchive) return;
    let cancelled = false;

    async function loadArchive() {
      try {
        const preview = previewRef.current || (await loadDesignPreview());
        if (cancelled) return;
        if (preview) {
          const rows = preview.previewWorkoutLogs(getFitnessDateObject());
          setOlderLogs(rows.filter((log) => log.date < monthStart));
          setArchiveStatus("done");
          return;
        }
        if (!currentUser) {
          setArchiveStatus("done");
          return;
        }
        const { logs, nextCursor } = await getOlderWorkoutPage(
          currentUser.uid, monthStart, archiveCursor.current,
        );
        if (cancelled) return;
        const rows = logs.filter((log) => !changedLogs.current.has(log.id)).map(normalizeWorkoutLog);
        setOlderLogs((prev) => {
          const loadedIds = new Set(prev.map((log) => log.id));
          return [...prev, ...rows.filter((log) => !loadedIds.has(log.id))];
        });
        archiveCursor.current = nextCursor;
        setArchiveStatus(nextCursor ? "ready" : "done");
      } catch {
        if (!cancelled) setArchiveStatus("error");
      }
    }

    loadArchive();
    return () => {
      cancelled = true;
    };
  }, [currentUser, monthStart, canLoadArchive, archiveRequest]);

  function loadMoreHistory() {
    if (archiveStatus === "loading") return;
    setArchiveStatus("loading");
    setArchiveRequest((count) => count + 1);
  }

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
        const efforts = Array.isArray(ex.efforts) ? [...ex.efforts] : [];
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

  function forgetLog(logId) {
    setCurrentLogs((logs) => logs.filter((log) => log.id !== logId));
    setOlderLogs((logs) => logs.filter((log) => log.id !== logId));
  }

  function rememberLog(log) {
    if (log.date >= monthStart) {
      setCurrentLogs((logs) => [log, ...logs.filter((row) => row.id !== log.id)]);
    } else {
      setOlderLogs((logs) => [log, ...logs.filter((row) => row.id !== log.id)]);
    }
  }

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
    if (savingLock.current || deleting) return;
    savingLock.current = true;

    const snapshot = formData;
    const savedShape = sanitizeWorkout(formData);
    const tempId = `pending-${Date.now()}`;
    setSaveError(null);
    setStreakWarning(null);
    setSaving(true);
    if (editingLog) {
      try {
        await updateWorkoutLog(currentUser.uid, editingLog.id, savedShape);
        changedLogs.current.add(editingLog.id);
        forgetLog(editingLog.id);
        rememberLog({ ...editingLog, ...savedShape });
        setEditingLog(null);
        setShowForm(false);
        setStatsRetry((count) => count + 1);
      } catch {
        setSaveError("Failed to save changes. Please try again.");
      } finally {
        savingLock.current = false;
        setSaving(false);
      }
      return;
    }

    forgetLog(tempId);
    rememberLog({ id: tempId, ...savedShape, pending: true });
    setFormData(blankLog());
    setShowForm(false);

    try {
      const savedId = await saveWorkoutLog(currentUser.uid, savedShape);
      changedLogs.current.add(savedId);
      forgetLog(tempId);
      rememberLog({ id: savedId, ...savedShape, pending: false });
      try {
        await creditWorkoutStreak(currentUser.uid, savedShape.date);
      } catch {
        setStreakWarning("Workout saved, but the streak didn't update.");
      }
      setStatsRetry((count) => count + 1);
    } catch {
      forgetLog(tempId);
      setFormData(snapshot);
      setShowForm(true);
      setSaveError("Failed to save. Please try again.");
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  function handleStartFresh() {
    if (sessionDraft) {
      navigate("/workoutlog/session");
      return;
    }
    navigate("/workoutlog/session", { state: { fresh: true } });
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

  function openWorkoutForm(log = null, edit = false) {
    if (savingLock.current) return;
    const sections = {};
    SECTIONS.forEach((section) => {
      const saved = log?.sections?.[section.key] ?? [];
      sections[section.key] = Array.from({ length: section.max }, (_, index) =>
        fromSavedExercise(saved[index]),
      );
    });
    setSaveError(null);
    setEditingLog(edit ? log : null);
    setFormData({
      date: edit ? log.date : formatDate(getFitnessDateObject()),
      category: WORKOUT_CATEGORIES.includes(log?.category) ? log.category : "push",
      sections,
    });
    setShowForm(true);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function toggleArchive(entry) {
    setOpenKeys((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }));
  }

  async function confirmDelete(log) {
    if (!currentUser || deleting || savingLock.current) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWorkoutLog(currentUser.uid, log.id);
      changedLogs.current.add(log.id);
      forgetLog(log.id);
      if (editingLog?.id === log.id) {
        setEditingLog(null);
        setShowForm(false);
      }
      setPendingDelete(null);
      setStatsRetry((count) => count + 1);
    } catch {
      setDeleteError("Couldn't delete that workout. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  const byNewestDate = (a, b) => b.date.localeCompare(a.date);
  const archive = groupArchiveLogs([...olderLogs].sort(byNewestDate), today);
  const placeholders = historyPlaceholders(archive);

  return (
    <>
      <Navbar />
      <main className="wh-page" data-screen="log" data-ready={currentStatus}>
        <WorkoutHistory
          rangeId={rangeId}
          onRange={setRangeId}
          stats={stats}
          statsStatus={statsStatus}
          statsError={statsError}
          onRetryStats={() => setStatsRetry((count) => count + 1)}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen((open) => !open)}
          monthTitle={monthLabel(today)}
          currentLogs={[...currentLogs].sort(byNewestDate)}
          currentStatus={currentStatus}
          currentError={currentError}
          onRetryCurrent={() => setCurrentRetry((count) => count + 1)}
          placeholders={placeholders}
          archive={archive}
          archiveStatus={canLoadArchive ? archiveStatus : null}
          onLoadOlder={loadMoreHistory}
          openKeys={openKeys}
          onToggle={toggleArchive}
          onCopy={(log) => openWorkoutForm(log)}
          onEdit={(log) => openWorkoutForm(log, true)}
          onDelete={(log) => {
            setDeleteError(null);
            setPendingDelete(log.id);
          }}
          pendingDelete={pendingDelete}
          onConfirmDelete={confirmDelete}
          onCancelDelete={() => setPendingDelete(null)}
          deleting={deleting}
          deleteError={deleteError}
          onStartSession={handleStartFresh}
          onLogWorkout={() => openWorkoutForm()}
        />

        {showForm && (
          <div className="workout-container" ref={formRef}>
            <div className="wl-form">
              {editingLog && <h2>Edit workout</h2>}
              {editingLog?.durationSec != null && (
                <p className="wl-label">Duration: {formatTrainedTime(editingLog.durationSec)}</p>
              )}
              <div className="wl-form-top">
                <div className="wl-field">
                  <label className="wl-label">Date</label>
                  <input
                    className="wl-input"
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, date: event.target.value }))
                    }
                  />
                </div>
                <div className="wl-field">
                  <label className="wl-label">Category</label>
                  <select
                    className="category-selector"
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, category: event.target.value }))
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

              {SECTIONS.map((section) => (
                <SectionBlock
                  key={section.key}
                  section={section}
                  exercises={formData.sections[section.key]}
                  onChange={updateExercise}
                  onEffort={updateEffort}
                />
              ))}

              {saveError && <p className="wl-error">{saveError}</p>}
              <button className="log-workout" onClick={handleSave} disabled={saving} type="button">
                {saving ? "saving..." : editingLog ? "save changes" : "save workout"}
              </button>
              <button
                className="log-workout"
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditingLog(null);
                  setShowForm(false);
                }}
              >
                cancel
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
                    <button type="button" className="log-workout" onClick={handleStartFresh}>
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

        {streakWarning && <p className="wl-error">{streakWarning}</p>}
      </main>
    </>
  );
}
