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

export function SkillViewToggle({ view, onView }) {
  return (
    <div className="skill-view" role="group" aria-label="Skill view">
      <button type="button" aria-pressed={view === "list"} onClick={() => onView("list")}>
        List
      </button>
      <button type="button" aria-pressed={view === "map"} onClick={() => onView("map")}>
        Map
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

  async function changeStatus(skill, value) {
    setNotice(null);
    const result = await onStatus(skill.name, Number(value));
    if (!result?.ok) setNotice(result?.error || "Couldn't save that progress.");
  }

  return (
    <div className="skill-list" data-screen="skills-list" data-ready={skillsStatus}>
      <header className="skill-list-head">
        <h1>Skills</h1>
        <SkillViewToggle view={view} onView={onView} />
      </header>
      <label className="skill-search">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16.5 20 20.5" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${CATALOG.reduce((sum, group) => sum + group.skills.length, 0)} skills`}
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
            {item.label}
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
              <h2>{group.name} path</h2>
              <span>{mastered} / {group.skills.length} mastered</span>
            </div>
            <div className="skill-path-bar" aria-hidden="true">
              <span style={{ width: `${width}%` }} />
            </div>
            <ul>
              {group.skills.map((skill) => {
                const progress = Number(userSkills?.[skill.id]) || 0;
                const status = skillStatus(progress);
                return (
                  <li key={skill.id}>
                    <button type="button" className="skill-open" onClick={() => onOpen(skill.name)}>
                      <i className={`is-${status === "in progress" ? "progress" : status}`} />
                      <span>
                        <strong>{skill.title}</strong>
                        <small>{skill.rp} Rp</small>
                      </span>
                    </button>
                    {canEdit ? (
                      <select
                        aria-label={`${skill.title} status`}
                        value={progress}
                        disabled={skillsStatus !== "ready"}
                        className={`is-${status === "in progress" ? "progress" : status}`}
                        onChange={(event) => changeStatus(skill, event.target.value)}
                      >
                        <option value={0}>locked</option>
                        <option value={1}>unlocked</option>
                        <option value={2}>in progress</option>
                        <option value={3}>mastered</option>
                      </select>
                    ) : (
                      <span className={`skill-pill is-${status === "in progress" ? "progress" : status}`}>
                        {status}
                      </span>
                    )}
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
