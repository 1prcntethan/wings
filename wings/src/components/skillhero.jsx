import React from "react";
import "./skillhero.css";
import { heroBlurb } from "../utilites/heroblurb.js";
import { Drawing } from "../utilites/drawings/drawing.jsx";
import { loadHero } from "../utilites/herosvg.jsx";

export default function SkillHero(skill) {
  return (
    <div className="skill-hero">
      <div className="skill-hero-title">
        {skill.title}
      </div>
      <Drawing load={loadHero} name={skill.identifier} />
      <div className="hero-blurb">
        {heroBlurb.get(skill.identifier)}
      </div>
    </div>
  );
}
