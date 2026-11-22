function formatDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shift(date, days) {
  const next = stripTime(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDay(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function streakLoggedDates(streak, today) {
  const current = Number(streak?.current) || 0;
  const lastLog = streak?.lastLog || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastLog) || current <= 0) return [];

  const todayKey = formatDay(stripTime(today));
  const yesterdayKey = formatDay(shift(today, -1));
  if (lastLog !== todayKey && lastLog !== yesterdayKey) return [];

  const dates = [];
  let cursor = parseDay(lastLog);
  for (let index = 0; index < current; index += 1) {
    dates.push(formatDay(cursor));
    cursor = shift(cursor, -1);
  }
  return dates;
}

export function weekDots(today, streak, restDates = []) {
  const logged = new Set(streakLoggedDates(streak, today));
  const rest = new Set(Array.isArray(restDates) ? restDates : []);
  const todayKey = formatDay(stripTime(today));
  const monday = shift(today, -((stripTime(today).getDay() + 6) % 7));
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return labels.map((label, index) => {
    const key = formatDay(shift(monday, index));
    let state = "missed";
    if (logged.has(key)) {
      const restToday =
        key === todayKey
        && streak?.lastLog === todayKey
        && streak?.lastLogType === "rest";
      const restMark =
        restToday
        || (rest.has(key) && !(key === todayKey && streak?.lastLogType === "workout"));
      state = restMark ? "rest" : "logged";
    }
    else if (key === todayKey) state = "today";
    else if (key > todayKey) state = "future";
    return { label, key, state };
  });
}
