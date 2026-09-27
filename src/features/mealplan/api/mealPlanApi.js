import api from '../../../api/axios'

export function getMenus(slot) {
  return api.get('/api/menus', { params: slot ? { slot } : {} })
}

export function saveMealPlan(plan) {
  return api.post('/api/meal-plans', plan)
}

export function getWeeklyMealPlan(weekStartDate) {
  return api.get('/api/meal-plans/weekly', { params: { weekStartDate } })
}

export function reconfigureMealPlan(plan) {
  return api.post('/api/meal-plans/reconfigure', plan)
}
