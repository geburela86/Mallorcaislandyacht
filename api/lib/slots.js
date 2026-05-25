/** Mirrors client `slotKeyFromDur` / `blockKey` (bookings-firestore + App). */
export function slotKeyFromDur(dur) {
  if (dur === "full") return "full";
  if (dur === "half_am") return "am";
  if (dur === "half_pm") return "pm";
  if (dur === "sunset") return "sunset";
  if (dur === "half") return "am";
  return "";
}

export function blockKey(dateStr, slot) {
  if (!dateStr) return "";
  if (slot === "full" || !slot) return dateStr;
  return `${dateStr}|${slot}`;
}
