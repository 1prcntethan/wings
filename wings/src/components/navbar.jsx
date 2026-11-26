import React from "react";
import { Link } from "react-router-dom";
import { useState } from "react";
import "./navbar.css";
import { useAuth } from "../config/auth-context.jsx";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { designPreviewRequested } from "../utilites/designpreview.js";
import { HomeLogo } from "./homelogo.jsx";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleMenu = () => {
    setIsOpen((isOpen) => !isOpen);
    const spanburger = document.querySelector(".spanburger");
    const mobile__list = document.querySelector(".mobile__list");
    spanburger.classList.toggle("active");
    mobile__list.classList.toggle("active");
    if (isOpen) {
      document.documentElement.classList.add("disable-scroll");
    } else {
      document.documentElement.classList.remove("disable-scroll");
    }
  };

  const { currentUser } = useAuth();
  const signedIn = Boolean(currentUser) || designPreviewRequested();

  const location = useLocation();
  const navigate = useNavigate();

  function handleNavClick(event, to) {
    if (location.pathname === to) {
      toggleMenu();
      event.preventDefault();
    }
    document.documentElement.classList.remove("disable-scroll");
  }

  const accountLabel =
    location.pathname === "/dashboard" ? "account" : "dashboard";

  function handleAccountClick() {
    document.querySelector(".spanburger")?.classList.remove("active");
    document.querySelector(".mobile__list")?.classList.remove("active");
    document.documentElement.classList.remove("disable-scroll");
    setIsOpen(true);
    navigate(location.pathname === "/dashboard" ? "/settings" : "/dashboard");
  }

  return (
    <div className="navbar">
      <div className="navbar__logo">
        <Link to="/">
          <HomeLogo />
        </Link>
      </div>

      <div className="navbar__list">
        <div className="navbar__list--items navbar__list--pink">
          <Link
            to="/tutorials"
            className="nav-item"
            onClick={(event) => handleNavClick(event, "/tutorials")}
          >
            tutorials
          </Link>
        </div>
        <div className="navbar__list--items navbar__list--green">
          <Link
            to="/training"
            className="nav-item"
            onClick={(event) => handleNavClick(event, "/training")}
          >
            training
          </Link>
        </div>
        <div className="navbar__list--items navbar__list--pink">
          <Link
            to="/terminology"
            className="nav-item"
            onClick={(event) => handleNavClick(event, "/terminology")}
          >
            terminology
          </Link>
        </div>
        <div className="navbar__list--items navbar__list--green">
          <Link
            to="/skilltree"
            className="nav-item"
            onClick={(event) => handleNavClick(event, "/skilltree")}
          >
            skill tree
          </Link>
        </div>
        {signedIn ? (
          <div className="navbar__logout--container">
            <button className="logout-button nav-item" onClick={handleAccountClick}>
              <img src="account_icon.svg" alt="Account" className="account-icon-nav" />
              <div>{accountLabel}</div>
            </button>
          </div>
        ) : (
          <>
            <div className="navbar__logout--container">
              <Link
                to="/login"
                className="nav-item"
                onClick={(event) => handleNavClick(event, "/login")}
              >
                <button className="logout-button">
                  <div>login</div>
                </button>
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="mobile__list">
        <ul>
          <li>
            <Link
              to="/tutorials"
              className="nav-item"
              onClick={(event) => handleNavClick(event, "/tutorials")}
            >
              <div className="navbar__list--items navbar__list--pink">
                tutorials
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/training"
              className="nav-item"
              onClick={(event) => handleNavClick(event, "/training")}
            >
              <div className="navbar__list--items navbar__list--green">
                training
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/terminology"
              className="nav-item"
              onClick={(event) => handleNavClick(event, "/terminology")}
            >
              <div className="navbar__list--items navbar__list--pink">
                terminology
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/skilltree"
              className="nav-item"
              onClick={(event) => handleNavClick(event, "/skilltree")}
            >
              <div className="navbar__list--items navbar__list--green">
                skill tree
              </div>
            </Link>
          </li>
          <li>
            {currentUser ? (
              <div className="navbar__logout--container">
                <button className="logout-button nav-item" onClick={handleAccountClick}>
                  <img src="account_icon.svg" alt="Account" className="account-icon-nav" />
                  <div>{accountLabel}</div>
                </button>
              </div>
            ) : (
              <>
                <div className="navbar__logout--container">
                  <Link
                    to="/login"
                    className="nav-item"
                    onClick={(event) => handleNavClick(event, "/login")}
                  >
                    <button className="logout-button__mobile">
                      <div>login</div>
                    </button>
                  </Link>
                </div>
              </>
            )}
          </li>
        </ul>
      </div>

      <div className="spanburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};

export default Navbar;
