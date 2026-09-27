import api from '../../../api/axios';

/**
 * 1. 전체 메뉴의 현재 원가 및 예산 초과 분석 목록을 조회합니다. (COST-001)
 * @param {Object} params
 * @param {number} [params.mealCount=100] 식수 인원
 * @param {number} [params.targetCost] 1인당 목표 단가
 * @returns {Promise<Array>} MenuCostResponse 목록
 */
export async function getAllMenuCosts(params = {}) {
  const { mealCount = 100, targetCost } = params;
  const { data } = await api.get('/api/cost/menus', {
    params: {
      mealCount,
      ...(targetCost !== undefined && targetCost !== null ? { targetCost } : {}),
    },
  });
  return data;
}

/**
 * 2. 특정 메뉴의 현재 원가 계산 결과 및 식재료별 세부 단가 정보를 조회합니다. (COST-001)
 * @param {number|string} menuId 메뉴 ID
 * @param {Object} params
 * @param {number} [params.mealCount=100] 식수 인원
 * @param {number} [params.targetCost] 1인당 목표 단가
 * @returns {Promise<Object>} MenuCostResponse 단건
 */
export async function getMenuCostDetail(menuId, params = {}) {
  const { mealCount = 100, targetCost } = params;
  const { data } = await api.get(`/api/cost/menus/${menuId}`, {
    params: {
      mealCount,
      ...(targetCost !== undefined && targetCost !== null ? { targetCost } : {}),
    },
  });
  return data;
}

/**
 * 3. 미래 식재료 예측가격 기반 메뉴 미래 원가를 단건 조회합니다. (COST-002, COST-005)
 * @param {number|string} menuId 메뉴 ID
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @param {number} [params.mealCount=100] 식수 인원
 * @param {number} [params.targetCost] 1인당 목표 단가
 * @returns {Promise<Object>} MenuCostResponse 단건
 */
export async function getFutureMenuCost(menuId, params = {}) {
  const { targetDate, mealCount = 100, targetCost } = params;
  const { data } = await api.get(`/api/cost/menus/${menuId}/future`, {
    params: {
      ...(targetDate ? { targetDate } : {}),
      mealCount,
      ...(targetCost !== undefined && targetCost !== null ? { targetCost } : {}),
    },
  });
  return data;
}

/**
 * 4. 전체 메뉴 대상 특정 미래 일자 기준 예측 원가를 일괄 조회합니다. (COST-002)
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @param {number} [params.mealCount=100] 식수 인원
 * @param {number} [params.targetCost] 1인당 목표 단가
 * @returns {Promise<Array>} MenuCostResponse 목록
 */
export async function getAllFutureMenuCosts(params = {}) {
  const { targetDate, mealCount = 100, targetCost } = params;
  const { data } = await api.get('/api/cost/menus/future', {
    params: {
      ...(targetDate ? { targetDate } : {}),
      mealCount,
      ...(targetCost !== undefined && targetCost !== null ? { targetCost } : {}),
    },
  });
  return data;
}

/**
 * 5. 메뉴 현재 원가 vs 미래 예상 원가 비교 및 상승률 분석을 단건 조회합니다. (COST-002 비교 분석)
 * @param {number|string} menuId 메뉴 ID
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @param {number} [params.mealCount=100] 식수 인원
 * @returns {Promise<Object>} MenuCostComparisonResponse 단건
 */
export async function getMenuCostComparison(menuId, params = {}) {
  const { targetDate, mealCount = 100 } = params;
  const { data } = await api.get(`/api/cost/menus/${menuId}/comparison`, {
    params: {
      ...(targetDate ? { targetDate } : {}),
      mealCount,
    },
  });
  return data;
}

/**
 * 6. 전체 메뉴 대상 현재 원가 vs 미래 예상 원가 비교 및 상승률을 일괄 조회합니다.
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @param {number} [params.mealCount=100] 식수 인원
 * @returns {Promise<Array>} MenuCostComparisonResponse 목록
 */
export async function getAllMenuCostComparisons(params = {}) {
  const { targetDate, mealCount = 100 } = params;
  const { data } = await api.get('/api/cost/menus/comparison', {
    params: {
      ...(targetDate ? { targetDate } : {}),
      mealCount,
    },
  });
  return data;
}

/**
 * 7. 메뉴 원가 상승에 가장 크게 기여하는 식재료(Cost Driver) 단건을 조회합니다.
 * @param {number|string} menuId 메뉴 ID
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @returns {Promise<Object>} CostDriverResponse 단건
 */
export async function getMenuCostDrivers(menuId, params = {}) {
  const { targetDate } = params;
  const { data } = await api.get(`/api/cost/menus/${menuId}/drivers`, {
    params: {
      ...(targetDate ? { targetDate } : {}),
    },
  });
  return data;
}

/**
 * 8. 전체 메뉴 대상 원가 상승 기여 식재료(Cost Driver)를 일괄 조회합니다.
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @returns {Promise<Array>} CostDriverResponse 목록
 */
export async function getAllMenuCostDrivers(params = {}) {
  const { targetDate } = params;
  const { data } = await api.get('/api/cost/menus/drivers', {
    params: {
      ...(targetDate ? { targetDate } : {}),
    },
  });
  return data;
}

/**
 * 9. 이번 주·다음 주 예상 비용 및 월 잔여 예산 기준 초과 위험 분석을 조회합니다. (BUDG-002)
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.baseDate] 기준 일자 (YYYY-MM-DD)
 * @returns {Promise<Object>} BudgetRiskResponse
 */
export async function getBudgetRisk(params = {}) {
  const { facilityId = 1, baseDate } = params;
  const { data } = await api.get('/api/cost/budget-risk', {
    params: {
      facilityId,
      ...(baseDate ? { baseDate } : {}),
    },
  });
  return data;
}

/**
 * 10. 선택 주차 7일 식단의 최신·예측 단가 기준 총 예상 식재료비를 계산합니다. (COST-012)
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.startDate] 주 시작일 (YYYY-MM-DD)
 * @returns {Promise<Object>} WeeklyMealPlanCostResponse
 */
export async function getWeeklyMealPlanCost(params = {}) {
  const { facilityId = 1, startDate } = params;
  const { data } = await api.get('/api/cost/weekly-plan-cost', {
    params: {
      facilityId,
      ...(startDate ? { startDate } : {}),
    },
  });
  return data;
}

/**
 * 11. 주별 예상 비용을 합산한 월간 총 예상 식재료비를 계산합니다. (COST-013)
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.yearMonth] 대상 연월 (YYYY-MM)
 * @returns {Promise<Object>} MonthlyMealPlanCostResponse
 */
export async function getMonthlyMealPlanCost(params = {}) {
  const { facilityId = 1, yearMonth } = params;
  const { data } = await api.get('/api/cost/monthly-plan-cost', {
    params: {
      facilityId,
      ...(yearMonth ? { yearMonth } : {}),
    },
  });
  return data;
}

/**
 * 12. 설정된 예산 대비 예상 사용액과 사용률을 분석합니다. (COST-014)
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.yearMonth] 대상 연월 (YYYY-MM)
 * @param {string} [params.baseDate] 기준 일자 (YYYY-MM-DD)
 * @returns {Promise<Object>} BudgetUsageRateResponse
 */
export async function getBudgetUsage(params = {}) {
  const { facilityId = 1, yearMonth, baseDate } = params;
  const { data } = await api.get('/api/cost/budget-usage', {
    params: {
      facilityId,
      ...(yearMonth ? { yearMonth } : {}),
      ...(baseDate ? { baseDate } : {}),
    },
  });
  return data;
}

/**
 * 13. 메뉴 구성 주요 식재료의 가격 위험을 종합한 메뉴 위험도 단건을 조회합니다. (MENU-009)
 * @param {number|string} menuId 메뉴 ID
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @returns {Promise<Object>} MenuRiskResponse
 */
export async function getMenuRisk(menuId, params = {}) {
  const { targetDate } = params;
  const { data } = await api.get(`/api/cost/menus/${menuId}/risk`, {
    params: {
      ...(targetDate ? { targetDate } : {}),
    },
  });
  return data;
}

/**
 * 14. 전체 메뉴 대상 주요 식재료 가격 위험 종합 메뉴 위험도를 일괄 조회합니다. (MENU-009)
 * @param {Object} params
 * @param {string} [params.targetDate] 예측 기준일 (YYYY-MM-DD)
 * @returns {Promise<Array>} MenuRiskResponse 목록
 */
export async function getAllMenuRisks(params = {}) {
  const { targetDate } = params;
  const { data } = await api.get('/api/cost/menus/risk', {
    params: {
      ...(targetDate ? { targetDate } : {}),
    },
  });
  return data;
}

