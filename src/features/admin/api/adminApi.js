import api from '../../../api/axios'

/**
 * 관리자 전용 회원 목록을 백엔드에서 조회합니다.
 * JWT는 공통 Axios 요청 처리기가 자동으로 Authorization 헤더에 추가합니다.
 */
export async function getAdminUsers() {
  const { data } = await api.get('/api/admin/users')
  return data
}

/**
 * ADMIN이 선택한 회원을 일반 사용자 또는 시설 관리자로 변경합니다.
 * 요청 본문은 { role: 'USER' } 또는 { role: 'MANAGER' } 형태로 전송됩니다.
 * ADMIN 승격과 최고 관리자 권한 변경은 보안을 위해 백엔드가 거부합니다.
 */
export async function updateAdminUserRole(userId, role) {
  const { data } = await api.patch(`/api/admin/users/${userId}/role`, { role })
  return data
}

/**
 * ADMIN-005 시스템 상태 API를 호출합니다.
 * 백엔드가 Spring 애플리케이션, PostgreSQL/Supabase, KAMIS, FastAPI를 직접 확인한 뒤
 * 전체 상태와 서비스별 상태·응답 시간을 묶어서 반환하므로 프런트는 별도 외부 호출을 하지 않습니다.
 */
export async function getAdminSystemStatus() {
  const { data } = await api.get('/api/admin/system-status')
  return data
}

/**
 * ADMIN-004 가격 데이터 운영 현황을 조회합니다.
 * 출처별 시계열·저장 건수와 최신 기준일을 백엔드에서 집계해 반환합니다.
 */
export async function getAdminPriceDataStatus() {
  // 공통 Axios 인스턴스가 저장된 JWT와 API 기본 주소를 처리하므로 경로만 지정합니다.
  const { data } = await api.get('/api/admin/price-data')
  return data
}

export async function getAdminPriceMappings() {
  const { data } = await api.get('/api/admin/price-data/mappings')
  return data
}

export async function reviewAdminPriceMapping(mappingId, reviewStatus) {
  const { data } = await api.patch(`/api/admin/price-data/mappings/${mappingId}/review`, { reviewStatus })
  return data
}

/**
 * ADMIN-006 오류 로그 목록을 페이지 단위로 조회합니다.
 * resolved를 전달하지 않으면 전체, false이면 미처리, true이면 처리 완료 로그만 반환됩니다.
 * Spring Data Page 응답을 그대로 반환해 content, number, totalPages, last를 화면에서 사용합니다.
 */
export async function getAdminErrorLogs({ resolved, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (resolved !== undefined) params.resolved = resolved
  const { data } = await api.get('/api/admin/error-logs', { params })
  return data
}

/** 목록 행을 선택했을 때 스택 트레이스를 포함한 단건 상세 정보를 조회합니다. */
export async function getAdminErrorLog(logId) {
  const { data } = await api.get(`/api/admin/error-logs/${logId}`)
  return data
}

/**
 * 관리자가 확인을 마친 로그를 처리 완료로 변경합니다.
 * 백엔드는 JWT의 ADMIN 사용자 ID를 resolvedBy로 저장하므로 화면에서 처리자 ID를 보내지 않습니다.
 */
export async function resolveAdminErrorLog(logId) {
  const { data } = await api.patch(`/api/admin/error-logs/${logId}/resolve`)
  return data
}
