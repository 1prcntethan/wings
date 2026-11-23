import "./skilltree.css";
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState, useContext } from "react";
import { skillLinks } from "../utilites/skillLinks";
import { Link } from "react-router-dom";
import { Drawing } from "../utilites/drawings/drawing.jsx";
import { loadSkillImage } from "../utilites/skillImage.jsx";
import { skillDiff } from "../utilites/skilldifficulties.js";
import { skillTime } from "../utilites/skilltime.js";
import { skillMuscle } from "../utilites/skillmuscles.js";
import { skillTitle } from "../utilites/skilltitles.js";
import { skillMetric } from "../utilites/skillmetric.js";
import { skillCategory } from "../utilites/skillcategory.js";
import { incompleteList } from "../utilites/incompleteskills.js";
import { useAuth } from "../config/auth-context.jsx";
import { getUserDoc, updateSkill } from "../config/firestore.js";
import { skillDB } from "../utilites/skilltodb.js";
import { skillRP, skillRPDenominator } from "../utilites/skilltorp.js";
import { shareProgressCard } from "../utilites/progresscard.js";
import { SkillList } from "../components/skilllist";
import { designPreviewRequested, loadDesignPreview } from "../utilites/designpreview.js";
import { SkillContext } from "./skillcontext.js";
import { reportError } from "../config/sentry.js";
import { Loading } from "../components/loading";

const SkillMap = lazy(() =>
  import("./skillmap.jsx").then((module) => ({ default: module.SkillMap })),
);

const SKILL_VIEW_KEY = "wings-skills-view";

function readSkillView() {
  try {
    const saved = localStorage.getItem(SKILL_VIEW_KEY);
    if (saved === "list" || saved === "map") return saved;
  } catch {
    // Keep the width default when storage is blocked.
  }
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches) {
    return "list";
  }
  return "map";
}

function showSkillWindow() {
  document.querySelector(".skill-window")?.classList.remove("close");
}

function toggleContainer(skill) {
  if (skill === undefined) {
    return;
  }
  const container = document.querySelector(".skill-window");
  container.classList.toggle("close");
}

const SkillWindow = () => {
  const { currentUser } = useAuth();
  const {
    skill,
    userSkills,
    skillsStatus,
    skillsError,
    retrySkills,
    saveProgress,
  } = useContext(SkillContext);
  const [saving, setSaving] = useState(false);
  const [skillError, setSkillError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const skillEq = skillDB.get(skill);
  const progress = userSkills?.[skillEq] ?? 0;

  useEffect(() => {
    setShareError(null);
  }, [skill, progress]);

  return (
    <>
      <div className="skill-window close">
        <div className="skill-window-content">
          <div className="skill-window__svg-container">
            <svg className="skill-window__svg"><Drawing load={loadSkillImage} name={skill} /></svg>
          </div>
          <div className="skill-window__text">
            <div className="skill-window__title">{skillTitle.get(skill)}</div>

            <div className="skill-window__description">
              The {skill} is a {skillDiff.get(skill)} rated skill. Typically, it
              takes around {skillTime.get(skill)} to learn.
            </div>

            <div className="skill-window__targeted-muscles">
              Targeted Muscles: {skillMuscle.get(skill)}
            </div>

            <div className="skill-window__category">
              Category: {skillCategory.get(skill)}
            </div>

            <div className="skill-window__muscle-use">
              Muscle Use: {skillMetric.get(skill)}
            </div>
            {(currentUser || designPreviewRequested()) && (
              <div className="skill-update__container">
                <div className="skill-update__select">
                  <select
                    value={progress}
                    disabled={saving || skillsStatus !== "ready"}
                    onChange={async (event) => {
                      const newProgress = Number(event.target.value);
                      if (![0, 1, 2, 3].includes(newProgress) || saving) return;
                      setSkillError(null);
                      setSaving(true);
                      const result = await saveProgress(skill, newProgress);
                      if (!result?.ok && result?.error) setSkillError(result.error);
                      setSaving(false);
                    }}
                  >
                    <option value={0}>locked</option>
                    <option value={1}>unlocked</option>
                    <option value={2}>in progress</option>
                    <option value={3}>mastered</option>
                  </select>
                </div>
                <div className="progress-rp">
                  +
                  {Math.round(
                    skillRP?.get(
                      skillDB.get(skill) ? (skillDB?.get(skill) ?? 0) : 0,
                    ) *
                      (progress / 3) *
                      (750 / skillRPDenominator),
                  )}{" "}
                  Rp
                </div>
              </div>
            )}
            {(currentUser || designPreviewRequested()) && (skillError || skillsStatus === "error") && (
              <div className="skill-update__error">
                {skillError || skillsError}{" "}
                {skillsStatus === "error" && (
                  <button type="button" onClick={retrySkills}>
                    retry
                  </button>
                )}
              </div>
            )}

            {currentUser &&
              skillsStatus === "ready" &&
              progress === 3 &&
              !saving && (
                <button
                  type="button"
                  className="skill-share"
                  disabled={sharing}
                  onClick={async () => {
                    if (sharing) return;
                    setSharing(true);
                    setShareError(null);
                    try {
                      await shareProgressCard({
                        title: skillTitle.get(skill) || skill,
                        difficulty: skillDiff.get(skill) || "",
                      });
                    } catch (error) {
                      if (error?.name !== "AbortError") {
                        setShareError("Couldn't make that image. Try again.");
                      }
                    } finally {
                      setSharing(false);
                    }
                  }}
                >
                  {sharing ? "Making image..." : "Share"}
                </button>
              )}
            {shareError && (
              <div className="skill-update__error">{shareError}</div>
            )}

            <Link
              to={
                incompleteList.includes(skill)
                  ? "/tutorials/incomplete"
                  : skillLinks.get(skill)
              }
              className="skill-window__link"
            >
              <div className="skill-window__go">View Page</div>
            </Link>
          </div>

          <button
            type="button"
            className="skill-window__close-btn"
            aria-label="Close"
            onClick={() => toggleContainer(skill)}
          >
            &#x2715;
          </button>
        </div>
      </div>
    </>
  );
};

export function SkillTree() {
  const [skill, setSkill] = useState("Assisted Push-up");
  const { currentUser } = useAuth();
  const [userSkills, setUserSkills] = useState({});
  const [skillsError, setSkillsError] = useState(null);
  const [loadedUid, setLoadedUid] = useState(null);
  const [skillsRetry, setSkillsRetry] = useState(0);
  const [view, setView] = useState(readSkillView);
  const [phoneLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );
  const [previewReady, setPreviewReady] = useState(() => !designPreviewRequested());
  const saveLock = useRef(false);
  const skillsRef = useRef(userSkills);
  skillsRef.current = userSkills;
  const previewing = designPreviewRequested();
  const skillsStatus = previewing
    ? previewReady
      ? "ready"
      : "loading"
    : !currentUser
      ? "ready"
      : skillsError
        ? "error"
        : loadedUid === currentUser.uid
          ? "ready"
          : "loading";

  useEffect(() => {
    if (!previewing) return undefined;
    let cancelled = false;
    loadDesignPreview().then((mod) => {
      if (cancelled) return;
      if (mod?.previewSkills) setUserSkills(mod.previewSkills);
      setPreviewReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [previewing]);

  useEffect(() => {
    if (previewing || !currentUser) return undefined;

    let cancelled = false;

    getUserDoc(currentUser.uid)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setSkillsError("Couldn't load your progress.");
          return;
        }
        setUserSkills(data.skills ?? {});
        setSkillsError(null);
        setLoadedUid(currentUser.uid);
      })
      .catch((error) => {
        reportError(error, { where: "getUserDoc" });
        if (cancelled) return;
        setSkillsError("Couldn't load your progress.");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, skillsRetry, previewing]);

  const saveProgress = useCallback(async (skillName, newProgress) => {
    const skillEq = skillDB.get(skillName);
    const progress = Number(newProgress);
    if (!skillEq || ![0, 1, 2, 3].includes(progress)) {
      return { ok: false, error: "Couldn't save that progress. Try again." };
    }
    if (designPreviewRequested() && !currentUser) {
      setUserSkills((prev) => ({ ...prev, [skillEq]: progress }));
      return { ok: true };
    }
    if (!currentUser) return { ok: false, error: "Sign in to save progress." };
    if (saveLock.current) {
      return { ok: false, error: "Please wait a second between skill changes." };
    }

    const previous = skillsRef.current;
    saveLock.current = true;
    setUserSkills((prev) => ({ ...prev, [skillEq]: progress }));
    try {
      const saved = await updateSkill(currentUser.uid, skillEq, progress);
      if (saved === false) {
        setUserSkills(previous);
        return { ok: false, error: "Couldn't save that progress. Try again." };
      }
      return { ok: true };
    } catch (error) {
      reportError(error, { where: "updateSkill" });
      setUserSkills(previous);
      return {
        ok: false,
        error:
          error?.code === "permission-denied"
            ? "Please wait a second between skill changes."
            : "Couldn't save that progress. Try again.",
      };
    } finally {
      window.setTimeout(() => {
        saveLock.current = false;
      }, 1000);
    }
  }, [currentUser]);

  function chooseView(next) {
    setView(next);
    try {
      localStorage.setItem(SKILL_VIEW_KEY, next);
    } catch {
      // The choice still applies until reload.
    }
  }

  return (
    <SkillContext.Provider
      value={{
        skill,
        setSkill,
        userSkills,
        setUserSkills,
        skillsStatus,
        skillsError,
        saveProgress,
        retrySkills: () => {
          setSkillsError(null);
          setLoadedUid(null);
          setSkillsRetry((count) => count + 1);
        },
      }}
    >
      <div
        className={view === "map" ? "skill-tree" : "skill-board"}
        data-screen={view === "map" ? "skills-map" : "skills-list"}
        data-ready={skillsStatus}
      >
        {view === "list" ? (
          <SkillList
            userSkills={userSkills}
            skillsStatus={skillsStatus}
            skillsError={skillsError}
            onRetry={() => {
              setSkillsError(null);
              setLoadedUid(null);
              setSkillsRetry((count) => count + 1);
            }}
            onStatus={saveProgress}
            onOpen={(name) => {
              setSkill(name);
              showSkillWindow();
            }}
            view={view}
            onView={chooseView}
            canEdit={Boolean(currentUser) || previewing}
          />
        ) : (
          <Suspense fallback={<Loading />}>
            <SkillMap phoneLayout={phoneLayout} view={view} onView={chooseView} />
          </Suspense>
        )}
        <SkillWindow />
      </div>
    </SkillContext.Provider>
  );
}
