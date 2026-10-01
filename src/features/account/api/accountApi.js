import api from '../../../api/axios'

export async function getMyAccount() {
  const { data } = await api.get('/api/auth/me')
  return data
}

export async function updateMyAccount(profile) {
  const { data } = await api.patch('/api/auth/me', profile)
  return data
}

export async function getMyFacility() {
  const { data } = await api.get('/api/facilities/me')
  return data
}

export async function updateMyFacility(facility) {
  const { data } = await api.patch('/api/facilities/me', facility)
  return data
}

export async function getMyMonthlyBudgets() {
  const { data } = await api.get('/api/facilities/me/monthly-budgets')
  return data
}

export async function updateMyMonthlyBudget(month, budgetAmount) {
  const { data } = await api.put('/api/facilities/me/monthly-budget', { budgetAmount }, {
    params: { month: `${month}-01` },
  })
  return data
}

export async function updateMyExecutedAmount(month, executedAmount) {
  const { data } = await api.put('/api/facilities/me/monthly-budget/executed', { executedAmount }, {
    params: { month: `${month}-01` },
  })
  return data
}