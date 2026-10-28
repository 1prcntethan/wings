import React, { lazy, Suspense, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { HashRouter as HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { useAuth } from "./config/auth-context";
import { Loading } from "./components/loading"
import BackToTop from "./components/backtotop";

function guidePage(page) {
  return (
    <>
      {page}
      <BackToTop />
    </>
  );
}

function lazyNamed(importer, exportName) {
  return lazy(() =>
    importer().then((module) => ({ default: module[exportName] })),
  );
}

const LoginPage = lazyNamed(() => import("./pages/loginpage"), "LoginPage");
const CreateAccountPage = lazyNamed(() => import("./pages/createaccount"), "CreateAccountPage");
const ResetPasswordPage = lazyNamed(() => import("./pages/resetpassword"), "ResetPasswordPage");
const Dashboard = lazyNamed(() => import("./pages/dashboard"), "Dashboard");
const Settings = lazyNamed(() => import("./pages/settings"), "Settings");
const Homepage = lazyNamed(() => import("./pages/home"), "Homepage");
const Training = lazyNamed(() => import("./pages/training"), "Training");
const Tutorials = lazyNamed(() => import("./pages/tutorials"), "Tutorials");
const Terminology = lazyNamed(() => import("./pages/terminology"), "Terminology");
const SkillVis = lazyNamed(() => import("./pages/skillvis"), "SkillVis");
const Incomplete = lazyNamed(() => import("./pages/incomplete"), "Incomplete");
const HowTo = lazyNamed(() => import("./pages/howto"), "HowTo");
const Install = lazyNamed(() => import("./pages/install"), "Install");
const About = lazyNamed(() => import("./pages/about"), "About");
const Disclaimer = lazyNamed(() => import("./pages/disclaimer"), "Disclaimer");
const WorkoutLog = lazyNamed(() => import("./pages/workoutlog"), "WorkoutLog");
const SkillTree = lazyNamed(() => import("./pages/skilltree"), "SkillTree");
const AssistPu = lazyNamed(() => import("./pages/tutorials/assistpu"), "AssistPu");
const Pushup = lazyNamed(() => import("./pages/tutorials/pushup"), "Pushup");
const Dip = lazyNamed(() => import("./pages/tutorials/dip"), "Dip");
const ElbowLever = lazyNamed(() => import("./pages/tutorials/elbowlever"), "ElbowLever");
const PlancheLean = lazyNamed(() => import("./pages/tutorials/planchelean"), "PlancheLean");
const PseudoPU = lazyNamed(() => import("./pages/tutorials/pseudopu"), "PseudoPU");
const TuckPL = lazyNamed(() => import("./pages/tutorials/tuckpl"), "TuckPL");
const AdvTuckPL = lazyNamed(() => import("./pages/tutorials/advtuckpl"), "AdvTuckPL");
const TuckPLPU = lazyNamed(() => import("./pages/tutorials/tuckplpu"), "TuckPLPU");
const PikePU = lazyNamed(() => import("./pages/tutorials/pikepu"), "PikePU");
const CrowPose = lazyNamed(() => import("./pages/tutorials/crowpose"), "CrowPose");
const AssistedHS = lazyNamed(() => import("./pages/tutorials/assistedhs"), "AssistedHS");
const Handstand = lazyNamed(() => import("./pages/tutorials/handstand"), "Handstand");
const ElevatedPikePU = lazyNamed(() => import("./pages/tutorials/elevatedpikepu"), "ElevatedPikePU");
const BentArmStand = lazyNamed(() => import("./pages/tutorials/bentarmstand"), "BentArmStand");
const AssistedHSPU = lazyNamed(() => import("./pages/tutorials/assistedhspu"), "AssistedHSPU");
const HSPU = lazyNamed(() => import("./pages/tutorials/hspu"), "HSPU");
const AssistedInvRow = lazyNamed(() => import("./pages/tutorials/assistedinvrow"), "AssistedInvRow");
const InvertedRow = lazyNamed(() => import("./pages/tutorials/invertedrow"), "InvertedRow");
const TuckFL = lazyNamed(() => import("./pages/tutorials/tuckfl"), "TuckFL");
const TuckFLRow = lazyNamed(() => import("./pages/tutorials/tuckflrow"), "TuckFLRow");
const PikeFL = lazyNamed(() => import("./pages/tutorials/pikefl"), "PikeFL");
const PikeFLRow = lazyNamed(() => import("./pages/tutorials/pikeflrow"), "PikeFLRow");
const AdvTuckFL = lazyNamed(() => import("./pages/tutorials/advtuckfl"), "AdvTuckFL");
const Pullup = lazyNamed(() => import("./pages/tutorials/pullup"), "Pullup");
const SuperAdvTuckFL = lazyNamed(() => import("./pages/tutorials/superadvtuckfl"), "SuperAdvTuckFL");
const AdvTuckFLRow = lazyNamed(() => import("./pages/tutorials/advtuckflrow"), "AdvTuckFLRow");
const StraddleFL = lazyNamed(() => import("./pages/tutorials/straddlefl"), "StraddleFL");
const Deadhang = lazyNamed(() => import("./pages/tutorials/deadhang"), "Deadhang");
const ActiveHang = lazyNamed(() => import("./pages/tutorials/activehang"), "ActiveHang");
const AssistPullup = lazyNamed(() => import("./pages/tutorials/assistedpullup"), "AssistPullup");
const BeginnerGuide = lazyNamed(() => import("./pages/guides/beginnerguide"), "BeginnerGuide");
const ChestPullup = lazyNamed(() => import("./pages/tutorials/chestpullup"), "ChestPullup");
const WaistPullup = lazyNamed(() => import("./pages/tutorials/waistpullup"), "WaistPullup");
const StraddleFLRow = lazyNamed(() => import("./pages/tutorials/straddleflrow"), "StraddleFLRow");
const HalflayFL = lazyNamed(() => import("./pages/tutorials/halflayfl"), "HalflayFL");
const FrontLever = lazyNamed(() => import("./pages/tutorials/frontlever"), "FrontLever");
const MuscleUp = lazyNamed(() => import("./pages/tutorials/muscleup"), "MuscleUp");
const ProgOverload = lazyNamed(() => import("./pages/guides/progoverload"), "ProgOverload");
const PushRmp = lazyNamed(() => import("./pages/guides/pushroadmap"), "PushRmp");
const HandstandGuide = lazyNamed(() => import("./pages/guides/handstandguide"), "HandstandGuide");
const AdvTuckPLPU = lazyNamed(() => import("./pages/tutorials/advtuckplpu"), "AdvTuckPLPU");
const SuperAdvTuckPL = lazyNamed(() => import("./pages/tutorials/superadvtuckpl"), "SuperAdvTuckPL");
const Situp = lazyNamed(() => import("./pages/tutorials/situp"), "Situp");
const HollowBody = lazyNamed(() => import("./pages/tutorials/hollowbody"), "HollowBody");
const LsitComp = lazyNamed(() => import("./pages/tutorials/lsitcomp"), "LsitComp");
const Lsit = lazyNamed(() => import("./pages/tutorials/lsit"), "Lsit");
const DragonFlag = lazyNamed(() => import("./pages/tutorials/dragonflag"), "DragonFlag");
const ScapulaPullup = lazyNamed(() => import("./pages/tutorials/scapulapullup"), "ScapulaPullup");
const NinetyDegHold = lazyNamed(() => import("./pages/tutorials/ninetydeghold"), "NinetyDegHold");
const Squat = lazyNamed(() => import("./pages/tutorials/squat"), "Squat");
const SplitSquat = lazyNamed(() => import("./pages/tutorials/splitsquat"), "SplitSquat");
const PullRmp = lazyNamed(() => import("./pages/guides/pullroadmap"), "PullRmp");
const BeginnerWorkout = lazyNamed(() => import("./pages/guides/beginnerworkout"), "BeginnerWorkout");
const FrontLeverGuide = lazyNamed(() => import("./pages/guides/frontleverguide"), "FrontLeverGuide");
const IntermediateWorkout = lazyNamed(() => import("./pages/guides/intermediateworkout"), "IntermediateWorkout");


function ScrollToTop({ children }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return <>{children}</>;
}

function App() {
  const { currentUser, loading, dbReady } = useAuth();

  if(loading || !dbReady) {
    return <Loading />;
  }

  return (
      <HashRouter>
        <ScrollToTop>
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/training" element={<Training />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/terminology" element={<Terminology />} />
            <Route path="/skilltree" element={<SkillTree />} />
            <Route path="/skillvis" element={<SkillVis />} />
            <Route path="/howtouseguide" element={<HowTo />} />
            <Route path="/install" element={<Install />} />
            <Route path="/about" element={<About />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route
              path="/workoutlog"
              element={currentUser ? <WorkoutLog /> : <Navigate to="/login" />}
            />
            <Route path="/tutorials/incomplete" element={<Incomplete />} />

            <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/createaccount" element={currentUser ? <Navigate to="/" /> : <CreateAccountPage />} />
            <Route path="/dashboard" element={currentUser ? <Dashboard /> : <Navigate to ="/login" />} />
            <Route path="/settings" element={currentUser ? <Settings /> : <Navigate to="/" />} />
            <Route path="/resetpassword" element={currentUser ? <Navigate to="/" /> : <ResetPasswordPage />} />

            <Route path="/training/beginnerguide" element={guidePage(<BeginnerGuide />)} />
            <Route path="/training/progoverload" element={guidePage(<ProgOverload />)} />
            <Route path="/training/pushrmp" element={guidePage(<PushRmp />)} />
            <Route
              path="/training/handstandguide"
              element={guidePage(<HandstandGuide />)}
            />
            <Route path="/training/pullrmp" element={guidePage(<PullRmp />)} />
            <Route path="/training/beginnerworkout" element={guidePage(<BeginnerWorkout />)} />
            <Route path="/training/intermediateworkout" element={guidePage(<IntermediateWorkout />)} />
            <Route path="/training/frontleverguide" element={guidePage(<FrontLeverGuide />)} />

            <Route path="/tutorials/pushup" element={<Pushup />} />
            <Route path="/tutorials/assistedpu" element={<AssistPu />} />
            <Route path="/tutorials/dip" element={<Dip />} />
            <Route path="/tutorials/elbowlever" element={<ElbowLever />} />
            <Route path="/tutorials/planchelean" element={<PlancheLean />} />
            <Route path="/tutorials/pseudopu" element={<PseudoPU />} />
            <Route path="/tutorials/tuckpl" element={<TuckPL />} />
            <Route path="/tutorials/tuckplpu" element={<TuckPLPU />} />
            <Route path="/tutorials/advtuckpl" element={<AdvTuckPL />} />
            <Route path="/tutorials/advtuckplpu" element={<AdvTuckPLPU />} />
            <Route
              path="/tutorials/superadvtuckpl"
              element={<SuperAdvTuckPL />}
            />
            <Route
              path="/tutorials/ninetydeghold"
              element={<NinetyDegHold />}
            />

            <Route path="/tutorials/pikepu" element={<PikePU />} />
            <Route path="/tutorials/crowpose" element={<CrowPose />} />
            <Route path="/tutorials/assistedhs" element={<AssistedHS />} />
            <Route path="/tutorials/handstand" element={<Handstand />} />
            <Route
              path="/tutorials/elevatedpikepu"
              element={<ElevatedPikePU />}
            />
            <Route path="/tutorials/bas" element={<BentArmStand />} />
            <Route path="/tutorials/assistedhspu" element={<AssistedHSPU />} />
            <Route path="/tutorials/hspu" element={<HSPU />} />

            <Route
              path="/tutorials/assistedinvrow"
              element={<AssistedInvRow />}
            />
            <Route path="/tutorials/invertedrow" element={<InvertedRow />} />
            <Route path="/tutorials/tuckfl" element={<TuckFL />} />
            <Route path="/tutorials/tuckflrow" element={<TuckFLRow />} />
            <Route path="/tutorials/pikefl" element={<PikeFL />} />
            <Route path="/tutorials/pikeflrow" element={<PikeFLRow />} />
            <Route path="/tutorials/advtuckfl" element={<AdvTuckFL />} />
            <Route
              path="/tutorials/superadvtuckfl"
              element={<SuperAdvTuckFL />}
            />
            <Route path="/tutorials/advtuckflrow" element={<AdvTuckFLRow />} />
            <Route path="/tutorials/straddlefl" element={<StraddleFL />} />
            <Route
              path="/tutorials/straddleflrow"
              element={<StraddleFLRow />}
            />
            <Route path="/tutorials/halflayfl" element={<HalflayFL />} />
            <Route path="/tutorials/fullfl" element={<FrontLever />} />

            <Route path="/tutorials/deadhang" element={<Deadhang />} />
            <Route path="/tutorials/activehang" element={<ActiveHang />} />
            <Route path="/tutorials/assistpullup" element={<AssistPullup />} />
            <Route path="/tutorials/pullup" element={<Pullup />} />
            <Route
              path="/tutorials/scapulapullup"
              element={<ScapulaPullup />}
            />
            <Route path="/tutorials/chestpullup" element={<ChestPullup />} />
            <Route path="/tutorials/waistpullup" element={<WaistPullup />} />
            <Route path="/tutorials/muscleup" element={<MuscleUp />} />

            <Route path="/tutorials/situp" element={<Situp />} />
            <Route path="/tutorials/hollowbody" element={<HollowBody />} />
            <Route path="/tutorials/lsitcompression" element={<LsitComp />} />
            <Route path="/tutorials/lsit" element={<Lsit />} />
            <Route path="/tutorials/dragonflag" element={<DragonFlag />} />

            <Route path="/tutorials/squat" element={<Squat />} />
            <Route path="/tutorials/splitsquat" element={<SplitSquat />} />

            <Route path="*" element={<Navigate to="/tutorials/incomplete" />} />
          </Routes>
          </Suspense>
        </ScrollToTop>
      </HashRouter>
  );
}


export default App;
