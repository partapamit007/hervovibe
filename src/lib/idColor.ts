export type IdColor = "GREEN" | "YELLOW" | "RED" | "BLACK";

export function computeIdColor(
  sales: { month: number; year: number; amount: number }[],
  forMonth: number,
  forYear: number,
  joinedAt?: Date | null
): IdColor {
  function monthAmount(m: number, y: number) {
    return sales.filter((s) => s.month === m && s.year === y).reduce((sum, s) => sum + s.amount, 0);
  }

  function toAbsMonth(m: number, y: number) { return y * 12 + m; }

  // Months before the member joined cannot count as zero-sale months
  const joinAbsMonth = joinedAt
    ? toAbsMonth(joinedAt.getMonth() + 1, joinedAt.getFullYear())
    : 0;

  // BLACK: last 3 consecutive months all had zero sales (only months after joining count)
  let zeroStreak = 0;
  for (let i = 1; i <= 3; i++) {
    let m = forMonth - i;
    let y = forYear;
    if (m <= 0) { m += 12; y -= 1; }
    if (joinedAt && toAbsMonth(m, y) < joinAbsMonth) break; // month predates membership
    if (monthAmount(m, y) === 0) zeroStreak++;
    else break;
  }
  if (zeroStreak >= 3) return "BLACK";

  const current = monthAmount(forMonth, forYear);
  if (current >= 1260) return "GREEN";
  if (current > 0)    return "YELLOW";
  return "RED";
}

export const idColorStyles: Record<IdColor, string> = {
  GREEN:  "bg-green-500 text-white",
  YELLOW: "bg-yellow-400 text-yellow-900",
  RED:    "bg-red-500 text-white",
  BLACK:  "bg-gray-900 text-white",
};
