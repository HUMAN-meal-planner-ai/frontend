import api from '../../../api/axios';

/**
 * 전체 메뉴의 원가 및 예산 초과 분석 목록을 조회합니다.
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
 * 특정 메뉴의 현재 원가 계산 결과 및 식재료별 세부 단가 정보를 조회합니다.
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
