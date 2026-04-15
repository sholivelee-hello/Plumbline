export function getStreakMilestone(streak: number): {
  label: string;
  emoji: string;
} | null {
  if (streak >= 100) return { label: `${streak}일 연속`, emoji: "👑" };
  if (streak >= 30) return { label: `${streak}일 연속`, emoji: "🔥" };
  if (streak >= 7) return { label: `${streak}일 연속`, emoji: "✨" };
  if (streak >= 3) return { label: `${streak}일 연속`, emoji: "🌱" };
  return null;
}
