function classifyRaceType(series) {
  const s = series.toLowerCase();

  // PRO SERIES
  if (s.includes("t100")) return "t100";
  if (s.includes("wtcs")) return "wtcs";
  if (s.includes("pro series") && s.includes("70.3")) return "ironman703";
  if (s.includes("pro series") && s.includes("ironman")) return "ironman";

  // BONUS RACES (non-pro)
  if (s.includes("challenge")) return "bonusRace";
  if (s.includes("conti")) return "bonusRace";
  if (s.includes("70.3")) return "bonusRace";     // non-pro 70.3
  if (s.includes("ironman")) return "bonusRace";  // non-pro Ironman

  return "bonusRace"; // fallback
}