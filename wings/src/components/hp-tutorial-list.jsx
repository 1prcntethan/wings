import React from "react";
import { Link } from "react-router-dom";
import "./tutorial-list.css";
import { skillButtonClass, useMuscleRoles } from "../utilites/musclerolecontext.js";
import { useState } from "react";
import { skillTitle } from "../utilites/skilltitles";
import { skillDiff } from "../utilites/skilldifficulties";
import { skillTime } from "../utilites/skilltime";
import { skillLinks } from "../utilites/skillLinks";
import { skillImage } from "../utilites/skillImage";
import { incompleteList } from "../utilites/incompleteskills.js";

export default function TutorialListHP() {
  const [title, setTitle] = useState(null);
  const muscleRoles = useMuscleRoles();

  const [activeRow, setActiveRow] = useState("");

  const rowButtons = [
    ["Assisted Push-up", "Push-up", "Dip", "Elbow Lever", "Planche Lean"],
    [
      "Pseudo Push-up",
      "Tuck Planche",
      "Tuck Planche PU",
      "Adv. Tuck Planche",
      "Adv. Tuck Planche PU",
    ],
    [
      "90 Degree Hold",
      "Back Lever",
      "Super Adv. Tuck PL",
      "Straddle Planche",
      "Straddle Planche PU",
    ],
    [
      "Half Lay Planche",
      "Full Planche",
      "Full Planche PU",
      "One Arm Planche",
      "Maltese",
    ],
  ];

  const handleRowClick = (index, buttonTitle) => {
    setActiveRow(index);
    setTitle(buttonTitle);
  };

  const handleOutsideClick = (dropRef) => {
    if (dropRef) {
      dropRef.classList.add("hidden");
      setTimeout(() => {
        setActiveRow(null);
      }, 800);
    }
  };

  return (
    <>
      <div className="catergory-title">
        horizontal push
        <div className="catergory-blurb">
          Horizontal push mainly involves push exercises with your body parallel
          to the ground. These exercises typically target the shoulders, arms,
          and chest.
        </div>
      </div>
      <div className="catergory-container">
        {rowButtons.map((row, rowIndex) => (
          <>
            <div key={rowIndex} className="buttons-container">
              {row.map((buttonTitle, buttonIndex) => (
                <button
                  key={buttonIndex}
                  className={skillButtonClass(muscleRoles, buttonTitle)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(rowIndex, buttonTitle);
                  }}
                >
                  {buttonTitle}
                </button>
              ))}
            </div>
            <div>
              {activeRow === rowIndex && (
                <div
                  id="hp"
                  className="skill-content hidden"
                  ref={(drop) => {
                    if (activeRow === rowIndex && drop) {
                      setTimeout(() => {
                        drop.classList.remove("hidden");
                      }, 10);
                    }
                  }}
                >
                  <div className="skill-content--left">
                    <div className="skill-content--title">
                      <Link
                        to={
                          incompleteList.includes(title)
                            ? "incomplete"
                            : skillLinks.get(title)
                        }
                        className="skill-content--link"
                      >
                        {" "}
                        {incompleteList.includes(title)
                          ? "in progress"
                          : skillTitle.get(title)}{" "}
                      </Link>
                    </div>
                    <br />
                    <br />
                    {skillImage.get(title)}
                  </div>
                  <div className="skill-content--right">
                    Skill Difficulty: {skillDiff.get(title)}
                    <br />
                    <br />
                    Time to learn: {skillTime.get(title)}
                  </div>
                  <button
                    className="skill-content--close__button"
                    onClick={() =>
                      handleOutsideClick(document.querySelector("#hp"))
                    }
                  >
                    &#x2715;
                  </button>
                </div>
              )}
            </div>
          </>
        ))}
      </div>
    </>
  );
}
