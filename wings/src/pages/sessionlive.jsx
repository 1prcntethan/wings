import { useState } from "react";
import {
  SECTION_LABELS,
  durationMs,
  effortError,
  formatClock,
  remainingMs,
  restSeconds,
} from "../utilites/livesession.js";

function stepEntry(measure, entry, direction) {
  const current = Number(entry);
  const base = Number.isFinite(current) && entry !== "" ? current : 0;
  if (measure === "hold") {
    const next = Math.round((base + direction) * 10) / 10;
    const clamped = Math.min(600, Math.max(0.1, next));
    return String(clamped);
  }
  const next = Math.round(base + direction);
  return String(Math.min(999, Math.max(1, next || 1)));
}

export function SessionLive({ session, dispatch, now, onSave, saving, saveError, onDiscard }) {
  const [entry, setEntry] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (session.phase === "summary") {
    const done = session.exercises.filter((exercise) => exercise.efforts.length > 0);
    return (
      <div className="ls-live ls-live--done">
        <h1 className="ls-display">workout done</h1>
        <p className="ls-duration">{formatClock(durationMs(session, now))}</p>
        {done.length === 0 ? (
          <p className="ls-empty">Nothing was completed, so there is nothing to save.</p>
        ) : (
          <ul className="ls-summary">
            {done.map((exercise) => (
              <li key={exercise.id}>
                <div className="ls-sum-top">
                  <strong>{exercise.name}</strong>
                  <span>{SECTION_LABELS[exercise.section]}</span>
                </div>
                <p className="ls-efforts">
                  {(Array.isArray(exercise.efforts) ? exercise.efforts : []).join("  ·  ")}
                  {exercise.measure === "hold" ? "s" : ""}
                  {restSeconds(exercise.restSec) != null
                    ? ` · rest ${formatClock(restSeconds(exercise.restSec) * 1000)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {saveError && <p className="ls-error">{saveError}</p>}
        <div className="ls-actions">
          {done.length > 0 && (
            <button type="button" className="ls-primary" disabled={saving} onClick={onSave}>
              {saving ? "saving..." : "save workout"}
            </button>
          )}
          {confirmDiscard ? (
            <Confirm
              message="Discard this session? Completed sets will not be saved."
              yes="discard"
              no="keep it"
              disabled={saving}
              onYes={onDiscard}
              onNo={() => setConfirmDiscard(false)}
            />
          ) : (
            <button type="button" className="ls-ghost" disabled={saving} onClick={() => setConfirmDiscard(true)}>
              discard
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!session.cursor || !session.exercises[session.cursor.exerciseIndex]) {
    return (
      <div className="ls-live">
        <p className="ls-empty">This session couldn't be restored.</p>
        <button type="button" className="ls-primary" onClick={onDiscard}>
          discard
        </button>
      </div>
    );
  }

  const exercise = session.exercises[session.cursor.exerciseIndex];
  const setNumber = exercise.efforts.length + 1;
  const invalid = Boolean(effortError(exercise.measure, entry));
  const nextExercise =
    exercise.efforts.length < exercise.sets
      ? exercise
      : session.exercises[session.cursor.exerciseIndex + 1];
  const nextSet =
    exercise.efforts.length < exercise.sets ? exercise.efforts.length + 1 : 1;

  if (session.phase === "resting") {
    const total = exercise.restSec * 1000;
    const left = remainingMs(session.endsAt, now);
    const progress = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
    return (
      <div className="ls-live">
        <p className="ls-kicker">rest</p>
        <div className="ls-ring" style={{ "--p": progress }} aria-hidden="true">
          <div className="ls-ring-face">
            <p className="ls-clock">{formatClock(left)}</p>
          </div>
        </div>
        <p className="ls-clock-sr" aria-live="polite">
          {formatClock(left)} remaining
        </p>
        {nextExercise && (
          <p className="ls-next">
            <span>up next</span>
            {nextExercise.name}
            <span>set {nextSet}</span>
          </p>
        )}
        {confirmEnd ? (
          <ConfirmEnd onYes={() => dispatch({ type: "endWorkout" })} onNo={() => setConfirmEnd(false)} />
        ) : (
          <>
            <button type="button" className="ls-primary" onClick={() => dispatch({ type: "skipRest" })}>
              skip rest
            </button>
            <button type="button" className="ls-quiet" onClick={() => setConfirmEnd(true)}>
              end workout
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="ls-live">
      <p className="ls-kicker">
        {SECTION_LABELS[exercise.section]} · {session.cursor.exerciseIndex + 1} of {session.exercises.length}
      </p>
      <h1>{exercise.name}</h1>
      <p className="ls-setline">
        set {setNumber} of {exercise.sets}
      </p>
      <div className="ls-pips" aria-hidden="true">
        {Array.from({ length: exercise.sets }, (_, index) => (
          <span
            key={index}
            className={index < exercise.efforts.length ? "is-done" : index === exercise.efforts.length ? "is-now" : ""}
          />
        ))}
      </div>
      {exercise.lastTime?.length > 0 && (
        <p className="ls-last">last time {exercise.lastTime.join(", ")}</p>
      )}
      {exercise.notes ? <p className="ls-notes-read">{exercise.notes}</p> : null}
      <div className="ls-dial">
        <button
          type="button"
          aria-label="decrease"
          onClick={() => setEntry(stepEntry(exercise.measure, entry, -1))}
        >
          −
        </button>
        <input
          inputMode={exercise.measure === "hold" ? "decimal" : "numeric"}
          aria-label={exercise.measure === "hold" ? "hold seconds" : "reps"}
          placeholder=""
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
        />
        <button
          type="button"
          aria-label="increase"
          onClick={() => setEntry(stepEntry(exercise.measure, entry, 1))}
        >
          +
        </button>
      </div>
      <p className="ls-unit">{exercise.measure === "hold" ? "seconds" : "reps"}</p>
      {confirmEnd ? (
        <ConfirmEnd onYes={() => dispatch({ type: "endWorkout" })} onNo={() => setConfirmEnd(false)} />
      ) : (
        <>
          <button
            type="button"
            className="ls-primary"
            disabled={entry.trim() === "" || invalid}
            onClick={() => dispatch({ type: "completeSet", value: entry, now: Date.now() })}
          >
            done
          </button>
          <button type="button" className="ls-quiet" onClick={() => setConfirmEnd(true)}>
            end workout
          </button>
        </>
      )}
    </div>
  );
}

function ConfirmEnd({ onYes, onNo }) {
  return (
    <Confirm
      message="End this workout? Sets you have not entered will not be saved."
      yes="end workout"
      no="keep going"
      onYes={onYes}
      onNo={onNo}
    />
  );
}

function Confirm({ message, yes, no, onYes, onNo, disabled = false }) {
  return (
    <div className="ls-confirm">
      <p>{message}</p>
      <div className="ls-actions">
        <button type="button" className="ls-primary" disabled={disabled} onClick={onYes}>
          {yes}
        </button>
        <button type="button" className="ls-ghost" onClick={onNo}>
          {no}
        </button>
      </div>
    </div>
  );
}
