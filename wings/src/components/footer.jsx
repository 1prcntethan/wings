import { Link } from "react-router-dom";
import { useAuth } from "../config/auth-context.jsx";
import "./footer.css";

const Footer = () => {
  const { currentUser } = useAuth();

  return (
    <footer>
      <div className="footer-container">
        <div className="footer-section">
          <p>Explore</p>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/learn">Learn</Link>
            </li>
            <li>
              <Link to="/tutorials">Tutorials</Link>
            </li>
            <li>
              <Link to="/training">Training</Link>
            </li>
            <li>
              <Link to="/terminology">Terminology</Link>
            </li>
            <li>
              <Link to="/skilltree">Skill Tree</Link>
            </li>
            <li>
              <Link to="/howtouseguide">How to use WINGS</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <p>Account</p>
          <ul>
            {currentUser ? (
              <>
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <Link to="/workoutlog">Workout log</Link>
                </li>
                <li>
                  <Link to="/settings">Settings</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/createaccount">Create account</Link>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="footer-section">
          <p>Site</p>
          <ul>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/install">Install</Link>
            </li>
            <li>
              <Link to="/disclaimer">Disclaimer</Link>
            </li>
            <li>
              <a
                href="https://forms.gle/UG7LioYvd68E52Gm7"
                target="_blank"
                rel="noopener noreferrer"
              >
                Feedback
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <p>Contact</p>
          <div className="footer-text">
            Email:{" "}
            <a id="footer-email" href="mailto:wings.sw.official@gmail.com">
              wings.sw.official@gmail.com
            </a>
          </div>
          <div className="social-media">
            <p className="footer-text">Instagram:</p>
            <a
              className="center-svg"
              href="https://www.instagram.com/wings.sw/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WINGS on Instagram"
            >
              <svg
                className="insta-svg"
                viewBox="0 0 2272 2272"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="2272" height="2272" rx="674" fill="#919191" />
                <rect
                  x="171"
                  y="184"
                  width="1930"
                  height="1930"
                  rx="597"
                  fill="#333333"
                />
                <circle cx="1136" cy="1149" r="598" fill="#919191" />
                <circle cx="1756.5" cy="577.5" r="118.5" fill="#919191" />
                <circle cx="1136" cy="1149" r="420" fill="#333333" />
              </svg>
            </a>
          </div>
          <a
            className="footer-text"
            href="https://www.instagram.com/wings.sw/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @wings.sw
          </a>
        </div>

        <div className="footer-section">
          <p>Donate</p>
          <ul>
            <li>
              <a href="https://ko-fi.com/wingssw" target="_blank" rel="noopener noreferrer">
                Ko-fi
              </a>
            </li>
            <li>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=RNREJQ826VL46"
                target="_blank"
                rel="noopener noreferrer"
              >
                PayPal
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} WINGS. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
