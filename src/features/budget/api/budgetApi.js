import api from '../../../api/axios';

/**
 * [BUDG-003] 주간 식단 비용 기여도 높은 메뉴 식별 및 재구성 변경 검토 후보 조회 (GET)
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.startDate] 주 시작일 (YYYY-MM-DD)
 * @param {string} [params.weekStartDate] 주 시작일 별칭 (YYYY-MM-DD)
 * @param {number} [params.topN=5] 조회할 상위 N개 메뉴 수
 * @param {number} [params.minContributionRate] 최소 비용 기여율 (%)
 * @returns {Promise<Object>} WeeklyHighCostMenuCandidateResponse
 */
export async function getHighCostMenuCandidates(params = {}) {
  const { facilityId = 1, startDate, weekStartDate, topN = 5, minContributionRate } = params;
  const { data } = await api.get('/api/budget/high-cost-menus', {
    params: {
      facilityId,
      ...(startDate ? { startDate } : {}),
      ...(weekStartDate ? { weekStartDate } : {}),
      topN,
      ...(minContributionRate !== undefined && minContributionRate !== null ? { minContributionRate } : {}),
    },
  });
  return data;
}

/**
 * [BUDG-003] 주간 식단 비용 기여도 높은 메뉴 식별 및 재구성 변경 검토 후보 조회 (POST)
 * @param {Object} payload
 * @returns {Promise<Object>} WeeklyHighCostMenuCandidateResponse
 */
export async function queryHighCostMenuCandidates(payload = {}) {
  const { data } = await api.post('/api/budget/high-cost-menus', payload);
  return data;
}

export async function saveMyMonthlyBudget(month) {
  const { data } = await api.post('/api/facilities/me/monthly-budget', null, { params: { month } });
  return data;
}

/**
 * [BUDG-005] 대체 메뉴 적용 전후의 예상 비용 차이와 절감액 종합 분석 (GET)
 * @param {Object} params
 * @param {number|string} params.originalMenuId 기존 메뉴 ID (필수)
 * @param {number|string} [params.replacementMenuId] 대체 메뉴 ID (선택, 미지정 시 동종 카테고리 자동 추천)
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {number|string} [params.planId] 식단 계획 ID
 * @param {string} [params.targetDate] 적용 기준 일자 (YYYY-MM-DD)
 * @param {number} [params.mealCount] 식수 인원
 * @param {boolean} [params.applyToAllOccurrences=false] 주간 식단 내 일괄 교체 시뮬레이션 여부
 * @returns {Promise<Object>} MenuReplacementCostComparisonResponse
 */
export async function getMenuReplacementAnalysis(params = {}) {
  const {
    originalMenuId,
    replacementMenuId,
    facilityId = 1,
    planId,
    targetDate,
    mealCount,
    applyToAllOccurrences = false,
  } = params;

  const { data } = await api.get('/api/budget/replacement-analysis', {
    params: {
      originalMenuId,
      ...(replacementMenuId ? { replacementMenuId } : {}),
      facilityId,
      ...(planId ? { planId } : {}),
      ...(targetDate ? { targetDate } : {}),
      ...(mealCount ? { mealCount } : {}),
      applyToAllOccurrences,
    },
  });
  return data;
}

/**
 * [BUDG-005] 대체 메뉴 적용 전후의 예상 비용 차이와 절감액 종합 분석 (POST)
 * @param {Object} payload
 * @returns {Promise<Object>} MenuReplacementCostComparisonResponse
 */
export async function analyzeMenuReplacement(payload = {}) {
  const { data } = await api.post('/api/budget/replacement-analysis', payload);
  return data;
}

/**
 * [BUDG-005 / COST] 기존 메뉴 vs 대체 메뉴 원가 차이 및 절감액 단건 조회
 * @param {number|string} originalMenuId
 * @param {Object} params
 * @param {number|string} params.replacementMenuId
 * @param {string} [params.targetDate]
 * @param {number} [params.mealCount=1]
 * @returns {Promise<Object>} MenuReplacementDiffResponse
 */
export async function getMenuReplacementDiff(originalMenuId, params = {}) {
  const { replacementMenuId, targetDate, mealCount = 1 } = params;
  const { data } = await api.get(`/api/cost/menus/${originalMenuId}/replacement-diff`, {
    params: {
      replacementMenuId,
      ...(targetDate ? { targetDate } : {}),
      mealCount,
    },
  });
  return data;
}
