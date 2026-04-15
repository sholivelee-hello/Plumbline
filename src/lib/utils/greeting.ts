export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "늦은 밤이에요, 조금 쉬어가요";
  if (hour < 11) return "좋은 아침이에요!";
  if (hour < 14) return "따뜻한 점심 보내세요";
  if (hour < 18) return "좋은 오후에요!";
  if (hour < 22) return "오늘 하루도 수고했어요";
  return "평안한 밤 되세요";
}
