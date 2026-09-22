import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMenus, getWeeklyMealPlan, reconfigureMealPlan, saveMealPlan } from '../api/mealPlanApi'

function getMonday() {
  const date = new Date()
  const day = date.getDay()
  const difference = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + difference)
  return date.toISOString().slice(0, 10)
} // 함수를 호출한 주에서 월요일 날짜를 YYYY-MM-DD 형식으로 반환합니다.

function MealPlanPage({ onLogout }) {
  const navigate = useNavigate()
  const [weekStartDate, setWeekStartDate] = useState(getMonday)
  const [mealCount, setMealCount] = useState(100)
  const [targetCost, setTargetCost] = useState(2500)
  const [menus, setMenus] = useState([])
  const [plan, setPlan] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMenus()
      .then(({ data }) => setMenus(data))
      .catch(() => setError('메뉴를 불러오지 못했습니다. 백엔드가 실행 중인지 확인해 주세요.'))
  }, [])

  const runRequest = async (request, successMessage) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { data } = await request()
      setPlan(data)
      setMessage(successMessage)
    } catch (requestError) {
      setError(requestError.response?.data?.message || '요청을 처리하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const requestData = { 
    weekStartDate,
    mealCount: Number(mealCount),
    targetCost: Number(targetCost) 
  }

  const reconfigure = () =>
    runRequest(
      () => reconfigureMealPlan(requestData),
      '7일 식단을 재구성했습니다.'
    )
  const loadWeekly = () => runRequest(() => getWeeklyMealPlan(weekStartDate), '저장된 주간 식단을 불러왔습니다.')
  const save = () => {
    if (!plan) return setError('먼저 식단을 재구성하거나 불러와 주세요.')
    const meals = plan.meals.map(({ mealDate, slot, menuId }) => ({ mealDate, slot, menuId }))
    runRequest(() => saveMealPlan({ weekStartDate, mealCount: Number(mealCount), meals }), '식단을 저장했습니다.')
  }

  return (
    <main className="meal-plan-page">
      <header className="meal-plan-header">
        <button className="text-button" onClick={() => navigate('/home')}>← 홈</button>
        <strong>MEAL<span>FIT</span></strong>
        <button className="text-button" onClick={onLogout}>로그아웃</button>
      </header>
      <section className="meal-plan-content">
        <div className="meal-plan-heading"><div><p className="eyebrow">WEEKLY MEAL PLAN</p><h1>이번 주 식단</h1><p>가격 기준을 정하고, 메뉴를 조합한 뒤 저장하세요.</p></div><span className="menu-count">메뉴 {menus.length}개 연결됨</span></div>
        <section className="meal-plan-controls">
          <label>주 시작일<input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} /></label>
          <label>식수 인원<input type="number" 
                                min="1" 
                                value={mealCount} 
                                onChange={(event) => setMealCount(event.target.value)} />
          </label>
          <label>1인 목표 원가<input type="number"
                                    min="1" 
                                    value={targetCost} 
                                    onChange={(event) => setTargetCost(event.target.value)} />
          </label>
          <div className="meal-plan-actions">
            <button className="primary-button" 
                    onClick={reconfigure} 
                    disabled={loading}>
            {loading ? '처리 중...' : '7일 재구성'}
            </button>
            <button className="secondary-button" onClick={loadWeekly} disabled={loading}>주간 식단 조회</button>
            <button className="secondary-button" onClick={save} disabled={loading}>식단 저장</button>
          </div>
        </section>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message">{message}</p>}
        {plan ? (
          <section className="plan-result">

            <div className="plan-summary">
              <span>예상 주간 원가</span>
              <strong>{Number(plan.totalCost).toLocaleString()}원</strong>
              <span>{plan.meals.length}개 식단 항목 · {plan.mealCount}명 기준</span>
            </div>

            <div className="plan-list">
              {plan.meals.map((meal) => (
                <article key={`${meal.mealDate}-${meal.menuId}`}>
                  <time>{meal.mealDate}</time>
                  <div>
                    <strong>{meal.menuName}</strong>
                    <span>{meal.slot} · 메뉴 ID {meal.menuId}</span>
                  </div>
                  <b>{Number(meal.costPerPerson).toLocaleString()}원</b>
                </article>))}
            </div>
          </section> 
        ) : (
        
          <section className="empty-plan">
            <strong>아직 주간 식단이 없습니다.</strong>
            <span>위의 7일 재구성 버튼으로 첫 식단을 만들어 보세요.</span>
          </section>
        )}
      </section>
    </main>
  )
}

export default MealPlanPage
