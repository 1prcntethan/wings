import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import "./learn.css";

const GUIDES = [
  { title: "Gym vs Calisthenics", to: "/training/gymvscalisthenics", badge: "New" },
  { title: "Full-body vs Split", to: "/training/fullbodyvssplit", badge: "New" },
  { title: "Rest & Recovery", to: "/training/restandrecovery", badge: "New" },
  { title: "General Nutrition", to: "/training/generalnutrition", badge: "New" },
  { title: "Beginner Guide", to: "/training/beginnerguide", note: "for beginners" },
];

const CARDS = [
  {
    id: "tutorials",
    title: "Tutorials",
    text: "step-by-step skill tutorials",
    to: "/tutorials",
    icon: "play",
  },
  {
    id: "terminology",
    title: "Terminology",
    text: "RPE, scap, PPPU & more",
    to: "/terminology",
    icon: "list",
  },
  {
    id: "howto",
    title: "How to use",
    text: "log, rank & skill tree basics",
    to: "/howtouseguide",
    icon: "help",
  },
];

function Icon({ name }) {
  if (name === "book") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5.5h6.5A2 2 0 0 1 13.5 7.5V19a2 2 0 0 0-2-1.4H5zM19 5.5h-6.5A2 2 0 0 0 10.5 7.5V19a2 2 0 0 1 2-1.4H19z" />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M10.5 9.5v5l4.5-2.5z" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7h10M8 12h10M8 17h10" />
        <circle cx="5" cy="7" r="0.8" fill="currentColor" />
        <circle cx="5" cy="12" r="0.8" fill="currentColor" />
        <circle cx="5" cy="17" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.8-1.2 1.6V14" />
      <circle cx="12" cy="17" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function Learn() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const guides = useMemo(
    () =>
      GUIDES.filter((guide) => {
        if (!needle) return true;
        return `${guide.title} ${guide.note || ""} ${guide.badge || ""}`.toLowerCase().includes(needle);
      }),
    [needle],
  );
  const cards = CARDS.filter((card) => {
    if (!needle) return true;
    return `${card.title} ${card.text}`.toLowerCase().includes(needle);
  });
  const showGuides = !needle || guides.length > 0 || "training guides".includes(needle);

  return (
    <>
      <Navbar />
      <main className="learn-page" data-screen="learn" data-ready="ready">
        <h1>Learn</h1>
        <label className="learn-search">
          <span className="learn-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6" />
              <path d="M16 16.5 20 20.5" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search guides, skills, terms"
          />
        </label>

        {showGuides && (
          <section className="learn-guides">
            <div className="learn-guides-head">
              <span className="learn-icon">
                <Icon name="book" />
              </span>
              <div>
                <h2>Training guides</h2>
                <p>Training 101 · skill paths · nutrition</p>
              </div>
            </div>
            {guides.map((guide) => (
              <Link key={guide.to} to={guide.to} className="learn-row">
                <span>{guide.title}</span>
                <span className="learn-row-meta">
                  {guide.badge && <span className="learn-badge">{guide.badge}</span>}
                  {guide.note && <span className="learn-note">{guide.note}</span>}
                  <span aria-hidden="true">›</span>
                </span>
              </Link>
            ))}
            {guides.length === 0 && <p className="learn-empty">No guides match that search.</p>}
            <Link to="/training" className="learn-all">
              all training guides
            </Link>
          </section>
        )}

        <div className="learn-cards">
          {cards
            .filter((card) => card.id !== "howto")
            .map((card) => (
              <Link key={card.id} to={card.to} className="learn-card">
                <span className="learn-icon">
                  <Icon name={card.icon} />
                </span>
                <strong>{card.title}</strong>
                <span>{card.text}</span>
              </Link>
            ))}
        </div>
        {cards
          .filter((card) => card.id === "howto")
          .map((card) => (
            <Link key={card.id} to={card.to} className="learn-howto">
              <span className="learn-icon">
                <Icon name={card.icon} />
              </span>
              <span>
                <strong>{card.title}</strong>
                <span>{card.text}</span>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}

        {!showGuides && cards.length === 0 && (
          <p className="learn-empty">Nothing matches that search.</p>
        )}

        <p className="learn-more">
          <Link to="/about">About</Link>
          <Link to="/disclaimer">Disclaimer</Link>
          <Link to="/install">Install</Link>
        </p>
      </main>
    </>
  );
}
