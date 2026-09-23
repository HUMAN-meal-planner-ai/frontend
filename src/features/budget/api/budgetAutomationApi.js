import api from '../../../api/axios';

/**
 * [AUTO-002] 예산 초과 위험 재평가 실행 및 경고 알림 자동 생성
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.baseDate] 기준 일자 (YYYY-MM-DD)
 * @param {boolean} [params.autoSaveAlert=true] 경고 알림 자동 저장 여부
 * @returns {Promise<Object>} BudgetReevaluationResultResponse
 */
export async function reevaluateBudget(params = {}) {
  const { facilityId = 1, baseDate, autoSaveAlert = true } = params;
  const { data } = await api.post('/api/automation/budget/reevaluate', {
    facilityId,
    ...(baseDate ? { baseDate } : {}),
    autoSaveAlert,
  });
  return data;
}

/**
 * [AUTO-004] 재평가된 주간 식단 예산 위험 재확인 및 비교
 * @param {Object} payload
 * @param {number|string} [payload.facilityId=1] 시설 ID
 * @param {string} [payload.weekStartDate] 주차 시작일 (YYYY-MM-DD)
 * @param {number} [payload.mealCount=100] 식수 인원
 * @param {Array} [payload.reconfiguredItems] 재구성된 식단 항목 목록
 * @param {boolean} [payload.autoUpdateAlert=true] 위험 해소 시 알림 자동 업데이트 여부
 * @returns {Promise<Object>} WeeklyPlanReverificationResponse
 */
export async function verifyWeeklyPlanBudget(payload = {}) {
  const { data } = await api.post('/api/automation/budget/verify-weekly-plan', payload);
  return data;
}

/**
 * [AUTO-006] 원가 급등·가격 위험·목표단가 초과 변경 검토 메뉴 후보 탐지
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {string} [params.weekStartDate] 주차 시작일 (YYYY-MM-DD)
 * @param {string} [params.targetDate] 예측 기준일자 (YYYY-MM-DD)
 * @param {number} [params.mealCount=100] 식수 인원
 * @param {number} [params.targetCost] 1인당 목표 단가
 * @param {number} [params.surgeThresholdRate=10.0] 급등 기준 변동률(%)
 * @returns {Promise<Object>} MenuReplacementCandidateResponse
 */
export async function getReplacementCandidates(params = {}) {
  const { facilityId = 1, weekStartDate, targetDate, mealCount = 100, targetCost, surgeThresholdRate = 10.0 } = params;
  const { data } = await api.get('/api/automation/budget/replacement-candidates', {
    params: {
      facilityId,
      ...(weekStartDate ? { weekStartDate } : {}),
      ...(targetDate ? { targetDate } : {}),
      mealCount,
      ...(targetCost !== undefined && targetCost !== null ? { targetCost } : {}),
      surgeThresholdRate,
    },
  });
  return data;
}

/**
 * 경고 알림 목록 조회
 * @param {Object} params
 * @param {number|string} [params.facilityId=1] 시설 ID
 * @param {boolean} [params.unreadOnly=false] 미확인 알림 전용 조회 여부
 * @returns {Promise<Array>} BudgetAlertResponse 목록
 */
export async function getBudgetAlerts(params = {}) {
  const { facilityId = 1, unreadOnly = false } = params;
  const { data } = await api.get('/api/automation/budget/alerts', {
    params: {
      facilityId,
      unreadOnly,
    },
  });
  return data;
}

/**
 * 미확인 알림 건수 조회
 * @param {number|string} [facilityId=1] 시설 ID
 * @returns {Promise<Object>} { facilityId, unreadCount }
 */
export async function getUnreadAlertCount(facilityId = 1) {
  const { data } = await api.get('/api/automation/budget/alerts/unread-count', {
    params: { facilityId },
  });
  return data;
}

/**
 * 특정 알림 읽음(확인) 처리
 * @param {number|string} alertId 알림 ID
 * @returns {Promise<Object>}
 */
export async function markAlertAsRead(alertId) {
  const { data } = await api.patch(`/api/automation/budget/alerts/${alertId}/read`);
  return data;
}

/**
 * 시설 전체 미확인 알림 일괄 읽음 처리
 * @param {number|string} [facilityId=1] 시설 ID
 * @returns {Promise<Object>}
 */
export async function markAllAlertsAsRead(facilityId = 1) {
  const { data } = await api.patch('/api/automation/budget/alerts/read-all', null, {
    params: { facilityId },
  });
  return data;
}
