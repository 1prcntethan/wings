import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { InstallGuide } from "../components/installguide";
import "./install.css";

export function Install() {
  return (
    <>
      <Navbar />
      <main className="install-page">
        <h1 className="install-page__title">add wings</h1>
        <InstallGuide />
      </main>
      <Footer />
    </>
  );
}
