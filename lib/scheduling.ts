export type TimeRange = { startTime: string; endTime: string };

export function isClockTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function addMinutes(startTime: string, durationMinutes: number) {
  const total = timeToMinutes(startTime) + durationMinutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function rangesOverlap(first: TimeRange, second: TimeRange) {
  return first.startTime < second.endTime && first.endTime > second.startTime;
}

export function hasOverlappingRanges(ranges: TimeRange[]) {
  const ordered = [...ranges].sort((first, second) => first.startTime.localeCompare(second.startTime));
  return ordered.some((range, index) => index > 0 && ordered[index - 1].endTime > range.startTime);
}

export function weekdayForDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function todayInFortaleza() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
}

export function buildAvailableSlots(hours: { startTime: string; endTime: string; breakStart: string | null; breakEnd: string | null }, durationMinutes: number, unavailable: TimeRange[]) {
  const slots: string[] = [];
  const workRange = { startTime: hours.startTime, endTime: hours.endTime };
  const breakRange = hours.breakStart && hours.breakEnd ? { startTime: hours.breakStart, endTime: hours.breakEnd } : null;

  for (let minute = timeToMinutes(hours.startTime); minute + durationMinutes <= timeToMinutes(hours.endTime); minute += 30) {
    const startTime = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const range = { startTime, endTime: addMinutes(startTime, durationMinutes) };
    if (!rangesOverlap(range, workRange)) continue;
    if (breakRange && rangesOverlap(range, breakRange)) continue;
    if (unavailable.some((item) => rangesOverlap(range, item))) continue;
    slots.push(startTime);
  }

  return slots;
}
