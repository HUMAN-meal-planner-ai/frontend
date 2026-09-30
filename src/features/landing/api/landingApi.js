import api from '../../../api/axios'

export async function getYearOverYearBargains(limit = 4) {
  const { data } = await api.get('/api/prices/year-over-year-bargains', {
    params: { limit },
  })
  return data
}
