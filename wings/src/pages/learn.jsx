import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import "./learn.css";

const GUIDES = [
  { title: "Gym vs Calisthenics", to: "/training/gymvscalisthenics", badge: "NEW" },
  { title: "Full-body vs Split", to: "/training/fullbodyvssplit", badge: "NEW" },
  { title: "Rest & Recovery", to: "/training/restandrecovery", badge: "NEW" },
  { title: "General Nutrition", to: "/training/generalnutrition", badge: "NEW" },
  { title: "Beginner Guide", to: "/training/beginnerguide", note: "for beginners" },
];

const CARDS = [
  {
    id: "tutorials",
    title: "tutorials",
    text: "complete skill tutorials",
    to: "/tutorials",
    icon: "play",
  },
  {
    id: "terminology",
    title: "terminology",
    text: "RPE, scap, PPPU & more",
    to: "/terminology",
    icon: "list",
  },
  {
    id: "howto",
    title: "how to use",
    text: "log, rank & skill tree basics",
    to: "/howtouseguide",
    icon: "help",
  },
];

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function Icon({ name }) {
  if (name === "book") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 5.5c3-1.3 6-1.3 9 .7 3-2 6-2 9-.7V19c-3-1.3-6-1.3-9 .7-3-2-6-2-9-.7z" />
        <path d="M12 6.2v13.5" />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m10 9.2 5 2.8-5 2.8z" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h10M4 11h16M4 16h7" />
        <circle cx="17.5" cy="16.5" r="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6M12 17h.01" />
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
        <h1>learn</h1>
        <label className="learn-search">
          <span className="learn-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
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
              <span className="learn-icon learn-icon-hero">
                <Icon name="book" />
              </span>
              <div>
                <h2>training guides</h2>
                <p>Training 101 · skill paths · nutrition</p>
              </div>
            </div>
            {guides.map((guide) => (
              <Link key={guide.to} to={guide.to} className="learn-row">
                <span>{guide.title}</span>
                <span className="learn-row-meta">
                  {guide.badge && <span className="learn-badge">{guide.badge}</span>}
                  {guide.note && <span className="learn-note">{guide.note}</span>}
                  <Chevron />
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
          {cards.map((card) => (
            <Link
              key={card.id}
              to={card.to}
              className={card.id === "howto" ? "learn-card learn-card-wide" : "learn-card"}
            >
              <span className="learn-icon learn-icon-tile">
                <Icon name={card.icon} />
              </span>
              <span className="learn-card-copy">
                <h2>{card.title}</h2>
                <p>{card.text}</p>
              </span>
              {card.id === "howto" && <Chevron />}
            </Link>
          ))}
        </div>

        {!showGuides && cards.length === 0 && (
          <p className="learn-empty">Nothing matches that search.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
