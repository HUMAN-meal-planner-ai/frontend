import api from '../../../api/axios'

export async function getMyAccount() {
  const { data } = await api.get('/api/auth/me')
  return data
}

export async function getMyFacility() {
  const { data } = await api.get('/api/facilities/me')
  return data
}