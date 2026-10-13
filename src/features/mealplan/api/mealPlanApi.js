import api from '../../../api/axios'

export function getMyFacility() {
  return api.get('/api/facilities/me')
}

export function getMenus(slot) {
  return api.get('/api/menus', { params: slot ? { slot } : {} })
}

export function saveMealPlan(plan) {
  return api.post('/api/meal-plans', plan)
}

export function getWeeklyMealPlan(weekStartDate) {
  return api.get('/api/meal-plans/weekly', { params: { weekStartDate } })
}

// 개별 메뉴 삭제 API 호출 함수
export function deleteMealPlanItem(planId, menuId) {
  return api.delete(`/api/meal-plans/${planId}/items/${menuId}`);
}

// [BUDG-005] 대체 메뉴 식단 반영 (교체) API 호출 함수
export function replaceMealPlanMenu(payload) {
  return api.post('/api/meal-plans/replace-menu', payload);
}
