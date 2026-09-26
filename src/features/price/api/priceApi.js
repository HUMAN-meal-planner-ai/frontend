import api from '../../../api/axios'

export async function getWeeklyRiskRankings(limit = 10) {
  const { data } = await api.get('/api/prices/predictions/weekly/risks', {
    params: { limit },
  })
  return data
}

export async function getWeeklyPredictionChart(seriesId, startDate, endDate) {
  const { data } = await api.get(`/api/prices/predictions/weekly/${seriesId}/chart`, {
    params: { startDate, endDate },
  })
  return data
}
