import React from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import BetaDisclaimer from "../components/betadisclaimer";
import "./dashboard.css";
import { useAuth } from "../config/auth-context.jsx";
import { useEffect, useState } from "react";
import {
  buildStreakUpdate,
  displayedStreak,
  formatDate,
  getFitnessDateObject,
  getUserDoc,
  logWorkout,
} from "../config/firestore.js";
import { Link } from "react-router-dom";
import { skillRP, skillRPDenominator } from "../utilites/skilltorp.js";

function describeRank(totalRP) {
  if (totalRP >= 920) {
    return { name: "ethereal", until: "max rank reached.", label: "" };
  }
  if (totalRP >= 800) {
    return { name: "ascendant", until: 920 - totalRP, label: "Rp until next rank" };
  }
  if (totalRP >= 630) {
    return { name: "diamond", until: 800 - totalRP, label: "Rp until next rank" };
  }
  if (totalRP >= 430) {
    return { name: "platinum", until: 630 - totalRP, label: "Rp until next rank" };
  }
  if (totalRP >= 260) {
    return { name: "gold", until: 430 - totalRP, label: "Rp until next rank" };
  }
  if (totalRP >= 120) {
    return { name: "silver", until: 260 - totalRP, label: "Rp until next rank" };
  }
  if (totalRP > 0) {
    return { name: "bronze", until: 120 - totalRP, label: "Rp until next rank" };
  }
  return { name: "unranked", until: 1, label: "Rp until next rank" };
}

export function Dashboard() {
  const { currentUser } = useAuth();
  const [userSkills, setUserSkills] = useState(null);
  const [workoutCounter, setWorkoutCounter] = useState(0);
  const [restCounter, setRestCounter] = useState(0);
  const [streak, setStreak] = useState({
    current: 0,
    longest: 0,
    lastLog: null,
  });
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    setStatus("loading");
    setLoadError(null);

    getUserDoc(currentUser.uid)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setLoadError("Couldn't load your progress.");
          setStatus("error");
          return;
        }

        setUserSkills(data.skills ?? {});
        setStreak(
          data.streak || {
            current: 0,
            longest: 0,
            lastLog: null,
          },
        );
        setWorkoutCounter(Number(data.workout) || 0);
        setRestCounter(Number(data.rest) || 0);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Couldn't load your progress.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, retryCount]);

  async function handleLog(type) {
    if (status !== "ready" || loggedToday || logging) return;

    const previous = {
      streak,
      workout: workoutCounter,
      rest: restCounter,
    };
    const predicted = buildStreakUpdate(previous, type);
    if (!predicted) return;

    setLogError(null);
    setLogging(true);
    setStreak(predicted.streak);
    setWorkoutCounter(predicted.workout);
    setRestCounter(predicted.rest);

    try {
      const result = await logWorkout(currentUser.uid, type);
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

  function calculateSkillRP() {
    if (!userSkills) return 0;

    let rankSum = 0;

    for (const [skillName, progress] of Object.entries(userSkills)) {
      if (typeof progress !== "number") continue;

      const basePoints = skillRP.get(skillName) ?? 0;

      if (!basePoints) continue;

      const weight = progress / 3;
      rankSum += basePoints * weight;
    }

    return rankSum;
  }

  const today = formatDate(getFitnessDateObject());
  const visibleStreak = displayedStreak(streak);

  const loggedToday = streak.lastLog === today;
  const totalDays = workoutCounter + restCounter;
  const workoutPercentage =
    totalDays > 0 ? Math.round((workoutCounter / totalDays) * 100) : 0;
  const skillPoints = calculateSkillRP();
  const totalSkillRP = Math.round((skillPoints / skillRPDenominator) * 750);
  const totalStreakRP = Math.round(Math.sqrt(visibleStreak / 365) * 250);
  const totalRP = totalSkillRP + totalStreakRP;
  const rank = describeRank(totalRP);

  function rankSVG(totalRP) {
    if (totalRP >= 920) {
      return <img src="ethereal.svg" alt="Ethereal rank" className="rank-svg ethereal"></img>;
    } else if (totalRP >= 800) {
      return <img src="ascended.svg" alt="Ascendant rank" className="rank-svg asc"></img>;
    } else if (totalRP >= 630) {
      return <img src="diamond.svg" alt="Diamond rank" className="rank-svg diamond"></img>;
    } else if (totalRP >= 430) {
      return <img src="platinum.svg" alt="Platinum rank" className="rank-svg plat"></img>;
    } else if (totalRP >= 260) {
      return <img src="gold.svg" alt="Gold rank" className="rank-svg gold"></img>;
    } else if (totalRP >= 120) {
      return <img src="silver.svg" alt="Silver rank" className="rank-svg silver"></img>;
    } else if (totalRP > 0) {
      return <img src="bronze.svg" alt="Bronze rank" className="rank-svg bronze"></img>;
    }
    return null;
  }

  return (
    <>
      <Navbar />
      <BetaDisclaimer />
      <div className="dashboard-welcome">
        welcome to the wings dashboard,
        {"  "}
        <div className="dashboard-welcome__email">{currentUser?.email}</div>
      </div>

      {status !== "ready" ? (
        <p className="log-caption">
          {status === "loading" ? "Loading your progress..." : loadError}{" "}
          {status === "error" && (
            <button
              className="log-streak"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              retry
            </button>
          )}
        </p>
      ) : (
      <div className="streak-container">
        <div className="streak-display">
          <div className="streak-info">
            <div className="streak-counter">
              streak: {visibleStreak} {visibleStreak > 0 ? "🔥" : ""}
            </div>
            <div className="streak-data">
              <div className="streak-data__left">Longest streak: </div>
              <div className="streak-data__right">{streak.longest}</div>
            </div>
            <div className="streak-data">
              <div className="streak-data__left">Total workouts logged:</div>
              <div className="streak-data__right">{workoutCounter}</div>
            </div>
            <div className="streak-data">
              <div className="streak-data__left">Total rest days logged: </div>
              <div className="streak-data__right">{restCounter}</div>
            </div>
            <div className="streak-data">
              <div className="streak-data__left">Workout consistency: </div>
              <div className="streak-data__right">{workoutPercentage}%</div>
            </div>
          </div>
          <div className="streak-info">
            <button
              className="log-streak"
              disabled={loggedToday || logging}
              onClick={() => handleLog("workout")}
            >
              {loggedToday ? "logged today" : logging ? "saving..." : "log workout"}
            </button>
            <button
              className="log-streak"
              disabled={loggedToday || logging}
              onClick={() => handleLog("rest")}
            >
              {loggedToday ? "logged today" : logging ? "saving..." : "log rest day"}
            </button>
            <div className="streak-rank-points">+{totalStreakRP} Rp</div>
          </div>
        </div>
        <p className="log-caption">
          *Make sure to log your workout or rest day once per day to keep your
          streak alive!{" "}
          {streak.lastLog
            ? `Your last log was on ${streak.lastLog}. `
            : "You have not logged a day yet. "}
          Resets at 4:00am daily.
        </p>
        {logError && <p className="log-caption">{logError}</p>}
      </div>
      )}

      <div className="streak-container">
        <div className="workout-link-display">
          <Link to="/workoutlog" className="workout-link">
            <div className="workout-link-btn">view workout log</div>
          </Link>
        </div>
      </div>
      <br />
      {status === "ready" && (
      <div className="rank-container">
        <div className="rank-display">
          <Link to="/howtouseguide">
            <img src="info.svg" id="rank-info" alt="How rank is calculated"></img>
          </Link>

          <div className="rank-top">
            {rankSVG(totalRP)}
            <div className="rank-rank">{rank.name}</div>
            {totalRP} Rp
          </div>
          <div className="rank-divider"></div>
          <div className="rank-bottom">
            <div className="rank-contributions">
              <div className="rank-points">
                <div className="rank-points__left">streak Rp contribution:</div>
                <div className="rank-points__right">+{totalStreakRP} Rp</div>
              </div>
              <div className="rank-points">
                <div className="rank-points__left">skill Rp contribution:</div>
                <div className="rank-points__right">+{totalSkillRP} Rp</div>
              </div>
            </div>
            <div className="rank-up">
              +{rank.until} {rank.label}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* <div className="dashboard-skill__container">
        <div className="dashboard-skill__push">
          <p>target push</p>
          <Link to={skillLinkMap.get(push)} className="skill-svg">
            {skillTreeIcon.get(push)}
          </Link>
          <div className="dashboard-skill__title">
            {push === null || push === "Change target push skill"
              ? "select target push skill"
              : skillNameMap?.get(push)}
          </div>
          <div className="dashboard-skill__difficulty">
            skill difficulty: {skillDiffMap?.get(push)?.toLowerCase()}
          </div>
          <select
            id="push-selector"
            className="skill-selector"
            onChange={async (e) => {
              const newSkill = e.target.value;

              try {
                await updateSkill(currentUser.uid, "push", newSkill);
                setPush(newSkill);
              } catch (error) {
                if (error.code === "permission-denied") {
                  alert("Please wait 2 seconds between skill changes.");
                } else {
                  console.error(error);
                  alert("An error occured. Please try again.");
                }
              }
            }}
          >
            <option>Change target push skill</option>
            <option value="handstand">Handstand</option>
            <option value="hspu">Handstand Push-up</option>
            <option value="ninety-deg-hold">90 Degree Hold</option>
            <option value="full-pl">Full Planche</option>
          </select>
        </div>
        <div className="dashboard-skill__pull">
          <p>target pull</p>
          <Link to={skillLinkMap.get(pull)} className="skill-svg">
            {skillTreeIcon.get(pull)}
          </Link>
          <div className="dashboard-skill__title">
            {pull === null || pull === "Change target pull skill"
              ? "select target pull skill"
              : skillNameMap?.get(pull)}
          </div>
          <div className="dashboard-skill__difficulty">
            skill difficulty: {skillDiffMap?.get(pull)?.toLowerCase()}
          </div>
          <select
            id="pull-selector"
            className="skill-selector"
            onChange={async (e) => {
              const newSkill = e.target.value;

              try {
                await updateSkill(currentUser.uid, "pull", newSkill);
                setPull(newSkill);
              } catch (error) {
                if (error.code === "permission-denied") {
                  alert("Please wait 2 seconds between skill changes.");
                } else {
                  console.error(error);
                  alert("An error occured. Please try again.");
                }
              }
            }}
          >
            <option value={null}>Change target pull skill</option>
            <option value="pull-up">Pull-up</option>
            <option value="muscle-up">Muscle Up</option>
            <option value="full-fl">Front Lever</option>
            <option value="oac-oap">One Arm Pull-up</option>
          </select>
        </div>
      </div> */}
      <div className="dashboard-donate">
        <div>
          Enjoying this platform? Support its development. Donate through
          <a
            href="https://ko-fi.com/wingssw"
            className="donate-link"
            target="_blank"
            rel="noopener"
          >
            Ko-fi
          </a>
          or
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
