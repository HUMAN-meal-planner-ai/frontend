import axios from 'axios'

const TOKEN_KEY = 'mealfit_access_token'
const USER_KEY = 'mealfit_user'
const AUTH_NOTICE_KEY = 'mealfit_auth_notice'
const SESSION_EXPIRED_NOTICE = '로그인이 만료되었습니다. 다시 로그인해 주세요.'

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

/**
 * 보호 API가 401을 반환하면 브라우저에 남은 오래된 인증정보를 제거합니다.
 * 로그인 API의 401은 비밀번호 불일치 같은 정상적인 로그인 실패이므로 자동 이동 대상에서 제외합니다.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || ''
    const isLoginRequest = requestUrl.endsWith('/api/auth/login')
    const hasStoredToken = Boolean(localStorage.getItem(TOKEN_KEY))

    if (error.response?.status === 401 && !isLoginRequest && hasStoredToken) {
      sessionStorage.setItem(AUTH_NOTICE_KEY, SESSION_EXPIRED_NOTICE)
      clearAuth()

      // React 상태에도 오래된 사용자가 남아 있으므로 전체 페이지 이동으로 앱 상태를 새로 시작합니다.
      if (window.location.pathname !== '/login') window.location.replace('/login')
    }

    return Promise.reject(error)
  },
)

/** 로그인 결과를 새로고침 뒤에도 유지하기 위해 토큰과 공개 사용자 정보를 함께 저장합니다. */
export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** 저장된 사용자 JSON이 손상된 경우 앱 시작을 방해하지 않고 인증정보를 정리합니다. */
export function getStoredUser() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = JSON.parse(localStorage.getItem(USER_KEY))

    if (!token || !user) {
      clearAuth()
      return null
    }

    // 서버 요청 전에도 JWT payload의 exp를 읽어 이미 만료된 세션을 복원하지 않습니다.
    // 서명 검증은 보안상 반드시 서버가 담당하며, 여기서는 화면 상태 정리 목적으로 만료 시각만 확인합니다.
    if (isJwtExpired(token)) {
      sessionStorage.setItem(AUTH_NOTICE_KEY, SESSION_EXPIRED_NOTICE)
      clearAuth()
      return null
    }

    return user
  } catch {
    // 손상되거나 JWT 형식이 아닌 값도 유효한 로그인으로 취급하지 않습니다.
    clearAuth()
    return null
  }
}

/** 로그인 화면이 안내 문구를 한 번 꺼내 읽은 뒤 제거하여 다음 방문에는 반복 표시되지 않게 합니다. */
export function consumeAuthNotice() {
  const notice = sessionStorage.getItem(AUTH_NOTICE_KEY) || ''
  sessionStorage.removeItem(AUTH_NOTICE_KEY)
  return notice
}

/** JWT 방식 로그아웃은 서버 세션이 없으므로 브라우저에 저장한 인증정보를 제거하면 완료됩니다. */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** JWT payload를 해석해 exp가 현재 Unix 시각을 지났는지 확인합니다. */
function isJwtExpired(token) {
  const parts = token.split('.')
  if (parts.length !== 3) return true

  // JWT는 일반 Base64가 아닌 Base64URL을 사용하므로 문자를 변환하고 패딩을 보충합니다.
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const payload = JSON.parse(atob(padded))

  return typeof payload.exp !== 'number' || Date.now() >= payload.exp * 1000
}

export default api
