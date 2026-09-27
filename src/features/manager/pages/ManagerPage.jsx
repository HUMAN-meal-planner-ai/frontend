import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getManagerDashboard, updateManagerFacility, updateManagerMemberStatus } from '../api/managerApi'
import './ManagerPage.css'

// DB와 API에서는 영문 코드를 사용하고, 실제 화면에서는 사용자가 이해하기 쉬운 한글로 바꿔 표시합니다.
const facilityTypeLabels = { SCHOOL: '학교', COMPANY: '기업', HOSPITAL: '병원', ETC: '기타' }
const roleLabels = { MANAGER: '시설 관리자', USER: '일반 사용자', ADMIN: '최고 관리자' }

/** 서버 응답을 모든 입력 칸에서 안전하게 사용할 수 있는 문자열·숫자 형태로 정리합니다. */
function toFacilityForm(facility) {
  return {
    name: facility.name || '',
    facilityType: facility.facilityType || 'SCHOOL',
    address: facility.address || '',
    contactName: facility.contactName || '',
    defaultMealCount: facility.defaultMealCount ?? 0,
    breakfastMealCount: facility.breakfastMealCount ?? 0,
    lunchMealCount: facility.lunchMealCount ?? 0,
    dinnerMealCount: facility.dinnerMealCount ?? 0,
    targetFoodCost: facility.targetFoodCost ?? 0,
  }
}

/** MANAGER가 자기 시설의 운영 기준과 소속 구성원을 관리하는 전용 화면입니다. */
export default function ManagerPage({ user, onLogout }) {
  // facility은 서버에 저장된 최신 값, form은 사용자가 입력 중인 임시 값을 보관합니다.
  // 두 값을 분리해야 저장 버튼을 누르기 전 입력이 요약 카드에 바로 섞이지 않습니다.
  const [facility, setFacility] = useState(null)
  const [form, setForm] = useState(null)
  const [members, setMembers] = useState([])

  // loading/saving은 중복 요청을 막고 버튼 문구나 로딩 화면을 바꾸는 UI 상태입니다.
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // 어느 구성원을 처리 중인지 ID로 기억해 그 행의 버튼만 비활성화합니다.
  const [memberUpdatingId, setMemberUpdatingId] = useState(null)
  const [memberMessage, setMemberMessage] = useState('')

  useEffect(() => {
    // 빈 배열([])을 두 번째 인자로 사용했기 때문에 관리자 화면이 처음 열릴 때 한 번만 실행됩니다.
    // 화면 이동 뒤 늦게 도착한 응답이 이미 사라진 화면 상태를 변경하지 않도록 취소 표시를 둡니다.
    let cancelled = false
    getManagerDashboard()
      .then(({ facility: loadedFacility, members: loadedMembers }) => {
        if (cancelled) return
        setFacility(loadedFacility)
        setForm(toFacilityForm(loadedFacility))
        setMembers(loadedMembers)
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError.response?.data?.message || '시설 관리 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  /** input의 type에 따라 숫자는 Number로, 나머지는 문자열로 저장합니다. */
  const updateField = ({ target: { name, value, type } }) => {
    setForm((current) => ({ ...current, [name]: type === 'number' ? Number(value) : value }))
    setSaveMessage('')
  }

  /** 수정된 시설 운영 기준을 저장하고 서버가 돌려준 최신 값으로 화면을 다시 맞춥니다. */
  const saveFacility = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSaveMessage('')
    try {
      const updatedFacility = await updateManagerFacility(form)
      setFacility(updatedFacility)
      setForm(toFacilityForm(updatedFacility))
      setSaveMessage('시설 운영 기준을 저장했습니다.')
    } catch (requestError) {
      setSaveMessage(requestError.response?.data?.message || '시설 정보를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  /** 대시보드 요약에 사용할 전체 식수와 활성 구성원 수를 현재 데이터에서 계산합니다. */
  const summary = useMemo(() => ({
    totalMeals: (facility?.breakfastMealCount || 0) + (facility?.lunchMealCount || 0) + (facility?.dinnerMealCount || 0),
    activeMembers: members.filter((member) => member.status === 'ACTIVE').length,
  }), [facility, members])

  /** 일반 사용자의 현재 상태를 반대로 전환하고 성공한 행만 최신 응답으로 교체합니다. */
  const toggleMemberStatus = async (member) => {
    const nextStatus = member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    setMemberUpdatingId(member.userId)
    setMemberMessage('')
    try {
      const updatedMember = await updateManagerMemberStatus(member.userId, nextStatus)
      setMembers((current) => current.map((item) => item.userId === member.userId ? updatedMember : item))
      setMemberMessage(`${updatedMember.name}님의 계정을 ${nextStatus === 'ACTIVE' ? '활성화' : '사용 중지'}했습니다.`)
    } catch (requestError) {
      setMemberMessage(requestError.response?.data?.message || '구성원 상태를 변경하지 못했습니다.')
    } finally {
      setMemberUpdatingId(null)
    }
  }

  // 데이터가 준비되기 전에는 아래 본문이 facility의 빈 값을 읽지 않도록 별도 화면을 먼저 반환합니다.
  if (loading) return <main className="manager-loading"><span />시설 운영 정보를 불러오고 있습니다.</main>
  if (error) return <main className="manager-loading error"><strong>관리 화면을 열 수 없습니다.</strong><p>{error}</p><Link to="/">첫 화면으로</Link></main>

  return (
    <main className="manager-page">
      {/* 왼쪽 고정 메뉴: 같은 페이지의 영역과 기존 식단·예산 페이지로 이동합니다. */}
      <aside className="manager-sidebar">
        <Link className="manager-logo" to="/">MEAL<span>FIT</span></Link>
        <div className="manager-side-title"><small>FACILITY MANAGER</small><strong>{facility.name}</strong><span>{facilityTypeLabels[facility.facilityType] || facility.facilityType}</span></div>
        <nav aria-label="시설 관리자 메뉴">
          <a className="active" href="#overview"><i>01</i>운영 현황</a>
          <a href="#facility-settings"><i>02</i>시설 설정</a>
          <a href="#members"><i>03</i>구성원 조회</a>
          <Link to="/meal-plans"><i>04</i>주간 식단</Link>
          <Link to="/budget"><i>05</i>원가·예산</Link>
        </nav>
        <div className="manager-account"><div><span>{user?.name?.slice(0, 1)}</span><p><strong>{user?.name}</strong><small>시설 관리자</small></p></div><button type="button" onClick={onLogout}>로그아웃</button></div>
      </aside>

      <section className="manager-main">
        {/* 현재 관리 중인 시설 이름과 공개 첫 화면 이동 버튼을 표시하는 상단 바입니다. */}
        <header className="manager-topbar"><div><p>시설 운영 관리</p><h1>{facility.name}</h1></div><Link to="/">서비스 첫 화면</Link></header>
        <div className="manager-content">
          {/* 관리자 이름과 담당 시설을 가장 먼저 보여주는 소개 영역입니다. */}
          <section className="manager-hero" id="overview">
            <div><p>FACILITY OPERATIONS</p><h2>{user?.name}님,<br />오늘의 급식 운영을 준비하세요.</h2><span>식수와 예산 기준을 관리하고 담당 시설의 구성원을 확인할 수 있습니다.</span></div>
            <div className="manager-date-card"><small>현재 관리 시설</small><strong>{facility.name}</strong><span>{facility.address || '주소 미등록'}</span></div>
          </section>

          {/* facility와 members 데이터에서 계산한 핵심 운영 수치를 카드 네 개로 요약합니다. */}
          <section className="manager-summary" aria-label="시설 운영 요약">
            <article><span>기본 식수</span><strong>{facility.defaultMealCount.toLocaleString()}<small>명</small></strong><p>시설 기본 운영 인원</p></article>
            <article><span>하루 끼니 합계</span><strong>{summary.totalMeals.toLocaleString()}<small>명</small></strong><p>아침·점심·저녁 합계</p></article>
            <article><span>목표 식재료비</span><strong>{Number(facility.targetFoodCost).toLocaleString()}<small>원</small></strong><p>1인 1식 기준</p></article>
            <article><span>활성 구성원</span><strong>{summary.activeMembers}<small>명</small></strong><p>현재 시설 연결 계정</p></article>
          </section>

          <section className="manager-work-grid">
            {/*
              제어 컴포넌트 방식의 입력 폼입니다.
              각 input 값은 form 상태와 연결되고 제출할 때만 PATCH API로 서버에 반영됩니다.
            */}
            <form className="facility-settings" id="facility-settings" onSubmit={saveFacility}>
              <div className="manager-section-head"><div><p>FACILITY SETTINGS</p><h2>시설 운영 기준</h2></div><button type="submit" disabled={saving}>{saving ? '저장 중...' : '변경 내용 저장'}</button></div>
              {saveMessage && <p className="manager-save-message" role="status">{saveMessage}</p>}
              <div className="facility-form-grid">
                <label>시설명<input name="name" value={form.name} onChange={updateField} maxLength="100" required /></label>
                <label>시설 유형<select name="facilityType" value={form.facilityType} onChange={updateField}><option value="SCHOOL">학교</option><option value="COMPANY">기업</option><option value="HOSPITAL">병원</option><option value="ETC">기타</option></select></label>
                <label className="wide">주소<input name="address" value={form.address} onChange={updateField} maxLength="255" placeholder="시설 주소를 입력하세요" /></label>
                <label>담당자<input name="contactName" value={form.contactName} onChange={updateField} maxLength="50" placeholder="담당자 이름" /></label>
                <label>기본 식수<input name="defaultMealCount" type="number" min="0" value={form.defaultMealCount} onChange={updateField} required /></label>
                <label>아침 식수<input name="breakfastMealCount" type="number" min="0" value={form.breakfastMealCount} onChange={updateField} /></label>
                <label>점심 식수<input name="lunchMealCount" type="number" min="0" value={form.lunchMealCount} onChange={updateField} /></label>
                <label>저녁 식수<input name="dinnerMealCount" type="number" min="0" value={form.dinnerMealCount} onChange={updateField} /></label>
                <label>1인 목표 식재료비<input name="targetFoodCost" type="number" min="0" step="100" value={form.targetFoodCost} onChange={updateField} required /></label>
              </div>
            </form>

            {/* 기존 프로젝트 업무 페이지로 빠르게 이동하는 바로가기 모음입니다. */}
            <aside className="manager-quick-links"><div className="manager-section-head"><div><p>QUICK ACTIONS</p><h2>운영 업무</h2></div></div><Link to="/meal-plans"><span>주간 식단 관리</span><b>식단 편성하기 →</b></Link><Link to="/menus"><span>메뉴·식재료</span><b>메뉴 검색하기 →</b></Link><Link to="/prices"><span>가격 예측</span><b>위험 품목 보기 →</b></Link><Link to="/budget"><span>원가·예산</span><b>예산 분석하기 →</b></Link></aside>
          </section>

          {/*
            백엔드가 로그인 관리자의 facilityId로 제한한 구성원 목록입니다.
            MANAGER와 ADMIN 행에는 상태 변경 버튼을 만들지 않아 상위 권한을 실수로 중지할 수 없습니다.
          */}
          <section className="manager-members" id="members">
            <div className="manager-section-head"><div><p>FACILITY MEMBERS</p><h2>시설 구성원</h2></div><span>총 {members.length}명</span></div>
            {memberMessage && <p className="manager-member-message" role="status">{memberMessage}</p>}
            <div className="manager-member-table-wrap"><table><thead><tr><th>구성원</th><th>권한</th><th>계정 상태</th><th>관리</th></tr></thead><tbody>{members.map((member) => <tr key={member.userId}><td><div className="manager-member"><span>{member.name.slice(0, 1)}</span><p><strong>{member.name}</strong><small>{member.email}</small></p></div></td><td><b className={`manager-role ${member.role.toLowerCase()}`}>{roleLabels[member.role] || member.role}</b></td><td><em className={member.status.toLowerCase()}><i />{member.status === 'ACTIVE' ? '사용 중' : '사용 중지'}</em></td><td>{member.role === 'USER' ? <button className={`member-status-button ${member.status.toLowerCase()}`} type="button" disabled={memberUpdatingId === member.userId} onClick={() => toggleMemberStatus(member)}>{memberUpdatingId === member.userId ? '처리 중' : member.status === 'ACTIVE' ? '사용 중지' : '다시 활성화'}</button> : <span className="member-status-locked">변경 불가</span>}</td></tr>)}</tbody></table></div>
          </section>
        </div>
      </section>
    </main>
  )
}
