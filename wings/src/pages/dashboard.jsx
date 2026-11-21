import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useAuth } from "../config/auth-context.jsx";
import {
  buildStreakUpdate,
  displayedStreak,
  formatDate,
  getFitnessDateObject,
  getLatestWorkoutLog,
  getUserDoc,
  getWorkoutLogsByDate,
  logWorkout,
} from "../config/firestore.js";
import { skillRP, skillRPDenominator } from "../utilites/skilltorp.js";
import { highestReached } from "../utilites/skillgroups.js";
import { weekDots } from "../utilites/streakweek.js";
import { DRAFT_KEY, normalizeWorkoutLog, parseDraft } from "../utilites/livesession.js";
import { loadDesignPreview } from "../utilites/designpreview.js";
import {
  formatLogDateCompact,
  formatTrainedTime,
  formatWorkoutDurationLabel,
  logExerciseRows,
  monthBounds,
  monthLabel,
  summarizeLogs,
} from "../utilites/workoutstats.js";
import "./dashboard.css";

const GUIDES = [
  { title: "Gym vs Calisthenics", to: "/training/gymvscalisthenics" },
  { title: "Full-body vs Split", to: "/training/fullbodyvssplit" },
  { title: "Rest & Recovery", to: "/training/restandrecovery" },
  { title: "General Nutrition", to: "/training/generalnutrition" },
];

function describeRank(totalRP) {
  if (totalRP >= 920) {
    return { name: "ethereal", min: 920, max: 920, next: "", until: null };
  }
  if (totalRP >= 800) {
    return { name: "ascendant", min: 800, max: 920, next: "ethereal", until: 920 - totalRP };
  }
  if (totalRP >= 630) {
    return { name: "diamond", min: 630, max: 800, next: "ascendant", until: 800 - totalRP };
  }
  if (totalRP >= 430) {
    return { name: "platinum", min: 430, max: 630, next: "diamond", until: 630 - totalRP };
  }
  if (totalRP >= 260) {
    return { name: "gold", min: 260, max: 430, next: "platinum", until: 430 - totalRP };
  }
  if (totalRP >= 120) {
    return { name: "silver", min: 120, max: 260, next: "gold", until: 260 - totalRP };
  }
  if (totalRP > 0) {
    return { name: "bronze", min: 0, max: 120, next: "silver", until: 120 - totalRP };
  }
  return { name: "unranked", min: 0, max: 1, next: "bronze", until: 1 };
}

function rankArt(totalRP) {
  if (totalRP >= 920) return { src: "ethereal.svg", alt: "Ethereal rank" };
  if (totalRP >= 800) return { src: "ascended.svg", alt: "Ascendant rank" };
  if (totalRP >= 630) return { src: "diamond.svg", alt: "Diamond rank" };
  if (totalRP >= 430) return { src: "platinum.svg", alt: "Platinum rank" };
  if (totalRP >= 260) return { src: "gold.svg", alt: "Gold rank" };
  if (totalRP >= 120) return { src: "silver.svg", alt: "Silver rank" };
  if (totalRP > 0) return { src: "bronze.svg", alt: "Bronze rank" };
  return null;
}

function skillPointsOf(userSkills) {
  let rankSum = 0;
  for (const [skillName, progress] of Object.entries(userSkills || {})) {
    if (typeof progress !== "number") continue;
    const basePoints = skillRP.get(skillName) ?? 0;
    if (!basePoints) continue;
    rankSum += basePoints * (progress / 3);
  }
  return rankSum;
}

function headingDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userSkills, setUserSkills] = useState(null);
  const [workoutCounter, setWorkoutCounter] = useState(0);
  const [restCounter, setRestCounter] = useState(0);
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastLog: null });
  const [username, setUsername] = useState("");
  const [latest, setLatest] = useState(null);
  const [monthStats, setMonthStats] = useState(null);
  const [monthName, setMonthName] = useState("");
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState(null);

  useEffect(() => {
    try {
      setDraft(parseDraft(localStorage.getItem(DRAFT_KEY)));
    } catch {
      setDraft(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setLoadError(null);
      const preview = await loadDesignPreview();
      if (cancelled) return;
      if (preview) {
        const today = getFitnessDateObject();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const logs = preview.previewWorkoutLogs(today);
        const bounds = monthBounds(today.getFullYear(), today.getMonth());
        setUsername("Ethan");
        setUserSkills(preview.previewSkills);
        setStreak({ current: 12, longest: 31, lastLog: formatDate(yesterday) });
        setWorkoutCounter(48);
        setRestCounter(10);
        setLatest(logs[0]);
        setMonthStats(
          summarizeLogs(logs.filter((log) => log.date >= bounds.start && log.date <= bounds.end)),
        );
        setMonthName(monthLabel(today));
        setStatus("ready");
        return;
      }

      if (!currentUser) return;
      const today = getFitnessDateObject();
      const bounds = monthBounds(today.getFullYear(), today.getMonth());
      try {
        const [data, log, monthLogs] = await Promise.all([
          getUserDoc(currentUser.uid),
          getLatestWorkoutLog(currentUser.uid),
          getWorkoutLogsByDate(currentUser.uid, bounds.start, bounds.end),
        ]);
        if (cancelled) return;
        if (!data) {
          setLoadError("Couldn't load your progress.");
          setStatus("error");
          return;
        }
        setUserSkills(data.skills ?? {});
        setStreak(data.streak || { current: 0, longest: 0, lastLog: null });
        setWorkoutCounter(Number(data.workout) || 0);
        setRestCounter(Number(data.rest) || 0);
        setUsername(typeof data.username === "string" ? data.username : "");
        setLatest(log ? normalizeWorkoutLog(log) : null);
        setMonthStats(summarizeLogs(monthLogs));
        setMonthName(monthLabel(today));
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setLoadError("Couldn't load your progress.");
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser, retryCount]);

  async function handleRest() {
    if (status !== "ready" || loggedToday || logging) return;
    const previous = { streak, workout: workoutCounter, rest: restCounter };
    const predicted = buildStreakUpdate(previous, "rest");
    if (!predicted) return;

    setLogError(null);
    setLogging(true);
    setStreak(predicted.streak);
    setWorkoutCounter(predicted.workout);
    setRestCounter(predicted.rest);
    try {
      const result = await logWorkout(currentUser.uid, "rest");
      if (!result) {
        setStreak(previous.streak);
        setWorkoutCounter(previous.workout);
        setRestCounter(previous.rest);
        setLogError("Already logged today.");
        return;
      }
      setStreak(result.streak);
      setWorkoutCounter(result.workout);
      setRestCounter(result.rest);
    } catch {
      setStreak(previous.streak);
      setWorkoutCounter(previous.workout);
      setRestCounter(previous.rest);
      setLogError("Couldn't save that log. Try again.");
    } finally {
      setLogging(false);
    }
  }

  function startSession() {
    if (draft) {
      navigate("/workoutlog/session");
      return;
    }
    navigate("/workoutlog/session", { state: { fresh: true } });
  }

  function repeatWorkout() {
    if (!latest || draft) {
      navigate("/workoutlog/session");
      return;
    }
    navigate("/workoutlog/session", { state: { fresh: true, log: latest } });
  }

  const today = formatDate(getFitnessDateObject());
  const visibleStreak = displayedStreak(streak);
  const loggedToday = streak.lastLog === today;
  const skillPoints = skillPointsOf(userSkills);
  const totalSkillRP = Math.round((skillPoints / skillRPDenominator) * 750);
  const totalStreakRP = Math.round(Math.sqrt(visibleStreak / 365) * 250);
  const totalRP = totalSkillRP + totalStreakRP;
  const rank = describeRank(totalRP);
  const art = rankArt(totalRP);
  const span = rank.max - rank.min;
  const rankFill = rank.name === "ethereal" || span <= 0
    ? 100
    : Math.min(100, Math.max(0, ((totalRP - rank.min) / span) * 100));
  const displayName = (
    username || currentUser?.email?.split("@")[0] || "athlete"
  ).toLowerCase();
  const initial = displayName.trim().charAt(0).toUpperCase() || "W";
  const dots = weekDots(getFitnessDateObject(), streak);
  const reached = status === "ready" ? highestReached(userSkills || {}) : [];
  const lastDurationLabel = latest ? formatWorkoutDurationLabel(latest.durationSec) : null;
  return (
    <>
      <Navbar />
      <main className="dash-page" data-screen="dashboard" data-ready={status}>
        <header className="dash-greet">
          <p className="dash-date">{headingDate(new Date())}</p>
          <h1 className="dash-hello">hey, {displayName}</h1>
          <Link to="/settings" className="dash-avatar" aria-label="Account">
            {initial}
          </Link>
        </header>

        {status !== "ready" ? (
          <p className="dash-note">
            {status === "loading" ? "Loading your progress..." : loadError}{" "}
            {status === "error" && (
              <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
                retry
              </button>
            )}
          </p>
        ) : (
          <div className="dash-grid">
            <section className="dash-card dash-streak">
              <div className="dash-streak-top">
                <span className="dash-flame" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2s2 4 2 6c1.2-.8 2-2.4 2-2.4S20 8.2 20 13a8 8 0 1 1-16 0c0-3 2.2-5.2 3.4-6.4C8 8 8.8 10 8.8 10 9 7 12 2 12 2z" />
                  </svg>
                </span>
                <div className="dash-streak-count">
                  <strong className="dash-streak-num">{visibleStreak}</strong>
                  <div className="dash-streak-copy">
                    <span>day streak</span>
                    <small>+{totalStreakRP} Rp from streak</small>
                  </div>
                </div>
                <div className="dash-longest">
                  <b>{streak.longest}</b>
                  <span>longest</span>
                </div>
              </div>
              <ol className="dash-week">
                {dots.map((dot) => (
                  <li key={dot.key}>
                    <span className={`dash-dot dash-dot--${dot.state}`} />
                    <span>{dot.label}</span>
                  </li>
                ))}
              </ol>
              <button type="button" className="dash-primary" onClick={startSession}>
                <svg className="dash-btn-icon dash-btn-icon--play" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.2 6.8v10.4L17.8 12 8.2 6.8z" fill="currentColor" />
                </svg>
                <span>{draft ? "resume session" : "start session"}</span>
              </button>
              <button
                type="button"
                className="dash-secondary"
                disabled={loggedToday || logging}
                onClick={handleRest}
              >
                <svg className="dash-btn-icon dash-btn-icon--moon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M18.2 6.4a7.2 7.2 0 1 0-1.6 12.1 5.8 5.8 0 0 1 1.6-12.1z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  {loggedToday ? "logged today" : logging ? "saving..." : "log rest day"}
                </span>
              </button>
              {logError && <p className="dash-note">{logError}</p>}
            </section>

            <section className="dash-block dash-rank-block">
              <div className="dash-kicker">
                <span>rank</span>
                <Link to="/howtouseguide">how it works</Link>
              </div>
              <div className="dash-card dash-rank">
              <div className="dash-rank-main">
                {art && <img src={art.src} alt={art.alt} className="dash-rank-mark" />}
                <div className="dash-rank-body">
                  <div className="dash-rank-head">
                    <h2>{rank.name}</h2>
                    <p>{totalRP} Rp</p>
                  </div>
                  <div
                    className="dash-bar"
                    role="progressbar"
                    aria-valuemin={rank.min}
                    aria-valuemax={rank.max}
                    aria-valuenow={totalRP}
                  >
                    <span
                      style={{
                        width: `${rankFill}%`,
                        "--fill": `${Math.max(rankFill / 100, 0.001)}`,
                      }}
                    />
                  </div>
                  <div className="dash-scale">
                    <span>{rank.min}</span>
                    <span className="dash-scale-mid">
                      {rank.until == null ? (
                        "max rank reached"
                      ) : (
                        <>
                          <span className="dash-scale-rp">{rank.until} Rp</span>
                          <span className="dash-scale-to"> to {rank.next}</span>
                        </>
                      )}
                    </span>
                    <span>{rank.name === "ethereal" ? "" : rank.max}</span>
                  </div>
                </div>
              </div>
              </div>
            </section>

            <section className="dash-block dash-reached-block">
              <div className="dash-kicker">
                <span>in progress</span>
                <Link to="/skilltree">skill tree</Link>
              </div>
              <div className="dash-card dash-reached">
              {reached.length === 0 ? (
                <p className="dash-note">Unlock a skill to see your furthest node in each group.</p>
              ) : (
                <ul className="dash-reached-list">
                  {reached.map((skill) => (
                    <li key={skill.id}>
                      <i className={`is-${skill.status === "in progress" ? "progress" : skill.status}`} />
                      <span>
                        <strong>{skill.title.toLowerCase()}</strong>
                        <small>{skill.group} · {skill.rp} Rp</small>
                      </span>
                      <em>{skill.status}</em>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </section>

            <section className="dash-block dash-last-block">
              <div className="dash-kicker">
                <span>last workout</span>
                <Link to="/workoutlog">view workout log</Link>
              </div>
              <div className="dash-card dash-last">
              {!latest ? (
                <p className="dash-note">No workouts yet. Start a session when you train.</p>
              ) : (
                <>
                  <div className="dash-last-meta">
                    <span className={`dash-cat dash-cat--${latest.category}`}>{latest.category}</span>
                    <span className="dash-last-when">
                      {formatLogDateCompact(latest.date)}
                      {lastDurationLabel && <> · {lastDurationLabel}</>}
                    </span>
                  </div>
                  <ul className="dash-last-rows">
                    {logExerciseRows(latest).map((row) => (
                      <li key={row.name}>
                        <span>{row.name}</span>
                        <span>{row.detail}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="dash-last-actions">
                    <button type="button" className="dash-repeat" onClick={repeatWorkout}>
                      <svg className="dash-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12 5V2L7 7l5 5V9c2.8 0 5 2.2 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.9-4H5.1A7 7 0 0 0 12 21a7 7 0 0 0 0-14z"
                          fill="currentColor"
                        />
                      </svg>
                      <span>{draft ? "resume" : "repeat"}</span>
                    </button>
                    <Link className="dash-details" to="/workoutlog">
                      details
                    </Link>
                  </div>
                </>
              )}
              </div>
            </section>

            <section className="dash-block dash-squad-block" aria-label="Squad, coming soon">
              <div className="dash-kicker">
                <span>squad</span>
              </div>
              <div className="dash-card dash-squad">
              <div className="dash-squad-inner">
                <div className="dash-faces" aria-hidden="true">
                  <span>?</span>
                  <span>?</span>
                  <span>?</span>
                </div>
                <div className="dash-squad-text">
                  <h2>train with friends</h2>
                  <p className="dash-squad-copy">compare streaks &amp; ranks</p>
                </div>
                <span className="dash-soon">coming soon</span>
              </div>
              </div>
            </section>

            <section className="dash-block dash-learn-block">
              <div className="dash-kicker">
                <span>learn</span>
                <Link to="/learn">hub</Link>
              </div>
              <div className="dash-card dash-learn">
              <div className="dash-learn-grid">
                <Link to="/training">training</Link>
                <Link to="/tutorials">tutorials</Link>
                <Link to="/terminology">terminology</Link>
                <Link to="/howtouseguide">how to use</Link>
              </div>
              </div>
            </section>

            <section className="dash-block dash-month-block dash-desktop-only">
              <div className="dash-kicker">
                <span>this month</span>
              </div>
              <div className="dash-card dash-month">
              <div className="dash-month-stats">
                <p><b>{monthStats?.workouts ?? 0}</b><span>workouts</span></p>
                <p>
                  <b title="Duration is not stored on workout logs.">
                    {formatTrainedTime(monthStats?.durationSec)}
                  </b>
                  <span>time trained</span>
                </p>
                <p><b>{monthStats?.sets ?? 0}</b><span>total sets</span></p>
              </div>
              <p className="dash-note">{monthName}</p>
              </div>
            </section>

            <section className="dash-block dash-guides-block dash-desktop-only">
              <div className="dash-kicker">
                <span>new guides</span>
              </div>
              <div className="dash-card dash-guides">
              <ul>
                {GUIDES.map((guide) => (
                  <li key={guide.to}>
                    <Link to={guide.to}>
                      <span>{guide.title}</span>
                      <span>read</span>
                    </Link>
                  </li>
                ))}
              </ul>
              </div>
            </section>
          </div>
        )}
      </main>
      <div className="footer-app-chrome">
        <Footer />
      </div>
    </>
  );
}
