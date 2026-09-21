import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminUsers, updateAdminUserRole } from '../api/adminApi'
import './AdminPage.css'

// 서버가 전달하는 영문 enum 값을 화면용 한글 문구로 바꾸는 표입니다.
// 객체에서 찾을 수 없는 새 값이 오면 아래 JSX에서 원래 값을 대신 표시해 화면이 깨지지 않게 합니다.
const roleLabels = { ADMIN: '최고 관리자', MANAGER: '시설 관리자', USER: '일반 사용자' }
const statusLabels = { ACTIVE: '사용 중', DISABLED: '사용 중지' }
const facilityTypeLabels = { SCHOOL: '학교', COMPANY: '기업', HOSPITAL: '병원', ETC: '기타' }

/** 가입 일시를 한국에서 읽기 쉬운 날짜 형식으로 바꿉니다. 값이 없으면 대시(-)를 표시합니다. */
function formatJoinedAt(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

/** Axios 오류를 관리자에게 이해하기 쉬운 안내 문장으로 변환합니다. */
function getLoadErrorMessage(error) {
  if (error.response?.status === 403) return '관리자 권한이 없어 회원 정보를 조회할 수 없습니다.'
  if (error.request) return '백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.'
  return error.response?.data?.message || '회원 정보를 불러오지 못했습니다.'
}

/**
 * 관리자 회원 현황 화면입니다.
 * 회원의 비밀번호 같은 민감 정보는 다루지 않고 계정·권한·시설 연결 상태만 조회합니다.
 */
export default function AdminPage({ user, onLogout }) {
  // 서버에서 조회한 원본 회원 목록과 사용자가 선택한 검색·필터 조건입니다.
  const [members, setMembers] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  // 비동기 요청 상태를 따로 보관해 로딩, 오류, 정상 목록을 서로 구분해 표시합니다.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // 역할을 변경 중인 한 명의 ID만 저장하여 해당 select만 잠그고 중복 요청을 방지합니다.
  const [roleUpdatingId, setRoleUpdatingId] = useState(null)
  const [roleUpdateMessage, setRoleUpdateMessage] = useState('')

  /** 첫 진입과 다시 시도 버튼 클릭 시 최신 회원 목록을 요청합니다. */
  const loadMembers = async () => {
    setLoading(true)
    setError('')
    try {
      setMembers(await getAdminUsers())
    } catch (requestError) {
      setError(getLoadErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 두 번째 인자가 빈 배열이므로 관리자 페이지가 브라우저에 처음 나타날 때 한 번 실행됩니다.
    // 비동기 응답이 돌아오기 전에 화면을 떠나도 이미 사라진 화면의 상태를 변경하지 않습니다.
    let cancelled = false
    getAdminUsers()
      .then((data) => {
        if (!cancelled) setMembers(data)
      })
      .catch((requestError) => {
        if (!cancelled) setError(getLoadErrorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  /** 검색어나 선택한 권한·상태가 바뀔 때 서버 재요청 없이 현재 목록을 즉시 필터링합니다. */
  const filteredMembers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return members.filter((member) => {
      const matchesKeyword = !keyword || [member.name, member.email, member.facilityName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
      const matchesRole = roleFilter === 'ALL' || member.role === roleFilter
      const matchesStatus = statusFilter === 'ALL' || member.status === statusFilter
      return matchesKeyword && matchesRole && matchesStatus
    })
  }, [members, roleFilter, searchKeyword, statusFilter])

  /** 상단 요약 카드는 전체 회원 목록을 기준으로 계산해 필터와 무관하게 전체 현황을 보여줍니다. */
  const summary = useMemo(() => ({
    total: members.length,
    active: members.filter((member) => member.status === 'ACTIVE').length,
    connected: members.filter((member) => member.facilityId != null).length,
    operators: members.filter((member) => ['ADMIN', 'MANAGER'].includes(member.role)).length,
  }), [members])

  /**
   * 최고 관리자가 선택한 계정을 USER 또는 MANAGER로 변경합니다.
   * 응답으로 받은 회원만 목록에서 교체해 전체 목록을 다시 요청하지 않습니다.
   */
  const handleRoleChange = async (member, nextRole) => {
    if (member.role === nextRole) return
    setRoleUpdatingId(member.userId)
    setRoleUpdateMessage('')
    try {
      const updatedMember = await updateAdminUserRole(member.userId, nextRole)
      setMembers((current) => current.map((item) => item.userId === member.userId ? updatedMember : item))
      setRoleUpdateMessage(`${updatedMember.name}님의 권한을 ${roleLabels[nextRole]}로 변경했습니다.`)
    } catch (requestError) {
      setRoleUpdateMessage(requestError.response?.data?.message || '권한을 변경하지 못했습니다.')
    } finally {
      setRoleUpdatingId(null)
    }
  }

  return (
    <main className="admin-page">
      {/* 전체 서비스 관리 메뉴와 현재 로그인한 ADMIN 정보를 표시하는 왼쪽 영역입니다. */}
      <aside className="admin-sidebar">
        <Link className="admin-logo" to="/">MEAL<span>FIT</span></Link>
        <div className="admin-sidebar-label">ADMIN CONSOLE</div>
        <nav aria-label="관리자 메뉴">
          <Link className="active" to="/admin"><span aria-hidden="true">●</span>회원 관리</Link>
          <Link to="/"><span aria-hidden="true">⌂</span>서비스 첫 화면</Link>
        </nav>
        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">{user?.name?.slice(0, 1) || 'A'}</span>
          <div><strong>{user?.name}</strong><small>{user?.email}</small></div>
          <button type="button" onClick={onLogout}>로그아웃</button>
        </div>
      </aside>

      <section className="admin-main">
        {/* 이 화면이 일반 사용자 화면이 아닌 ADMIN 전용임을 알려주는 상단 영역입니다. */}
        <header className="admin-topbar">
          <div><p>MealFit 운영 관리</p><h1>회원 관리</h1></div>
          <span className="admin-role-chip">ADMIN ONLY</span>
        </header>

        <div className="admin-content">
          {/* 관리자 화면의 목적을 설명하는 소개 배너입니다. */}
          <section className="admin-welcome" aria-labelledby="admin-welcome-title">
            <div><p>MEMBER OVERVIEW</p><h2 id="admin-welcome-title">서비스 가입 현황을 한눈에 확인하세요.</h2><span>회원 권한과 시설 연결 상태를 조회할 수 있습니다.</span></div>
            <div className="admin-welcome-mark" aria-hidden="true"><i /><b>MF</b></div>
          </section>

          {/* 전체 members 배열을 기준으로 계산한 서비스 회원 현황입니다. */}
          <section className="admin-summary-grid" aria-label="회원 요약">
            <article><span>전체 회원</span><strong>{loading ? '-' : summary.total}<small>명</small></strong><p>MealFit에 가입한 계정</p></article>
            <article><span>활성 계정</span><strong>{loading ? '-' : summary.active}<small>명</small></strong><p>현재 로그인 가능한 계정</p></article>
            <article><span>시설 연결</span><strong>{loading ? '-' : summary.connected}<small>명</small></strong><p>운영 시설 등록 완료</p></article>
            <article><span>운영 권한</span><strong>{loading ? '-' : summary.operators}<small>명</small></strong><p>관리자·시설 관리자 합계</p></article>
          </section>

          <section className="member-panel" aria-labelledby="member-list-title">
            <div className="member-panel-heading">
              <div><p>ACCOUNT DIRECTORY</p><h2 id="member-list-title">회원 목록</h2></div>
              <span>최근 가입 순 · 총 {members.length}명</span>
            </div>

            {/* 검색은 이름·이메일·시설명에 적용되고 두 select는 권한과 상태를 각각 제한합니다. */}
            <div className="member-toolbar">
              <label className="member-search"><span aria-hidden="true">⌕</span><input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="이름, 이메일, 시설명 검색" aria-label="회원 검색" /></label>
              <label>권한<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="ALL">전체 권한</option><option value="ADMIN">최고 관리자</option><option value="MANAGER">시설 관리자</option><option value="USER">일반 사용자</option></select></label>
              <label>상태<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">전체 상태</option><option value="ACTIVE">사용 중</option><option value="DISABLED">사용 중지</option></select></label>
            </div>
            {roleUpdateMessage && <p className="role-update-message" role="status">{roleUpdateMessage}</p>}

            {/* 요청 상태에 따라 로딩, 오류, 정상 테이블 중 하나만 화면에 나타납니다. */}
            {loading && <div className="admin-state" role="status"><span className="admin-spinner" />회원 정보를 불러오고 있습니다.</div>}
            {!loading && error && <div className="admin-state error" role="alert"><strong>목록을 표시할 수 없습니다.</strong><p>{error}</p><button type="button" onClick={loadMembers}>다시 시도</button></div>}
            {!loading && !error && (
              <div className="member-table-wrap">
                <table className="member-table">
                  <thead><tr><th>회원</th><th>권한</th><th>계정 상태</th><th>연결 시설</th><th>가입일</th></tr></thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.userId}>
                        <td><div className="member-identity"><span aria-hidden="true">{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div></td>
                        <td>
                          {/* ADMIN은 화면에서 권한을 변경할 수 없고 USER와 MANAGER만 서로 전환할 수 있습니다. */}
                          {member.role === 'ADMIN' ? (
                            <span className="role-badge admin">{roleLabels.ADMIN}</span>
                          ) : (
                            <select
                              className={`role-select ${member.role.toLowerCase()}`}
                              value={member.role}
                              disabled={roleUpdatingId === member.userId}
                              onChange={(event) => handleRoleChange(member, event.target.value)}
                              aria-label={`${member.name} 권한 변경`}
                            >
                              <option value="USER">일반 사용자</option>
                              <option value="MANAGER">시설 관리자</option>
                            </select>
                          )}
                        </td>
                        <td><span className={`status-badge ${member.status.toLowerCase()}`}><i />{statusLabels[member.status] || member.status}</span></td>
                        <td>{member.facilityName ? <div className="facility-cell"><strong>{member.facilityName}</strong><small>{facilityTypeLabels[member.facilityType] || member.facilityType}</small></div> : <span className="empty-facility">시설 미등록</span>}</td>
                        <td className="joined-at">{formatJoinedAt(member.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMembers.length === 0 && <div className="admin-state"><strong>조건에 맞는 회원이 없습니다.</strong><p>검색어나 필터를 변경해 보세요.</p></div>}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
