export const STAT_RANGES = [
  { id: "7d", label: "Last 7 days", kind: "days", amount: 7 },
  { id: "14d", label: "Last 2 weeks", kind: "days", amount: 14 },
  { id: "30d", label: "Last 30 days", kind: "days", amount: 30 },
  { id: "3m", label: "Last 3 months", kind: "months", amount: 3 },
  { id: "6m", label: "Last 6 months", kind: "months", amount: 6 },
  { id: "1y", label: "Last year", kind: "months", amount: 12 },
  { id: "all", label: "All", kind: "all" },
];

export const DEFAULT_STAT_RANGE = "30d";

export const MAX_STORED_SETS = 40;

export const LOG_FILTERS = [
  { id: "all", label: "All" },
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "full-body", label: "Full-body" },
  { id: "conditioning", label: "Conditioning" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SECTION_ORDER = ["warmup", "primary", "secondary", "volume"];

export function statRangeById(id) {
  return STAT_RANGES.find((range) => range.id === id) || STAT_RANGES[2];
}

export function formatDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function rangeBounds(today, range) {
  if (!range || range.kind === "all") return null;
  const end = stripTime(today);
  const start = stripTime(today);
  if (range.kind === "days") {
    start.setDate(start.getDate() - (range.amount - 1));
  } else {
    start.setMonth(start.getMonth() - range.amount);
  }
  return { start: formatDay(start), end: formatDay(end) };
}

export function monthBounds(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { start: formatDay(start), end: formatDay(end) };
}

export function yearBounds(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function monthLabel(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function historySkeleton(today, earliestDate) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const months = [];
  for (let index = month - 1; index >= 0; index -= 1) {
    months.push({
      kind: "month",
      year,
      month: index,
      key: `${year}-${String(index + 1).padStart(2, "0")}`,
      label: `${MONTHS[index]} ${year}`,
    });
  }

  let startYear = year - 1;
  if (earliestDate instanceof Date && !Number.isNaN(earliestDate.getTime())) {
    startYear = Math.min(startYear, earliestDate.getFullYear());
  }
  const floor = Math.max(startYear, year - 8);
  const years = [];
  for (let past = year - 1; past >= floor; past -= 1) {
    years.push({ kind: "year", year: past, key: String(past), label: String(past) });
  }
  return { months, years };
}

export function groupArchiveLogs(logs, today) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const thisMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const grouped = {};
  for (const log of Array.isArray(logs) ? logs : []) {
    const date = String(log?.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const monthKey = date.slice(0, 7);
    if (monthKey === thisMonthKey) continue;
    const logYear = Number(date.slice(0, 4));
    const key = logYear === year ? monthKey : String(logYear);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  }
  const archive = {};
  for (const [key, rows] of Object.entries(grouped)) {
    archive[key] = { status: "ready", logs: rows };
  }
  return archive;
}

export function historyPlaceholders(skeleton, archive) {
  const entries = [...(skeleton?.months || []), ...(skeleton?.years || [])];
  return entries.filter((entry) => {
    const cached = archive?.[entry.key];
    if (!cached) return false;
    if (cached.status === "error" || cached.status === "loading") return true;
    return Array.isArray(cached.logs) && cached.logs.length > 0;
  });
}

export function countLoggedSets(sections) {
  if (!sections || typeof sections !== "object") return 0;
  let total = 0;
  for (const rows of Object.values(sections)) {
    if (!Array.isArray(rows)) continue;
    for (const exercise of rows) {
      const name = String(exercise?.name ?? "").trim();
      if (!name) continue;
      const parsed = Number(exercise.sets);
      if (Number.isInteger(parsed) && parsed > 0) {
        total += parsed;
      } else if (Array.isArray(exercise.efforts)) {
        total += exercise.efforts.filter((value) => String(value ?? "").trim() !== "").length;
      }
    }
  }
  return total;
}

export function summarizeLogs(logs) {
  const list = Array.isArray(logs) ? logs : [];
  let sets = 0;
  let duration = 0;
  let timed = 0;
  for (const log of list) {
    const explicit = Number(log?.setCount);
    sets += Number.isInteger(explicit) && explicit >= 0
      ? explicit
      : countLoggedSets(log?.sections);
    if (
      typeof log?.durationSec === "number" &&
      Number.isFinite(log.durationSec) &&
      log.durationSec >= 0
    ) {
      duration += log.durationSec;
      timed += 1;
    }
  }
  return {
    workouts: list.length,
    sets,
    durationSec: list.length > 0 && timed === list.length ? duration : null,
  };
}

export function formatTrainedTime(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return "—";
  const minutes = Math.max(0, Math.round(Number(seconds) / 60));
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain}m`;
  return `${hours}h ${remain}m`;
}

export function workoutDateCreditsStreak(workoutDate, today) {
  return typeof workoutDate === "string" && workoutDate.length > 0 && workoutDate === today;
}

function effortText(exercise) {
  const efforts = Array.isArray(exercise?.efforts)
    ? exercise.efforts.map((value) => String(value).trim()).filter(Boolean)
    : [];
  if (efforts.length > 0) {
    const unit = exercise.measure === "hold" ? "s" : "";
    const sets = Number(exercise.sets) || efforts.length;
    const same = efforts.every((value) => value === efforts[0]);
    const value = same ? `${efforts[0]}${unit}` : efforts.map((item) => `${item}${unit}`).join(", ");
    return `${sets} × ${value}`;
  }
  if (exercise?.sets && exercise?.reps) return `${exercise.sets} × ${exercise.reps}`;
  if (exercise?.sets) return `${exercise.sets} sets`;
  return "";
}

export function logExerciseRows(log, limit = 8) {
  const rows = [];
  for (const key of SECTION_ORDER) {
    const section = log?.sections?.[key];
    if (!Array.isArray(section)) continue;
    for (const exercise of section) {
      const name = String(exercise?.name ?? "").trim();
      if (!name) continue;
      rows.push({ name, detail: effortText(exercise) });
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}

export function logSummary(log) {
  const parts = [];
  let sets = 0;
  let exercises = 0;
  for (const key of SECTION_ORDER) {
    const rows = log?.sections?.[key];
    if (!Array.isArray(rows)) continue;
    for (const exercise of rows) {
      const name = String(exercise?.name ?? "").trim();
      if (!name) continue;
      exercises += 1;
      const parsed = Number(exercise.sets);
      if (Number.isInteger(parsed) && parsed > 0) sets += parsed;
      else if (Array.isArray(exercise.efforts)) {
        sets += exercise.efforts.filter((value) => String(value ?? "").trim() !== "").length;
      }
      const detail = effortText(exercise);
      parts.push(detail ? `${name} ${detail}` : name);
    }
  }
  return { line: parts.join(" · "), sets, exercises };
}

export function logMatches(log, filter, query) {
  if (filter && filter !== "all" && log?.category !== filter) return false;
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  if (String(log?.category || "").toLowerCase().includes(needle)) return true;
  if (String(log?.date || "").includes(needle)) return true;
  for (const rows of Object.values(log?.sections || {})) {
    if (!Array.isArray(rows)) continue;
    for (const exercise of rows) {
      if (String(exercise?.name ?? "").toLowerCase().includes(needle)) return true;
    }
  }
  return false;
}

export function formatLogDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ""))) return key || "";
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLogDateCompact(key) {
  return formatLogDate(key).replace(/,/g, "");
}

export function formatWorkoutDurationLabel(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return null;
  const minutes = Math.max(0, Math.round(Number(seconds) / 60));
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain} min`;
  return `${hours}h ${remain} min`;
}
