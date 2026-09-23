/**
 * [방어 로직] Java Jackson 직렬화 특성:
 * Java의 boolean isExceeded / isIncreased / isRisk 필드는 JSON 직렬화 시
 * "isExceeded" -> "exceeded"로 변환될 수 있으므로 양쪽 키와 실시간 계산을 지원합니다.
 */
export const checkIsExceeded = (item, fallbackTarget) => {
  if (!item) return false;
  if (item.isExceeded !== undefined) return Boolean(item.isExceeded);
  if (item.exceeded !== undefined) return Boolean(item.exceeded);
  if (item.exceededAmount !== undefined && Number(item.exceededAmount) > 0) return true;
  const cost = Number(item.costPerPerson ?? 0);
  const target = Number(item.targetCost ?? fallbackTarget ?? 0);
  return cost > target;
};

export const getExceededAmount = (item, fallbackTarget) => {
  if (!item) return 0;
  if (item.exceededAmount !== undefined && Number(item.exceededAmount) > 0) {
    return Number(item.exceededAmount);
  }
  const cost = Number(item.costPerPerson ?? 0);
  const target = Number(item.targetCost ?? fallbackTarget ?? 0);
  return cost > target ? cost - target : 0;
};

export const checkIsIncreased = (comp) => {
  if (!comp) return false;
  if (comp.isIncreased !== undefined) return Boolean(comp.isIncreased);
  if (comp.increased !== undefined) return Boolean(comp.increased);
  return Number(comp.costDifference ?? 0) > 0;
};

export const checkIsCostIncrease = (driver) => {
  if (!driver) return false;
  if (driver.isCostIncrease !== undefined) return Boolean(driver.isCostIncrease);
  if (driver.costIncrease !== undefined) return Boolean(driver.costIncrease);
  return Number(driver.lineCostDifference ?? 0) > 0;
};

export const checkIsRisk = (risk) => {
  if (!risk) return false;
  if (risk.isRisk !== undefined) return Boolean(risk.isRisk);
  if (risk.risk !== undefined) return Boolean(risk.risk);
  return Number(risk.projectedRemainingBudget ?? 0) < 0;
};

/**
 * 주어진 일자가 속한 주의 월요일(YYYY-MM-DD)을 반환하는 헬퍼 함수
 */
export const getMondayOfWeek = (dateStr) => {
  if (!dateStr) return '2026-09-14';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0: 일요일, 1: 월요일, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const pad = (n) => String(n).padStart(2, '0');
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
};

/**
 * 주차 날짜 범위 계산 헬퍼
 */
export const getWeekRangeLabel = (details) => {
  if (!details || details.length === 0) return '';
  const dates = details.map((d) => d.planDate).sort();
  return `${dates[0]} ~ ${dates[dates.length - 1]}`;
};

/**
 * 금액 포맷팅 (원 단위 / 만원 / 억원 자동 축약)
 */
export const formatCurrency = (val) => {
  if (val === undefined || val === null) return '0원';
  const num = Number(val);
  if (Math.abs(num) >= 100000000) {
    return `${(num / 100000000).toFixed(1)}억원`;
  }
  if (Math.abs(num) >= 10000) {
    const man = Math.round(num / 10000);
    return `${man.toLocaleString()}만원`;
  }
  return `${Math.round(num).toLocaleString()}원`;
};

/**
 * 원 단위 콤마 포맷팅
 */
export const formatWon = (val) => {
  if (val === undefined || val === null) return '0원';
  return `${Math.round(Number(val)).toLocaleString()}원`;
};
