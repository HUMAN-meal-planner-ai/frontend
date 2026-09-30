import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyAccount, getMyFacility } from '../api/accountApi'
import './MyPage.css'

const ROLE_LABELS = { ADMIN: '관리자', MANAGER: '시설 관리자', USER: '시설 구성원' }
const FACILITY_TYPE_LABELS = { SCHOOL: '학교', COMPANY: '기업', HOSPITAL: '병원', ETC: '기타' }

function formatNumber(value) {
  if (value == null || value === '') return '-'
  return Number(value).toLocaleString('ko-KR')
}

export default function MyPage({ user, onLogout }) {
  const [account, setAccount] = useState(user)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accountError, setAccountError] = useState('')
  const [facilityError, setFacilityError] = useState('')

  useEffect(() => {
    let active = true
    Promise.allSettled([getMyAccount(), getMyFacility()])
      .then(([accountResult, facilityResult]) => {
        if (!active) return
        if (accountResult.status === 'fulfilled') setAccount(accountResult.value)
        else setAccountError(accountResult.reason.response?.data?.message || '계정 정보를 불러오지 못했습니다.')
        if (facilityResult.status === 'fulfilled') setFacility(facilityResult.value)
        else setFacilityError(facilityResult.reason.response?.data?.message || '등록된 시설 정보가 없습니다.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <main className="my-page">
      <header className="my-page-header">
        <Link to="/" className="my-page-brand">MEAL<span>FIT</span></Link>
        <nav aria-label="마이페이지 이동">
          <Link to="/meal-plans">주간 식단</Link>
          <Link to="/budget">원가·예산</Link>
          <button type="button" onClick={onLogout}>로그아웃</button>
        </nav>
      </header>

      <section className="my-page-content">
        <p className="my-page-eyebrow">ACCOUNT & FACILITY</p>
        <h1>마이페이지</h1>
        <p className="my-page-intro">계정 정보와 시설 가입 시 설정한 운영·예산 기준입니다.</p>

        {loading ? (
          <p className="my-page-state">저장된 정보를 불러오고 있습니다.</p>
        ) : (
          <>
            <section className="my-page-section" aria-labelledby="my-account-heading">
              <div className="my-page-section-heading"><div><span>ACCOUNT</span><h2 id="my-account-heading">계정 정보</h2></div></div>
              {accountError && <p className="my-page-error" role="alert">{accountError}</p>}
              <dl className="my-page-details">
                <div><dt>이름</dt><dd>{account?.name || '-'}</dd></div>
                <div><dt>아이디(이메일)</dt><dd>{account?.email || '-'}</dd></div>
                <div><dt>권한</dt><dd>{ROLE_LABELS[account?.role] || account?.role || '-'}</dd></div>
              </dl>
            </section>

            <section className="my-page-section" aria-labelledby="my-facility-heading">
              <div className="my-page-section-heading"><div><span>FACILITY SETTINGS</span><h2 id="my-facility-heading">시설 정보 및 월 예산</h2></div></div>
              {facilityError ? (
                <div className="my-page-empty">
                  <p className="my-page-error" role="alert">{facilityError}</p>
                  <Link to="/setup">시설 정보 등록하기</Link>
                </div>
              ) : facility ? (
                <>
                  <dl className="my-page-details">
                    <div><dt>시설명</dt><dd>{facility.name || '-'}</dd></div>
                    <div><dt>시설 유형</dt><dd>{FACILITY_TYPE_LABELS[facility.facilityType] || facility.facilityType || '-'}</dd></div>
                    <div><dt>주소</dt><dd>{facility.address || '-'}</dd></div>
                    <div><dt>담당자</dt><dd>{facility.contactName || '-'}</dd></div>
                    <div><dt>기본 식수 인원</dt><dd>{formatNumber(facility.defaultMealCount)}명</dd></div>
                    <div><dt>조식 식수</dt><dd>{formatNumber(facility.breakfastMealCount)}명</dd></div>
                    <div><dt>중식 식수</dt><dd>{formatNumber(facility.lunchMealCount)}명</dd></div>
                    <div><dt>석식 식수</dt><dd>{formatNumber(facility.dinnerMealCount)}명</dd></div>
                    <div><dt>1인 1식 목표 식재료비</dt><dd>{formatNumber(facility.targetFoodCost)}원</dd></div>
                    <div className="my-page-budget-value"><dt>{facility.monthlyBudgetMonth || '이번 달'} 저장 예산</dt><dd>{facility.monthlyBudget == null ? '저장된 예산 없음' : `${formatNumber(facility.monthlyBudget)}원`}</dd></div>
                  </dl>
                  <p className="my-page-budget-formula">월 예산은 해당 월 식단의 총 식수와 1인 목표 식재료비를 기준으로 계산하고, 원가·예산 페이지에서 저장할 수 있습니다.</p>
                  {account?.role === 'MANAGER' && <Link className="my-page-edit-link" to="/manager">시설 설정 변경</Link>}
                </>
              ) : null}
            </section>
          </>
        )}
      </section>
    </main>
  )
}