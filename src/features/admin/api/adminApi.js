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
