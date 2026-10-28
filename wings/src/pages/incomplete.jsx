import BetaDisclaimer from "../components/betadisclaimer";
import Navbar from "../components/navbar";
import "./incomplete.css";
export function Incomplete() {
    return (
        <>
          <Navbar />
          <BetaDisclaimer />
          <div className="incomplete-text">
            <div>these feathers have not been generated yet. follow <a href="https://www.instagram.com/wings.sw/" className="incomplete-link" target="_blank" rel="noopener">@wings.sw</a> on instagram to receive regular updates on the website content.</div>
          </div>
        </>
    )
}