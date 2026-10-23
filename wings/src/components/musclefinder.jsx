import { useState } from "react";
import Select from "react-select";
import "./musclefinder.css";
import { muscleGroups, skillsForMuscle } from "../utilites/skillmuscleroles.js";
import { MuscleRoleContext } from "../utilites/musclerolecontext.js";

const muscleOptions = muscleGroups.map((group) => ({
  label: group.label,
  options: group.options.map((name) => ({ value: name, label: name })),
}));

const selectStyles = {
  control: (provided, state) => ({
    ...provided,
    width: "100%",
    fontFamily: "Fira Sans",
    backgroundColor: "#333333",
    border: "1px solid rgb(128, 128, 128)",
    borderRadius: 0,
    boxShadow: "none",
    "&:hover": { border: "1px solid rgb(128, 128, 128)" },
    ...(state.isFocused && { borderColor: "#333333", boxShadow: "none" }),
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#641b547a" : "#333333",
    color: "white",
    fontFamily: "Fira Sans",
    fontWeight: 200,
    cursor: "pointer",
  }),
  groupHeading: (provided) => ({
    ...provided,
    color: "#b66da3",
    fontFamily: "Fira Sans",
    fontWeight: 400,
    fontSize: 13,
    textTransform: "lowercase",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "white",
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  input: (provided) => ({
    ...provided,
    color: "white",
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#333333",
    borderRadius: 0,
    boxShadow: "none",
    zIndex: 30,
  }),
  menuPortal: (provided) => ({ ...provided, zIndex: 30 }),
  menuList: (provided) => ({ ...provided, backgroundColor: "#333333", padding: 0 }),
  noOptionsMessage: (provided) => ({
    ...provided,
    fontFamily: "Fira Sans",
    fontWeight: 200,
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "rgb(128, 128, 128)",
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: "rgb(128, 128, 128)",
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: "rgb(128, 128, 128)",
  }),
};

const keyItems = [
  ["primary", "primary"],
  ["secondary", "secondary"],
  ["stabilizer", "stabilizer"],
];

export default function MuscleFinder({ children }) {
  const [muscle, setMuscle] = useState(null);
  const grouped = muscle ? skillsForMuscle(muscle) : null;

  return (
    <MuscleRoleContext.Provider value={grouped}>
      <div className="muscle-finder">
        <div className="muscle-finder__label">or</div>
        <Select
          options={muscleOptions}
          styles={selectStyles}
          value={muscle ? { value: muscle, label: muscle } : null}
          onChange={(option) => setMuscle(option?.value ?? null)}
          placeholder="Choose a muscle"
          isClearable
          menuPortalTarget={document.body}
          menuPosition="fixed"
          classNamePrefix="muscle-select"
        />
        {grouped && (
          <ul className="muscle-finder__key">
            {keyItems.map(([role, label]) => (
              <li key={role}>
                <span className={`muscle-swatch muscle-swatch--${role}`} />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </MuscleRoleContext.Provider>
  );
}
