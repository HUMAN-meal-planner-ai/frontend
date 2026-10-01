import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getMyAccount,
  getMyFacility,
  getMyMonthlyBudgets,
  updateMyAccount,
  updateMyFacility,
  updateMyMonthlyBudget,
} from '../api/accountApi'
import './MyPage.css'

const ROLE_LABELS = { ADMIN: '관리자', MANAGER: '시설 관리자', USER: '시설 구성원' }
const FACILITY_TYPE_LABELS = { SCHOOL: '학교', COMPANY: '기업', HOSPITAL: '병원', ETC: '기타' }

function formatNumber(value) {
  if (value == null || value === '') return '-'
  return Number(value).toLocaleString('ko-KR')
}

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

function formatBudgetInput(value) {
  if (value == null || value === '') return ''
  const amount = Number(String(value).replaceAll(',', ''))
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(amount)
    : ''
}

function formatBudgetWhileTyping(value) {
  const normalized = value.replace(/[\s,]/g, '').replace(/[^\d.]/g, '')
  if (!normalized) return ''
  const decimalPosition = normalized.indexOf('.')
  const integerPart = (decimalPosition < 0 ? normalized : normalized.slice(0, decimalPosition)).replace(/\D/g, '')
  const decimalPart = decimalPosition < 0 ? null : normalized.slice(decimalPosition + 1).replace(/\D/g, '').slice(0, 2)
  const formattedInteger = (integerPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimalPart == null ? formattedInteger : `${formattedInteger}.${decimalPart}`
}

function formatBudgetMonth(month) {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월 예산`
}

export default function MyPage({ user, onLogout }) {
  const [account, setAccount] = useState(user)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accountError, setAccountError] = useState('')
  const [facilityError, setFacilityError] = useState('')
  const [accountForm, setAccountForm] = useState({ name: user?.name || '' })
  const [facilityForm, setFacilityForm] = useState(null)
  const [editingAccount, setEditingAccount] = useState(false)
  const [editingFacility, setEditingFacility] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingFacility, setSavingFacility] = useState(false)
  const [accountFeedback, setAccountFeedback] = useState({ error: '', message: '' })
  const [facilityFeedback, setFacilityFeedback] = useState({ error: '', message: '' })
  const [monthlyBudgets, setMonthlyBudgets] = useState([])
  const [budgetInputs, setBudgetInputs] = useState({})
  const [budgetLoadError, setBudgetLoadError] = useState('')
  const [savingBudgetMonth, setSavingBudgetMonth] = useState(null)
  const [budgetFeedback, setBudgetFeedback] = useState({})

  useEffect(() => {
    let active = true
    Promise.allSettled([getMyAccount(), getMyFacility(), getMyMonthlyBudgets()])
      .then(([accountResult, facilityResult, budgetResult]) => {
        if (!active) return
        if (accountResult.status === 'fulfilled') {
          setAccount(accountResult.value)
          setAccountForm({ name: accountResult.value.name || '' })
        } else setAccountError(accountResult.reason.response?.data?.message || '계정 정보를 불러오지 못했습니다.')
        if (facilityResult.status === 'fulfilled') {
          setFacility(facilityResult.value)
          setFacilityForm(toFacilityForm(facilityResult.value))
        } else setFacilityError(facilityResult.reason.response?.data?.message || '등록된 시설 정보가 없습니다.')
        if (budgetResult.status === 'fulfilled') {
          setMonthlyBudgets(budgetResult.value)
          setBudgetInputs(Object.fromEntries(budgetResult.value.map(({ month, budgetAmount }) => [
            month,
            formatBudgetInput(budgetAmount),
          ])))
        } else {
          setBudgetLoadError(budgetResult.reason.response?.data?.message || '월별 예산을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const saveAccount = async () => {
    setSavingAccount(true)
    setAccountFeedback({ error: '', message: '' })
    try {
      const updatedAccount = await updateMyAccount({ name: accountForm.name })
      setAccount(updatedAccount)
      setAccountForm({ name: updatedAccount.name })
      setEditingAccount(false)
      setAccountFeedback({ error: '', message: '계정 정보를 저장했습니다.' })
    } catch (requestError) {
      setAccountFeedback({
        error: requestError.response?.data?.message || '계정 정보를 저장하지 못했습니다.',
        message: '',
      })
    } finally {
      setSavingAccount(false)
    }
  }

  const saveFacility = async () => {
    setSavingFacility(true)
    setFacilityFeedback({ error: '', message: '' })
    try {
      const updatedFacility = await updateMyFacility(facilityForm)
      setFacility(updatedFacility)
      setFacilityForm(toFacilityForm(updatedFacility))
      setEditingFacility(false)
      setFacilityFeedback({ error: '', message: '시설 정보를 저장했습니다.' })
    } catch (requestError) {
      setFacilityFeedback({
        error: requestError.response?.data?.message || '시설 정보를 저장하지 못했습니다.',
        message: '',
      })
    } finally {
      setSavingFacility(false)
    }
  }

  const saveMonthlyBudget = async (month) => {
    const input = budgetInputs[month]
    const amount = Number(String(input ?? '').replaceAll(',', ''))
    if (input == null || input.trim() === '' || !Number.isFinite(amount) || amount < 0) {
      setBudgetFeedback((current) => ({ ...current, [month]: { error: '0원 이상의 예산을 입력해 주세요.' } }))
      return
    }

    setSavingBudgetMonth(month)
    setBudgetFeedback((current) => ({ ...current, [month]: {} }))
    try {
      const savedBudget = await updateMyMonthlyBudget(month, amount)
      setMonthlyBudgets((current) => current.map((budget) => (
        budget.month === month ? savedBudget : budget
      )))
      setBudgetInputs((current) => ({ ...current, [month]: formatBudgetInput(savedBudget.budgetAmount) }))
      setBudgetFeedback((current) => ({
        ...current,
        [month]: { message: `${formatBudgetMonth(month)}을 저장했습니다.` },
      }))
    } catch (requestError) {
      setBudgetFeedback((current) => ({
        ...current,
        [month]: { error: requestError.response?.data?.message || '월 예산을 저장하지 못했습니다.' },
      }))
    } finally {
      setSavingBudgetMonth(null)
    }
  }

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
              <div className="my-page-section-heading">
                <div><span>ACCOUNT</span><h2 id="my-account-heading">계정 정보</h2></div>
                {!editingAccount && (
                  <button type="button" className="my-page-edit-button" onClick={() => setEditingAccount(true)}>수정</button>
                )}
              </div>
              {accountError && <p className="my-page-error" role="alert">{accountError}</p>}
              {editingAccount ? (
                <form className="my-page-edit-form" onSubmit={(event) => { event.preventDefault(); saveAccount() }}>
                  <label>
                    이름
                    <input
                      value={accountForm.name}
                      onChange={(event) => setAccountForm({ name: event.target.value })}
                      maxLength="50"
                      required
                    />
                  </label>
                  <div className="my-page-edit-readonly">
                    <div><span>아이디(이메일)</span><strong>{account?.email || '-'}</strong></div>
                    <div><span>권한</span><strong>{ROLE_LABELS[account?.role] || account?.role || '-'}</strong></div>
                  </div>
                  <div className="my-page-edit-actions">
                    <button type="button" className="my-page-cancel-button" onClick={() => { setAccountForm({ name: account?.name || '' }); setEditingAccount(false) }}>취소</button>
                    <button type="submit" disabled={savingAccount}>{savingAccount ? '저장 중...' : '저장'}</button>
                  </div>
                </form>
              ) : (
                <dl className="my-page-details">
                  <div><dt>이름</dt><dd>{account?.name || '-'}</dd></div>
                  <div><dt>아이디(이메일)</dt><dd>{account?.email || '-'}</dd></div>
                  <div><dt>권한</dt><dd>{ROLE_LABELS[account?.role] || account?.role || '-'}</dd></div>
                </dl>
              )}
              {accountFeedback.error && <p className="my-page-error" role="alert">{accountFeedback.error}</p>}
              {accountFeedback.message && <p className="my-page-save-message" role="status">{accountFeedback.message}</p>}
            </section>

            <section className="my-page-section" aria-labelledby="my-facility-heading">
              <div className="my-page-section-heading">
                <div><span>FACILITY SETTINGS</span><h2 id="my-facility-heading">시설 정보 및 운영 기준</h2></div>
                {facility && account?.role === 'MANAGER' && !editingFacility && (
                  <button type="button" className="my-page-edit-button" onClick={() => setEditingFacility(true)}>수정</button>
                )}
              </div>
              {facilityError ? (
                <div className="my-page-empty">
                  <p className="my-page-error" role="alert">{facilityError}</p>
                  <Link to="/setup">시설 정보 등록하기</Link>
                </div>
              ) : facility ? (
                editingFacility ? (
                  <form className="my-page-edit-form my-page-facility-form" onSubmit={(event) => { event.preventDefault(); saveFacility() }}>
                    <label>시설명
                      <input value={facilityForm?.name || ''} maxLength="100" required onChange={(event) => setFacilityForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label>시설 유형
                      <select value={facilityForm?.facilityType || 'SCHOOL'} onChange={(event) => setFacilityForm((current) => ({ ...current, facilityType: event.target.value }))}>
                        {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>주소
                      <input value={facilityForm?.address || ''} maxLength="255" onChange={(event) => setFacilityForm((current) => ({ ...current, address: event.target.value }))} />
                    </label>
                    <label>담당자
                      <input value={facilityForm?.contactName || ''} maxLength="50" onChange={(event) => setFacilityForm((current) => ({ ...current, contactName: event.target.value }))} />
                    </label>
                    <label>기본 식수 인원
                      <input type="number" min="0" value={facilityForm?.defaultMealCount ?? 0} onChange={(event) => setFacilityForm((current) => ({ ...current, defaultMealCount: Number(event.target.value) }))} />
                    </label>
                    <label>조식 식수
                      <input type="number" min="0" value={facilityForm?.breakfastMealCount ?? 0} onChange={(event) => setFacilityForm((current) => ({ ...current, breakfastMealCount: Number(event.target.value) }))} />
                    </label>
                    <label>중식 식수
                      <input type="number" min="0" value={facilityForm?.lunchMealCount ?? 0} onChange={(event) => setFacilityForm((current) => ({ ...current, lunchMealCount: Number(event.target.value) }))} />
                    </label>
                    <label>석식 식수
                      <input type="number" min="0" value={facilityForm?.dinnerMealCount ?? 0} onChange={(event) => setFacilityForm((current) => ({ ...current, dinnerMealCount: Number(event.target.value) }))} />
                    </label>
                    <label>1인 1식 목표 식재료비
                      <div className="my-page-budget-input-wrap">
                        <input type="number" min="0" step="0.01" value={facilityForm?.targetFoodCost ?? 0} onChange={(event) => setFacilityForm((current) => ({ ...current, targetFoodCost: Number(event.target.value) }))} />
                        <span>원</span>
                      </div>
                    </label>
                    <div className="my-page-edit-actions">
                      <button type="button" className="my-page-cancel-button" onClick={() => { setFacilityForm(toFacilityForm(facility)); setEditingFacility(false) }}>취소</button>
                      <button type="submit" disabled={savingFacility}>{savingFacility ? '저장 중...' : '저장'}</button>
                    </div>
                  </form>
                ) : (
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
                  </dl>
                )
              ) : null}
              {facility && account?.role !== 'MANAGER' && (
                <p className="my-page-budget-formula">시설 운영 정보는 시설 관리자만 수정할 수 있습니다.</p>
              )}
              {facilityFeedback.error && <p className="my-page-error" role="alert">{facilityFeedback.error}</p>}
              {facilityFeedback.message && <p className="my-page-save-message" role="status">{facilityFeedback.message}</p>}
            </section>

            {facility && (
              <section className="my-page-section" aria-labelledby="monthly-budgets-heading">
                <div className="my-page-section-heading">
                  <div><span>MONTHLY BUDGETS</span><h2 id="monthly-budgets-heading">월간 예산</h2></div>
                </div>
                <p className="my-page-budget-formula">이번 달부터 5개월 뒤까지 예산을 입력하고 저장할 수 있습니다.</p>
                {budgetLoadError ? (
                  <p className="my-page-error" role="alert">{budgetLoadError}</p>
                ) : (
                  <div className="my-page-budget-list">
                    {monthlyBudgets.map(({ month }) => (
                      <div className="my-page-budget-row" key={month}>
                        <label htmlFor={`monthly-budget-${month}`}>{formatBudgetMonth(month)}</label>
                        <div className="my-page-budget-controls">
                          <div className="my-page-budget-input-wrap">
                            <input
                              id={`monthly-budget-${month}`}
                              type="text"
                              inputMode="decimal"
                              value={budgetInputs[month] ?? ''}
                              onChange={(event) => setBudgetInputs((current) => ({
                                ...current,
                                [month]: formatBudgetWhileTyping(event.target.value),
                              }))}
                              aria-label={`${formatBudgetMonth(month)} 금액`}
                            />
                            <span>원</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => saveMonthlyBudget(month)}
                            disabled={savingBudgetMonth != null}
                          >
                            {savingBudgetMonth === month ? '저장 중...' : '저장'}
                          </button>
                        </div>
                        {budgetFeedback[month]?.error && (
                          <p className="my-page-budget-feedback my-page-error" role="alert">{budgetFeedback[month].error}</p>
                        )}
                        {budgetFeedback[month]?.message && (
                          <p className="my-page-budget-feedback" role="status">{budgetFeedback[month].message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}