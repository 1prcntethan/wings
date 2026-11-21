import { useState } from "react";
import { shareWorkoutCard } from "../utilites/progresscard.js";
import {
  LOG_FILTERS,
  STAT_RANGES,
  formatLogDate,
  formatTrainedTime,
  logExerciseRows,
  logMatches,
  logSummary,
} from "../utilites/workoutstats.js";
import "./workoutloghistory.css";

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16.5 20 20.5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V5" />
      <path d="M8 8.5 12 4.5l4 4" />
      <path d="M6 13.5V19h12v-5.5" />
    </svg>
  );
}

function rangeChipLabel(id) {
  if (id === "14d") return "2w";
  if (id === "all") return "All";
  return id;
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

function LogCard({ log, onCopy, onDelete, pendingDelete, onConfirmDelete, onCancelDelete, deleting }) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const summary = logSummary(log);
  const exercises = logExerciseRows(log);
  const confirming = pendingDelete === log.id;

  return (
    <article className="wh-card">
      <div className="wh-card-top">
        <span className={`wh-cat wh-cat--${log.category}`}>{log.category || "workout"}</span>
        <span className="wh-date">{formatLogDate(log.date)}</span>
        {typeof log.durationSec === "number" && (
          <span className="wh-duration">{formatTrainedTime(log.durationSec)}</span>
        )}
      </div>
      {exercises.length > 0 ? (
        <ul className="wh-ex-list">
          {exercises.map((row, index) => (
            <li key={`${row.name}-${index}`} className="wh-ex-row">
              <span className="wh-ex-name">{row.name}</span>
              <span className="wh-ex-detail">{row.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="wh-ex-fallback">{summary.line || "Saved workout"}</p>
      )}
      <div className="wh-card-foot">
        <span>{summary.exercises} exercises · {summary.sets} sets</span>
        {confirming ? (
          <span className="wh-confirm">
            Delete this workout?
            <button type="button" onClick={() => onConfirmDelete(log)} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button type="button" onClick={onCancelDelete} disabled={deleting}>
              Keep
            </button>
          </span>
        ) : (
          <span className="wh-icon-row">
            <button type="button" aria-label="Copy workout" disabled={log.pending} onClick={() => onCopy(log)}>
              <IconCopy />
            </button>
            <button
              type="button"
              aria-label="Share workout"
              disabled={sharing || log.pending}
              onClick={async () => {
                if (sharing) return;
                setSharing(true);
                setShareError(null);
                try {
                  await shareWorkoutCard(log);
                } catch (error) {
                  if (error?.name !== "AbortError") setShareError("Couldn't make that image. Try again.");
                } finally {
                  setSharing(false);
                }
              }}
            >
              <IconShare />
            </button>
            <button
              type="button"
              className="wh-danger"
              aria-label="Delete workout"
              disabled={log.pending}
              onClick={() => onDelete(log)}
            >
              <IconTrash />
            </button>
          </span>
        )}
      </div>
      {shareError && <p className="wh-error">{shareError}</p>}
    </article>
  );
}

function LogList({ logs, filter, query, ...cardProps }) {
  if (!logs.length) return null;
  const visible = logs.filter((log) => logMatches(log, filter, query));
  if (visible.length === 0) {
    return <p className="wh-empty">No workouts match this filter.</p>;
  }
  return visible.map((log) => <LogCard key={log.id} log={log} {...cardProps} />);
}

export default function WorkoutHistory({
  rangeId,
  onRange,
  stats,
  statsStatus,
  statsError,
  onRetryStats,
  filter,
  onFilter,
  query,
  onQuery,
  searchOpen,
  onToggleSearch,
  monthTitle,
  currentLogs,
  currentStatus,
  currentError,
  onRetryCurrent,
  placeholders,
  archive,
  archiveError,
  onRetryArchive,
  openKeys,
  onToggle,
  onCopy,
  onDelete,
  pendingDelete,
  onConfirmDelete,
  onCancelDelete,
  deleting,
  deleteError,
  onStartSession,
  onLogWorkout,
}) {
  const cardProps = { onCopy, onDelete, pendingDelete, onConfirmDelete, onCancelDelete, deleting };

  return (
    <div className="wh-history">
      <div className="wh-tools">
        <h1>Workout log</h1>
        <button
          type="button"
          className="wh-search-btn"
          aria-label="Search workouts"
          aria-pressed={searchOpen}
          onClick={onToggleSearch}
        >
          <IconSearch />
        </button>
      </div>
      {searchOpen && (
        <input
          className="wh-search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search loaded workouts"
        />
      )}
      <div className="wh-filters wh-ranges" role="group" aria-label="Range">
        {STAT_RANGES.map((range) => (
          <button
            key={range.id}
            type="button"
            aria-pressed={rangeId === range.id}
            onClick={() => onRange(range.id)}
          >
            {rangeChipLabel(range.id)}
          </button>
        ))}
      </div>
      {statsStatus === "error" ? (
        <p className="wh-error">
          {statsError}{" "}
          <button type="button" onClick={onRetryStats}>retry</button>
        </p>
      ) : (
        <div className="wh-stats" aria-busy={statsStatus === "loading"}>
          <p><b>{stats ? stats.workouts : "…"}</b><span>workouts</span></p>
          <p>
            <b title="Duration is not stored on workout logs.">
              {stats ? formatTrainedTime(stats.durationSec) : "…"}
            </b>
            <span>time trained</span>
          </p>
          <p><b>{stats ? stats.sets : "…"}</b><span>total sets</span></p>
        </div>
      )}
      {stats?.partialSets && (
        <p className="wh-note">
          All-time sets include workouts saved with a set total. Older logs still count as workouts.
        </p>
      )}
      <div className="wh-filters wh-cat-filters" role="group" aria-label="Category">
        {LOG_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => onFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {query.trim() && (
        <p className="wh-note">Search checks workouts that are already loaded.</p>
      )}
      <h2>{monthTitle}</h2>
      {currentStatus === "loading" && <p className="wh-empty">Loading this month...</p>}
      {currentStatus === "error" && (
        <p className="wh-error">
          {currentError}{" "}
          <button type="button" onClick={onRetryCurrent}>retry</button>
        </p>
      )}
      {currentStatus === "ready" && currentLogs.length === 0 && (
        <p className="wh-empty">No workouts this month.</p>
      )}
      {currentStatus === "ready" && currentLogs.length > 0 && (
        <LogList logs={currentLogs} filter={filter} query={query} {...cardProps} />
      )}
      {deleteError && <p className="wh-error">{deleteError}</p>}
      {archiveError && (
        <p className="wh-error">
          {archiveError}{" "}
          <button type="button" onClick={onRetryArchive}>retry</button>
        </p>
      )}
      {placeholders.map((entry) => {
        const open = Boolean(openKeys[entry.key]);
        const cached = archive[entry.key];
        return (
          <section key={entry.key} className="wh-fold-wrap">
            <button
              type="button"
              className="wh-fold"
              aria-expanded={open}
              onClick={() => onToggle(entry)}
            >
              <span>{entry.label}</span>
              <span>{open ? "Hide" : "Show"}</span>
            </button>
            {open && (
              <div className="wh-fold-panel">
                {cached?.status === "loading" && <p className="wh-empty">Loading...</p>}
                {cached?.status === "error" && (
                  <p className="wh-error">
                    Couldn't load these workouts.{" "}
                    <button type="button" onClick={() => onToggle(entry, true)}>retry</button>
                  </p>
                )}
                {cached?.status === "ready" && cached.logs.length === 0 && (
                  <p className="wh-empty">No workouts then.</p>
                )}
                {cached?.status === "ready" && cached.logs.length > 0 && (
                  <LogList logs={cached.logs} filter={filter} query={query} {...cardProps} />
                )}
              </div>
            )}
          </section>
        );
      })}
      <div className="wh-actions">
        <button type="button" className="wh-ghost" onClick={onLogWorkout}>+ Log workout</button>
        <button type="button" className="wh-go" onClick={onStartSession}>start session</button>
      </div>
    </div>
  );
}
