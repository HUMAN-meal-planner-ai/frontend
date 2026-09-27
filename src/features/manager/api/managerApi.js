import api from '../../../api/axios'

/**
 * 로그인한 MANAGER가 담당하는 시설 정보와 소속 구성원을 함께 조회합니다.
 * Promise.all은 서로 의존하지 않는 두 요청을 동시에 보내므로 순서대로 요청할 때보다 대기 시간이 짧습니다.
 * 공통 Axios 설정이 localStorage의 JWT를 Authorization 헤더에 자동으로 넣어 줍니다.
 * 반환값은 화면에서 쓰기 쉽도록 { facility, members } 구조로 다시 묶습니다.
 */
export async function getManagerDashboard() {
  const [facilityResponse, membersResponse] = await Promise.all([
    api.get('/api/facilities/me'),
    api.get('/api/manager/members'),
  ])
  return { facility: facilityResponse.data, members: membersResponse.data }
}

/**
 * 현재 MANAGER의 소속 시설 운영 기준을 저장합니다.
 * PATCH는 시설 전체를 새로 생성하지 않고 기존 시설의 변경 가능한 값을 갱신한다는 의미입니다.
 * 백엔드는 토큰의 userId로 시설을 찾기 때문에 프런트에서 facilityId를 보내지 않습니다.
 */
export async function updateManagerFacility(facility) {
  const { data } = await api.patch('/api/facilities/me', facility)
  return data
}

/**
 * 자기 시설 일반 사용자의 로그인 가능 상태를 변경합니다.
 * userId는 변경할 구성원, status는 ACTIVE 또는 DISABLED입니다.
 * 실제로 같은 시설인지와 USER 역할인지 여부는 조작하기 어려운 백엔드에서 다시 검증합니다.
 */
export async function updateManagerMemberStatus(userId, status) {
  const { data } = await api.patch(`/api/manager/members/${userId}/status`, { status })
  return data
}
