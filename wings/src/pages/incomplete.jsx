import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import "./incomplete.css";
export function Incomplete() {
    return (
        <>
          <Navbar />
          <div className="incomplete-text">
            <div>
              these feathers have not been generated yet. follow <a href="https://www.instagram.com/wings.sw/" className="incomplete-link" target="_blank" rel="noopener">@wings.sw</a> on instagram to receive regular updates on the website content.
              <div className="incomplete-action">
                <Link to="/dashboard" className="incomplete-link">back to dashboard</Link>
              </div>
            </div>
          </div>
          <Footer />
        </>
    )
}