import axios from 'axios'

const TOKEN_KEY = 'mealfit_access_token'
const USER_KEY = 'mealfit_user'

/** 모든 API 요청이 환경별 백엔드 주소를 공통으로 사용하도록 만든 Axios 인스턴스입니다. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

/**
 * 로그인 후 저장된 JWT를 자동으로 Authorization 헤더에 추가합니다.
 * 회원가입·로그인처럼 토큰이 없는 요청은 헤더를 추가하지 않고 그대로 전송합니다.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** 로그인 결과를 새로고침 뒤에도 유지하기 위해 토큰과 공개 사용자 정보를 함께 저장합니다. */
export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** 저장된 사용자 JSON이 손상된 경우 앱 시작을 방해하지 않고 인증정보를 정리합니다. */
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    clearAuth()
    return null
  }
}

/** JWT 방식 로그아웃은 서버 세션이 없으므로 브라우저에 저장한 인증정보를 제거하면 완료됩니다. */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export default api
