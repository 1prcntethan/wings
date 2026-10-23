import React from 'react';
import { Link } from 'react-router-dom';
import "./tutorial-list.css";
import { skillButtonClass, useMuscleRoles } from "../utilites/musclerolecontext.js";
import { useState } from 'react';
import { skillTitle } from '../utilites/skilltitles';
import { skillDiff } from '../utilites/skilldifficulties';
import { skillTime } from '../utilites/skilltime';
import { skillLinks } from '../utilites/skillLinks';
import { skillImage } from "../utilites/skillImage";
import { incompleteList } from './hp-tutorial-list';



export default function TutorialListL() {

    const [title, setTitle] = useState(null);
    const muscleRoles = useMuscleRoles();

    const [activeRow, setActiveRow] = useState("");

    const rowButtons= [
        ["Bodyweight Squat", "Split Squat", "Assisted Pistol Squat", "Bulgarian Split Squat", "Reverse Nordic Curl"],
        ["Nordic Curl", "Sissy Squat", "Pistol Squat", "Shrimp Squat", "Dragon Pistol Squat"],
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
              legs
              <div className="catergory-blurb">
                Leg skills in calisthenics are mainly squats and their variations. These exercises typically target the quads, hamstrings, glutes, and calves.
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
                  id="legs"
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
                      <Link to = {incompleteList.includes(title) ? "incomplete" : skillLinks.get(title)} className="skill-content--link"> {incompleteList.includes(title) ? "in progress" : skillTitle.get(title)} </Link>
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
                      handleOutsideClick(
                        document.querySelector("#legs")
                      )
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
    )
}