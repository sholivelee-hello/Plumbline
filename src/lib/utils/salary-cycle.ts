export interface SalaryCycleInfo {
  salaryDay: number;
  cycleStart: Date;
  cycleEnd: Date;
  totalDays: number;
  elapsedDays: number; // 이번 사이클에서 경과한 일수 (1일째 = 1)
  remainingDays: number;
  progressPercent: number;
}

function clampDay(year: number, month0: number, day: number): Date {
  // month0: 0-based month
  const lastDayOfMonth = new Date(year, month0 + 1, 0).getDate();
  const actualDay = Math.min(day, lastDayOfMonth);
  return new Date(year, month0, actualDay);
}

/**
 * 월급일 기준 현재 예산 사이클 정보 계산.
 * 월급일 당일 0시가 새 사이클 시작.
 */
export function getSalaryCycle(
  salaryDay: number = 25,
  now: Date = new Date()
): SalaryCycleInfo {
  const day = Math.max(1, Math.min(31, Math.round(salaryDay)));
  const year = now.getFullYear();
  const month = now.getMonth();

  const thisMonthSalary = clampDay(year, month, day);
  let cycleStart: Date;
  let cycleEnd: Date;

  if (now.getTime() >= thisMonthSalary.getTime()) {
    cycleStart = thisMonthSalary;
    cycleEnd = clampDay(year, month + 1, day);
  } else {
    cycleStart = clampDay(year, month - 1, day);
    cycleEnd = thisMonthSalary;
  }

  const ms = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / ms);
  const elapsed = Math.floor((now.getTime() - cycleStart.getTime()) / ms) + 1;
  const elapsedDays = Math.max(1, Math.min(totalDays, elapsed));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  return {
    salaryDay: day,
    cycleStart,
    cycleEnd,
    totalDays,
    elapsedDays,
    remainingDays,
    progressPercent,
  };
}

export function formatCycleLabel(info: SalaryCycleInfo): string {
  return `D+${info.elapsedDays} / ${info.totalDays}일`;
}
