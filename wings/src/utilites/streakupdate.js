function shiftDate(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatStreakDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildStreakUpdate(data, type, todayDate) {
  const streak = {
    current: 0,
    longest: 0,
    lastLog: null,
    lastLogType: null,
    ...(data.streak || {}),
  };

  const workoutCounter = Number(data.workout) || 0;
  const restCounter = Number(data.rest) || 0;

  const fitnessDay = todayDate instanceof Date ? todayDate : new Date();
  const today = formatStreakDay(fitnessDay);

  if (streak.lastLog === today) {
    const dayType = streak.lastLogType || "workout";
    if (type === "workout" && dayType === "rest") {
      return {
        streak: {
          current: streak.current,
          longest: streak.longest,
          lastLog: today,
          lastLogType: "workout",
        },
        workout: workoutCounter + 1,
        rest: Math.max(0, restCounter - 1),
      };
    }
    return null;
  }

  const yesterdayStr = formatStreakDay(shiftDate(fitnessDay, -1));

  const newCurrent = streak.lastLog === yesterdayStr ? streak.current + 1 : 1;
  const newLongest = Math.max(streak.longest, newCurrent);

  return {
    streak: {
      current: newCurrent,
      longest: newLongest,
      lastLog: today,
      lastLogType: type,
    },
    workout: type === "workout" ? workoutCounter + 1 : workoutCounter,
    rest: type === "rest" ? restCounter + 1 : restCounter,
  };
}