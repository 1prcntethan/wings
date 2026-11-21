function exercise(name, sets, efforts, measure = "reps") {
  return {
    name,
    sets: String(sets),
    measure,
    efforts: efforts.map(String),
    reps: efforts.map(String).join(", "),
    notes: "",
  };
}

function dayKey(today, offset) {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export const previewSkills = {
  "push-up": 3,
  dip: 3,
  "pike-push-up": 1,
  handstand: 2,
  "inverted-row": 3,
  "tuck-fl": 3,
  "adv-tuck-fl": 2,
  "pull-up": 3,
  "chest pull-up": 3,
  "muscle-up": 2,
  "bodyweight-squat": 3,
  "sit-up": 3,
  "hollow-body-hold": 2,
};

export function previewWorkoutLogs(today) {
  return [
    {
      id: "previewpull",
      date: dayKey(today, 2),
      category: "pull",
      durationSec: 52 * 60,
      sections: {
        warmup: [],
        primary: [exercise("Pull-up", 4, [8, 8, 8, 8])],
        secondary: [exercise("Tuck FL", 5, [12, 12, 12, 12, 12], "hold")],
        volume: [exercise("Inverted Row", 3, [12, 12, 12])],
      },
    },
    {
      id: "previewpush",
      date: dayKey(today, 4),
      category: "push",
      sections: {
        warmup: [],
        primary: [exercise("Dip", 4, [10, 10, 8, 8])],
        secondary: [exercise("Pike Push-up", 4, [8, 8, 8, 6])],
        volume: [exercise("Push-up", 3, [15, 15, 12])],
      },
    },
    {
      id: "previewlegs",
      date: dayKey(today, 6),
      category: "legs",
      sections: {
        warmup: [],
        primary: [exercise("Split Squat", 4, [10, 10, 10, 10])],
        secondary: [exercise("Bodyweight Squat", 4, [15, 15, 15, 12])],
        volume: [exercise("Hollow Body Hold", 3, [30, 30, 30], "hold")],
      },
    },
  ];
}

export const previewAllTime = {
  workouts: 48,
  sets: 620,
  durationSec: null,
  partialSets: true,
};
