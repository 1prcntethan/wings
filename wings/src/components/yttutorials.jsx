import React from "react";
import "./yttutorials.css";
import "../pages/tutorials/skillpage.css";
import { creatorGuides } from "../utilites/creatorguides";

function embedUrl(url) {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://www.youtube.com/embed/")) return null;
  if (trimmed.includes("?")) return trimmed;
  const amp = trimmed.indexOf("&");
  if (amp === -1) return trimmed;
  return `${trimmed.slice(0, amp)}?${trimmed.slice(amp + 1)}`;
}

export default function YTTutorial({ identifier }) {
  const tutorialURLs = (creatorGuides.get(identifier) || [])
    .map(embedUrl)
    .filter(Boolean);

  if (tutorialURLs.length === 0) return null;

  return (
    <div className="yt-tutorial">
      <div className="skill-section-title">creator tutorials</div>
      <div className="yt-tutorial-content">
        {tutorialURLs.map((url) => (
          <div className="yt-tutorial-item" key={url}>
            <iframe
              className="yt-tutorial-iframe"
              src={url}
              title="creator tutorial"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ))}
      </div>
    </div>
  );
}
