import { skillMuscleRoles } from "./skillmuscleroles.js";

function muscleLabel(name) {
  return name.replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
}

// Targeted muscles are the muscle finder's primary list. Secondary and stabilizer stay off this line.
export const skillMuscle = new Map(
  [...skillMuscleRoles].map(([skill, { primary }]) => [
    skill,
    primary.map(muscleLabel).join(", "),
  ]),
);
