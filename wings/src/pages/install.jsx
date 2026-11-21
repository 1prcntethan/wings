import Navbar from "../components/navbar";
import BetaDisclaimer from "../components/betadisclaimer";
import { InstallGuide } from "../components/installguide";
import "./install.css";

export function Install() {
  return (
    <>
      <Navbar />
      <BetaDisclaimer />
      <main className="install-page">
        <h1 className="install-page__title">add wings</h1>
        <InstallGuide />
      </main>
    </>
  );
}
