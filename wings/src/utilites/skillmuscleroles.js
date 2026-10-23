function roles(primary, secondary = [], stabilizer = []) {
  return { primary, secondary, stabilizer };
}

const plancheHold = roles(
  ["front delt", "upper chest", "serratus"],
  ["triceps", "biceps"],
  ["abs", "back extensors", "glutes", "lats", "lower traps", "wrists"],
);

const planchePush = roles(
  ["front delt", "upper chest", "serratus", "triceps"],
  ["biceps"],
  ["abs", "back extensors", "glutes", "lats", "lower traps", "wrists"],
);

const frontLeverHold = roles(
  ["lats"],
  ["rear delt", "back extensors", "abs", "lower traps"],
  ["triceps", "biceps", "glutes", "forearms"],
);

const frontLeverRow = roles(
  ["lats", "biceps"],
  ["rear delt", "back extensors", "abs", "lower traps"],
  ["triceps", "glutes", "forearms"],
);

const pikePush = roles(
  ["side delt", "triceps"],
  ["front delt", "upper chest"],
  ["abs", "serratus", "upper traps"],
);

const handstand = roles(
  ["side delt", "upper traps"],
  ["front delt", "triceps", "serratus"],
  ["abs", "back extensors", "wrists"],
);

const hspu = roles(
  ["side delt", "triceps"],
  ["front delt", "upper chest", "upper traps"],
  ["abs", "serratus"],
);

const pullUp = roles(
  ["lats", "biceps"],
  ["rear delt", "lower traps"],
  ["abs", "forearms"],
);

const oneArmHandstand = roles(
  ["side delt", "upper traps"],
  ["serratus", "triceps"],
  ["obliques", "abs", "front delt"],
);

export const muscleGroups = [
  { label: "shoulders", options: ["front delt", "side delt", "rear delt"] },
  { label: "chest", options: ["upper chest", "chest"] },
  { label: "arms", options: ["biceps", "triceps", "forearms", "wrists"] },
  {
    label: "back",
    options: ["lats", "upper traps", "lower traps", "back extensors", "serratus"],
  },
  { label: "core", options: ["abs", "obliques", "hip flexors"] },
  {
    label: "legs",
    options: ["quads", "hamstrings", "glutes", "adductors", "calves"],
  },
];

export const skillMuscleRoles = new Map([
  ["Assisted Push-up", roles(["chest", "triceps"], ["front delt", "serratus"], ["abs"])],
  ["Push-up", roles(["chest", "triceps"], ["front delt", "serratus"], ["abs"])],
  ["Dip", roles(["triceps", "chest"], ["front delt"], ["abs", "serratus"])],
  ["Elbow Lever", roles(["biceps", "chest"], ["front delt"], ["abs", "serratus"])],
  [
    "Planche Lean",
    roles(
      ["front delt", "upper chest", "serratus"],
      ["triceps"],
      ["biceps", "abs", "lats"],
    ),
  ],
  [
    "Pseudo Push-up",
    roles(
      ["front delt", "upper chest", "serratus"],
      ["triceps"],
      ["biceps", "abs", "lats"],
    ),
  ],
  ["Tuck Planche", plancheHold],
  ["Tuck Planche PU", planchePush],
  ["Adv. Tuck Planche", plancheHold],
  ["Adv. Tuck Planche PU", planchePush],
  [
    "90 Degree Hold",
    roles(
      ["front delt", "biceps", "upper chest"],
      ["serratus", "triceps"],
      ["abs", "lats", "back extensors"],
    ),
  ],
  [
    "Back Lever",
    roles(
      ["biceps", "front delt", "chest"],
      ["back extensors", "abs"],
      ["lats", "rear delt", "forearms"],
    ),
  ],
  ["Super Adv. Tuck PL", plancheHold],
  ["Straddle Planche", plancheHold],
  ["Straddle Planche PU", planchePush],
  ["Half Lay Planche", plancheHold],
  ["Full Planche", plancheHold],
  ["Full Planche PU", planchePush],
  [
    "One Arm Planche",
    roles(plancheHold.primary, plancheHold.secondary, [
      ...plancheHold.stabilizer,
      "obliques",
    ]),
  ],
  [
    "Maltese",
    roles(
      ["front delt", "upper chest", "biceps"],
      ["lats", "serratus", "triceps"],
      ["abs", "back extensors", "wrists"],
    ),
  ],

  ["Pike Push-up", pikePush],
  ["Crow Pose", roles(["wrists", "front delt", "triceps"], ["chest"], ["abs", "serratus"])],
  ["Assisted Handstand", handstand],
  ["Handstand", handstand],
  ["Elevated Pike PU", pikePush],
  [
    "Bent Arm Press to HS",
    roles(
      ["front delt", "triceps", "abs", "hip flexors"],
      ["side delt", "upper chest"],
      ["serratus", "back extensors"],
    ),
  ],
  [
    "Straight Arm Press to HS",
    roles(
      ["front delt", "upper chest", "abs", "hip flexors"],
      ["serratus", "side delt"],
      ["triceps", "biceps", "back extensors"],
    ),
  ],
  ["Bent Arm Stand", roles(["triceps", "side delt"], ["front delt"], ["abs", "serratus"])],
  ["Assisted HSPU", hspu],
  ["HSPU", hspu],
  ["Deep HSPU", hspu],
  [
    "90 Degree PU",
    roles(
      ["front delt", "side delt", "triceps"],
      ["upper chest", "serratus"],
      ["abs", "biceps"],
    ),
  ],
  ["Assisted OAHS", oneArmHandstand],
  ["OAHS", oneArmHandstand],
  [
    "OA Flag",
    roles(
      ["side delt", "serratus", "obliques"],
      ["upper traps", "triceps"],
      ["abs", "lats"],
    ),
  ],

  [
    "Assisted Inverted Row",
    roles(["lats", "rear delt", "biceps"], ["lower traps"], ["abs", "back extensors"]),
  ],
  [
    "Inverted Row",
    roles(["lats", "rear delt", "biceps"], ["lower traps"], ["abs", "back extensors"]),
  ],
  ["Tuck FL", frontLeverHold],
  ["Tuck FL Row", frontLeverRow],
  [
    "Pike FL",
    roles(
      frontLeverHold.primary,
      [...frontLeverHold.secondary, "hip flexors"],
      frontLeverHold.stabilizer,
    ),
  ],
  [
    "Pike FL Row",
    roles(
      frontLeverRow.primary,
      [...frontLeverRow.secondary, "hip flexors"],
      frontLeverRow.stabilizer,
    ),
  ],
  ["Adv. Tuck FL", frontLeverHold],
  ["Super Adv. Tuck FL", frontLeverHold],
  ["Adv. Tuck FL Row", frontLeverRow],
  ["Straddle FL", frontLeverHold],
  ["Straddle FL Row", frontLeverRow],
  ["Half Lay FL", frontLeverHold],
  ["Full Front Lever", frontLeverHold],
  ["Full FL Row", frontLeverRow],
  [
    "Front Lever Touch",
    roles(["lats", "biceps", "abs"], ["rear delt", "hip flexors"], ["triceps", "forearms"]),
  ],

  ["Deadhang", roles(["forearms"], [], ["lats"])],
  ["Active Hang", roles(["lower traps", "lats"], ["forearms"], ["abs"])],
  ["Assisted Pull-up", pullUp],
  ["Pull-up", pullUp],
  ["Scapula Pull-up", roles(["lower traps", "lats"], ["serratus"], ["forearms", "abs"])],
  ["Chest Pull-up", roles(["lats", "biceps", "rear delt"], ["lower traps"], ["abs", "forearms"])],
  ["Waist Pull-up", roles(["lats", "biceps"], ["rear delt", "triceps", "abs"], ["forearms"])],
  [
    "Muscle-Up",
    roles(["lats", "biceps", "triceps"], ["chest", "front delt"], ["abs", "forearms"]),
  ],
  [
    "Archer Pull-up",
    roles(["lats", "biceps"], ["rear delt"], ["obliques", "forearms", "triceps"]),
  ],
  [
    "Clean Muscle-Up",
    roles(["lats", "biceps", "triceps"], ["chest", "front delt"], ["abs", "forearms"]),
  ],
  [
    "Assisted OAC",
    roles(["biceps", "lats", "forearms"], ["rear delt"], ["obliques", "abs"]),
  ],
  [
    "Assisted OAP",
    roles(["biceps", "lats", "forearms"], ["rear delt"], ["obliques", "abs"]),
  ],
  ["OAC/OAP", roles(["biceps", "lats", "forearms"], ["rear delt"], ["obliques", "abs"])],
  ["Weighted Pull-ups", pullUp],
  ["Butterfly", roles(["lats", "biceps"], ["chest", "abs"], ["forearms"])],

  [
    "Bodyweight Squat",
    roles(["quads", "glutes"], ["hamstrings"], ["abs", "back extensors", "calves"]),
  ],
  ["Split Squat", roles(["quads", "glutes"], ["hamstrings"], ["abs", "adductors"])],
  [
    "Assisted Pistol Squat",
    roles(
      ["quads", "glutes"],
      ["hamstrings", "hip flexors"],
      ["adductors", "calves", "abs"],
    ),
  ],
  ["Bulgarian Split Squat", roles(["quads", "glutes"], ["hamstrings"], ["abs", "adductors"])],
  ["Reverse Nordic Curl", roles(["quads", "hip flexors"], ["abs"], ["calves"])],
  ["Nordic Curl", roles(["hamstrings"], ["glutes"], ["back extensors", "abs", "calves"])],
  ["Sissy Squat", roles(["quads"], ["hip flexors"], ["abs", "calves"])],
  [
    "Pistol Squat",
    roles(
      ["quads", "glutes"],
      ["hamstrings", "hip flexors"],
      ["adductors", "calves", "abs"],
    ),
  ],
  ["Shrimp Squat", roles(["quads"], ["glutes", "hamstrings"], ["hip flexors", "abs"])],
  [
    "Dragon Pistol Squat",
    roles(["quads", "hip flexors"], ["hamstrings", "glutes"], ["abs", "back extensors"]),
  ],

  ["Sit-up", roles(["abs", "hip flexors"], ["obliques"])],
  ["Hollow Body Hold", roles(["abs"], ["hip flexors"], ["quads", "back extensors"])],
  ["L-sit Compression", roles(["hip flexors", "abs"], ["quads"])],
  [
    "L-sit",
    roles(
      ["hip flexors", "abs", "lower traps"],
      ["triceps", "lats", "quads"],
      ["serratus", "front delt"],
    ),
  ],
  [
    "Dragon Flag",
    roles(["abs", "hip flexors"], ["lats", "back extensors"], ["glutes", "forearms"]),
  ],
  ["V-sit", roles(["hip flexors", "abs"], ["quads", "lower traps", "lats"], ["triceps"])],
  ["I-sit", roles(["hip flexors", "abs", "lower traps"], ["lats", "triceps"], ["quads"])],
  [
    "Manna",
    roles(
      ["hip flexors", "abs", "lower traps", "lats"],
      ["triceps", "front delt"],
      ["biceps", "back extensors"],
    ),
  ],
  [
    "Human Flag",
    roles(
      ["lats", "obliques", "side delt"],
      ["serratus", "abs"],
      ["biceps", "triceps", "forearms"],
    ),
  ],
  [
    "Victorian",
    roles(
      ["biceps", "lats", "front delt"],
      ["abs", "upper chest"],
      ["back extensors", "forearms"],
    ),
  ],
]);

export function skillsForMuscle(muscle) {
  const grouped = { primary: [], secondary: [], stabilizer: [] };
  for (const [skill, assignment] of skillMuscleRoles) {
    if (assignment.primary.includes(muscle)) grouped.primary.push(skill);
    else if (assignment.secondary.includes(muscle)) grouped.secondary.push(skill);
    else if (assignment.stabilizer.includes(muscle)) grouped.stabilizer.push(skill);
  }
  return grouped;
}
