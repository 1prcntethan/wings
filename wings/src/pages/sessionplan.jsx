import CreatableSelect from "react-select/creatable";
import { skillTitle } from "../utilites/skilltitles.js";
import { skillMetric } from "../utilites/skillmetric.js";
import {
  CATEGORIES,
  MAX_SETS,
  REST_STEPS,
  SECTION_LABELS,
  SECTION_LIMITS,
  SECTION_ORDER,
  defaultMeasure,
  formatClock,
  planError,
} from "../utilites/livesession.js";

const skillOptions = [...skillTitle.keys()].map((name) => ({ value: name, label: name }));

const skillSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 44,
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    boxShadow: "none",
    fontSize: "1rem",
    cursor: "text",
    "&:hover": { border: "1px solid rgba(255, 255, 255, 0.28)" },
    ...(state.isFocused && { borderColor: "rgba(182, 109, 163, 0.85)", boxShadow: "none" }),
  }),
  input: (provided) => ({ ...provided, color: "#f3f3f3", fontFamily: "Fira Sans", fontWeight: 300 }),
  placeholder: (provided) => ({
    ...provided,
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "Fira Sans",
    fontWeight: 300,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#f3f3f3",
    fontFamily: "Fira Sans",
    fontWeight: 300,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#641b547a" : "#333333",
    color: "white",
    fontFamily: "Fira Sans",
    fontWeight: 300,
  }),
  menu: (provided) => ({ ...provided, backgroundColor: "#333333", zIndex: 30, borderRadius: 8 }),
  menuPortal: (provided) => ({ ...provided, zIndex: 30 }),
  menuList: (provided) => ({ ...provided, backgroundColor: "#333333", padding: 0, borderRadius: 8 }),
  dropdownIndicator: (provided) => ({ ...provided, color: "rgb(128, 128, 128)" }),
  indicatorSeparator: (provided) => ({ ...provided, backgroundColor: "rgb(128, 128, 128)" }),
};

function stepRest(restSec, direction) {
  const index = REST_STEPS.indexOf(restSec);
  const next = REST_STEPS[index + direction];
  return next ?? restSec;
}

function Stepper({ label, value, decreaseLabel, increaseLabel, onDecrease, onIncrease, canDecrease, canIncrease }) {
  return (
    <div className="ls-stepper">
      <span>{label}</span>
      <div className="ls-stepper-box">
        <button type="button" aria-label={decreaseLabel} disabled={!canDecrease} onClick={onDecrease}>
          −
        </button>
        <strong>{value}</strong>
        <button type="button" aria-label={increaseLabel} disabled={!canIncrease} onClick={onIncrease}>
          +
        </button>
      </div>
    </div>
  );
}

export function SessionPlan({ session, dispatch, onBack, onDiscard }) {
  const error = planError(session);

  function update(id, patch) {
    dispatch({ type: "updateExercise", id, patch });
  }

  return (
    <div className="ls-plan">
      <header className="ls-head">
        <button type="button" className="ls-back" onClick={onBack}>
          dashboard
        </button>
        <h1>plan workout</h1>
      </header>
      <p className="ls-plan-note">
        This page is only the plan. After you start, you log reps and hold times as you finish each set.
      </p>

      <p className="ls-kicker" id="ls-category">
        category
      </p>
      <div className="ls-cats" role="group" aria-labelledby="ls-category">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={session.category === category ? "is-active" : ""}
            aria-pressed={session.category === category}
            onClick={() => dispatch({ type: "setCategory", category })}
          >
            {category}
          </button>
        ))}
      </div>

      {SECTION_ORDER.map((section) => {
        const exercises = session.exercises.filter((exercise) => exercise.section === section);
        const full = exercises.length >= SECTION_LIMITS[section];
        return (
          <section key={section} className="ls-section">
            <h2>
              {SECTION_LABELS[section]}
              <span>
                {exercises.length}/{SECTION_LIMITS[section]}
              </span>
            </h2>
            {exercises.map((exercise) => (
              <article key={exercise.id} className="ls-card">
                <CreatableSelect
                  aria-label="exercise name"
                  options={skillOptions}
                  value={exercise.name ? { value: exercise.name, label: exercise.name } : null}
                  onChange={(option) => {
                    const name = (option?.value ?? "").slice(0, 80);
                    update(exercise.id, {
                      name,
                      measure: name ? defaultMeasure(skillMetric.get(name)) : exercise.measure,
                    });
                  }}
                  onCreateOption={(input) =>
                    update(exercise.id, { name: input.slice(0, 80), measure: "reps" })
                  }
                  placeholder="type or search a skill"
                  formatCreateLabel={(input) => `use "${input}"`}
                  isClearable
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  classNamePrefix="ls-skill-select"
                  styles={skillSelectStyles}
                />
                {exercise.lastTime?.length > 0 && (
                  <p className="ls-last">last time {exercise.lastTime.join(", ")}</p>
                )}
                <div className="ls-controls">
                  <Stepper
                    label="sets"
                    value={exercise.sets}
                    decreaseLabel="fewer sets"
                    increaseLabel="more sets"
                    canDecrease={exercise.sets > 1}
                    canIncrease={exercise.sets < MAX_SETS}
                    onDecrease={() => update(exercise.id, { sets: exercise.sets - 1 })}
                    onIncrease={() => update(exercise.id, { sets: exercise.sets + 1 })}
                  />
                  <Stepper
                    label="rest"
                    value={formatClock(exercise.restSec * 1000)}
                    decreaseLabel="shorter rest"
                    increaseLabel="longer rest"
                    canDecrease={exercise.restSec > REST_STEPS[0]}
                    canIncrease={exercise.restSec < REST_STEPS.at(-1)}
                    onDecrease={() => update(exercise.id, { restSec: stepRest(exercise.restSec, -1) })}
                    onIncrease={() => update(exercise.id, { restSec: stepRest(exercise.restSec, 1) })}
                  />
                  <div className="ls-measure" role="group" aria-label="reps or hold">
                    <button
                      type="button"
                      className={exercise.measure === "reps" ? "is-active" : ""}
                      onClick={() => update(exercise.id, { measure: "reps" })}
                    >
                      reps
                    </button>
                    <button
                      type="button"
                      className={exercise.measure === "hold" ? "is-active" : ""}
                      onClick={() => update(exercise.id, { measure: "hold" })}
                    >
                      hold
                    </button>
                  </div>
                </div>
                <input
                  className="ls-notes"
                  placeholder="notes (optional)"
                  value={exercise.notes}
                  maxLength={200}
                  onChange={(event) => update(exercise.id, { notes: event.target.value })}
                />
                <div className="ls-card-foot">
                  <button
                    type="button"
                    className="ls-remove"
                    onClick={() => dispatch({ type: "removeExercise", id: exercise.id })}
                  >
                    remove
                  </button>
                </div>
              </article>
            ))}
            <button
              type="button"
              className="ls-add"
              disabled={full}
              onClick={() => dispatch({ type: "addExercise", section })}
            >
              {full ? "section full" : "+ add exercise"}
            </button>
          </section>
        );
      })}

      <div className="ls-dock">
        {error && <p className="ls-error">{error}</p>}
        <div className="ls-dock-actions">
          <button
            type="button"
            className="ls-primary"
            disabled={Boolean(error)}
            onClick={() => dispatch({ type: "start", now: Date.now() })}
          >
            start workout
          </button>
          {session.exercises.length > 0 && (
            <button type="button" className="ls-ghost" onClick={onDiscard}>
              discard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
