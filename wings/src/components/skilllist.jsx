import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  SKILL_FILTERS,
  filterCatalog,
  masteredCount,
  skillCatalog,
  skillStatus,
} from "../utilites/skillgroups.js";
import "./skilllist.css";

const CATALOG = skillCatalog();
const ACRONYMS = new Set(["fl", "pu", "pl", "hs", "hspu", "oahs", "oac", "oap", "oa"]);
const SMALL_WORDS = new Set(["to", "a", "of", "and"]);

function displayTitle(title) {
  return String(title)
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (lower.includes("/")) {
        return lower
          .split("/")
          .map((part) => (ACRONYMS.has(part) ? part.toUpperCase() : part))
          .join("/");
      }
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function statusKey(status) {
  return status === "in progress" ? "progress" : status;
}

function StatusGlyph({ status }) {
  if (status === "mastered") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (status === "locked") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  return null;
}

export function SkillViewToggle({ view, onView }) {
  return (
    <div className="skill-view" role="group" aria-label="Skill view">
      <button type="button" aria-pressed={view === "list"} onClick={() => onView("list")}>
        list
      </button>
      <button type="button" aria-pressed={view === "map"} onClick={() => onView("map")}>
        map
      </button>
    </div>
  );
}

export function SkillList({
  userSkills,
  skillsStatus,
  skillsError,
  onRetry,
  onStatus,
  onOpen,
  view,
  onView,
  canEdit,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState(null);
  const groups = useMemo(
    () => filterCatalog(CATALOG, filter, query),
    [filter, query],
  );
  const skillCount = CATALOG.reduce((sum, group) => sum + group.skills.length, 0);

  async function changeStatus(skill, value) {
    setNotice(null);
    const result = await onStatus(skill.name, Number(value));
    if (!result?.ok) setNotice(result?.error || "Couldn't save that progress.");
  }

  return (
    <div className="skill-list" data-screen="skills-list" data-ready={skillsStatus}>
      <header className="skill-list-head">
        <h1>skills</h1>
        <SkillViewToggle view={view} onView={onView} />
      </header>
      <label className="skill-search">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${skillCount} skills`}
        />
      </label>
      <div className="skill-filters" role="group" aria-label="Movement filter">
        {SKILL_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label.toLowerCase()}
          </button>
        ))}
      </div>
      <ul className="skill-legend">
        <li><i className="is-mastered" /> mastered</li>
        <li><i className="is-progress" /> in progress</li>
        <li><i className="is-unlocked" /> unlocked</li>
        <li><i className="is-locked" /> locked</li>
      </ul>
      {skillsStatus === "loading" && <p className="skill-note">Loading your skills...</p>}
      {skillsStatus === "error" && (
        <p className="skill-note">
          {skillsError}{" "}
          <button type="button" onClick={onRetry}>retry</button>
        </p>
      )}
      {notice && <p className="skill-note">{notice}</p>}
      {!canEdit && skillsStatus === "ready" && (
        <p className="skill-note">
          <Link to="/login">Sign in</Link> to track skill status.
        </p>
      )}
      {groups.length === 0 && skillsStatus !== "loading" && (
        <p className="skill-note">No skills match that search.</p>
      )}
      {groups.map((group) => {
        const mastered = masteredCount(group.skills, userSkills);
        const width = group.skills.length ? (mastered / group.skills.length) * 100 : 0;
        return (
          <section key={group.name} className="skill-path">
            <div className="skill-path-head">
              <h2>{`${group.name} path`.toLowerCase()}</h2>
              <span>{mastered} / {group.skills.length} mastered</span>
            </div>
            <div className="skill-path-bar" aria-hidden="true">
              <span
                style={{
                  width: `${width}%`,
                  "--fill": `${Math.max(width / 100, 0.001)}`,
                }}
              />
            </div>
            <ul className="skill-rows">
              {group.skills.map((skill) => {
                const progress = Number(userSkills?.[skill.id]) || 0;
                const status = skillStatus(progress);
                const key = statusKey(status);
                return (
                  <li key={skill.id} className={status === "locked" ? "is-locked" : undefined}>
                    <button type="button" className="skill-open" onClick={() => onOpen(skill.name)}>
                      <i className={`is-${key}`} aria-hidden="true" />
                      <span>
                        <strong>{displayTitle(skill.title)}</strong>
                        <small>{skill.rp} Rp</small>
                      </span>
                    </button>
                    <span className={`skill-status is-${key}`}>
                      <StatusGlyph status={status} />
                      <span aria-hidden={canEdit ? "true" : undefined}>{status}</span>
                      {canEdit && (
                        <select
                          aria-label={`${skill.title} status`}
                          value={progress}
                          disabled={skillsStatus !== "ready"}
                          onChange={(event) => changeStatus(skill, event.target.value)}
                        >
                          <option value={0}>locked</option>
                          <option value={1}>unlocked</option>
                          <option value={2}>in progress</option>
                          <option value={3}>mastered</option>
                        </select>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
