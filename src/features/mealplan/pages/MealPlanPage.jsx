import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMenus, getWeeklyMealPlan, reconfigureMealPlan, saveMealPlan } from '../api/mealPlanApi'
import './MealPlanPage.css'

function getMonday(date = new Date()) {
  const next = new Date(date)
  const day = next.getDay()
  const difference = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + difference)
  return next.toISOString().slice(0, 10)
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const SLOT_ORDER = ['RICE', 'SOUP', 'MAIN', 'SIDE', 'KIMCHI']

const normalizeSlot = (slot) => {
  if (!slot) return 'MAIN'
  const value = typeof slot === 'string' ? slot.toUpperCase() : slot
  return SLOT_ORDER.includes(value) ? value : 'MAIN'
}

const toDateString = (date) => date.toISOString().slice(0, 10)

const getMonthCalendar = (monthDate) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - startOffset)

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return {
      date: toDateString(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    }
  })
}

const getMonthLabel = (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월 식단`

function MealPlanPage({ onLogout }) {
  const navigate = useNavigate()
  const [weekStartDate, setWeekStartDate] = useState(getMonday)
  const [displayMonth, setDisplayMonth] = useState(() => {
    const current = new Date()
    return new Date(current.getFullYear(), current.getMonth(), 1)
  })
  const [mealCount, setMealCount] = useState(100)
  const [targetCost, setTargetCost] = useState(2500)
  const [menus, setMenus] = useState([])
  const [plan, setPlan] = useState(null)
  const [plansByWeek, setPlansByWeek] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMenus()
      .then(({ data }) => setMenus(Array.isArray(data) ? data : []))
      .catch(() => setError('메뉴를 불러오지 못했습니다. 백엔드가 실행 중인지 확인해 주세요.'))
  }, [])

  useEffect(() => {
    getWeeklyMealPlan(weekStartDate)
      .then(({ data }) => {
        setPlan(data)
        setPlansByWeek((current) => ({ ...current, [weekStartDate]: data }))
      })
      .catch(() => {})
  }, [weekStartDate])

  const menuById = useMemo(() => {
    return menus.reduce((acc, menu) => {
      acc[menu.menuId] = menu
      return acc
    }, {})
  }, [menus])

  const groupedMeals = useMemo(() => {
    const allMeals = Object.values(plansByWeek).flatMap((weeklyPlan) => weeklyPlan?.meals || [])
    return allMeals.reduce((acc, meal) => {
      const key = meal.mealDate
      const slot = normalizeSlot(meal.slot)
      if (!acc[key]) acc[key] = {}
      acc[key][slot] = meal
      return acc
    }, {})
  }, [plansByWeek])

  const monthDays = useMemo(() => getMonthCalendar(displayMonth), [displayMonth])

  const loadWeekly = async (date = weekStartDate) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWeeklyMealPlan(date)
      setWeekStartDate(date)
      setPlan(data)
      setPlansByWeek((current) => ({ ...current, [date]: data }))
      setMessage('저장된 주간 식단을 불러왔습니다.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || '해당 주의 식단을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

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
    targetCost: Number(targetCost),
  }

  const reconfigure = () => runRequest(() => reconfigureMealPlan(requestData), '7일 식단을 재구성했습니다.')
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
        <div className="meal-plan-heading">
          <div>
            <p className="eyebrow">WEEKLY MEAL PLAN</p>
            <h1>이번 주 식단</h1>
            <p>가격 기준을 정하고, 메뉴를 조합한 뒤 저장하세요.</p>
          </div>
          <span className="menu-count">메뉴 {menus.length}개 연결됨</span>
        </div>

        <section className="meal-plan-controls">
          <label>
            주 시작일
            <input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} />
          </label>
          <label>
            식수 인원
            <input type="number" min="1" value={mealCount} onChange={(event) => setMealCount(event.target.value)} />
          </label>
          <label>
            1인 목표 원가
            <input type="number" min="1" value={targetCost} onChange={(event) => setTargetCost(event.target.value)} />
          </label>

          <div className="meal-plan-actions">
            <button className="primary-button" onClick={reconfigure} disabled={loading}>
              {loading ? '처리 중...' : '7일 재구성'}
            </button>
            <button className="secondary-button" onClick={loadWeekly} disabled={loading}>주간 식단 조회</button>
            <button className="secondary-button" onClick={save} disabled={loading}>식단 저장</button>
          </div>
        </section>

        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message">{message}</p>}

        <section className="meal-plan-calendar">
          <div className="calendar-header">
            <button className="calendar-month-button" onClick={() => setDisplayMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>← {displayMonth.getMonth() === 0 ? 12 : displayMonth.getMonth()}월 식단</button>
            <h2>{getMonthLabel(displayMonth)}</h2>
            <button className="calendar-month-button" onClick={() => setDisplayMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>{displayMonth.getMonth() + 2 > 12 ? 1 : displayMonth.getMonth() + 2}월 식단 →</button>
          </div>

          <div className="month-day-labels">
            {DAY_LABELS.map((label) => <span key={label}>{label}</span>)}
          </div>

          <div className="month-calendar-grid">
            {Array.from({ length: 5 }, (_, weekIndex) => {
              const days = monthDays.slice(weekIndex * 7, weekIndex * 7 + 7)
              const rowStart = days[0].date
              return (
                <div className="month-week-row" key={rowStart}>
                  <div className="month-day-cards">
                    {days.map(({ date, day, isCurrentMonth }) => {
                      const meals = groupedMeals[date] || {}
                      const mealNames = SLOT_ORDER.map((slot) => meals[slot]).filter(Boolean).slice(0, 3).map((meal) => menuById[meal.menuId]?.name || meal.menuName)
                      return (
                        <div className={`month-day-card${isCurrentMonth ? '' : ' outside-month'}`} key={date}>
                          <strong>{day}</strong>
                          {mealNames.map((name, index) => <span key={`${date}-${index}`}>{name}</span>)}
                        </div>
                      )
                    })}
                  </div>
                  <button className="week-query-button" onClick={() => loadWeekly(rowStart)} disabled={loading}>주간 조회</button>
                </div>
              )
            })}
          </div>

          <p className="calendar-caption">날짜를 기준으로 주간 식단을 조회하고, 조회된 메뉴는 DB의 저장 데이터를 바탕으로 표시됩니다.</p>
        </section>
      </section>
    </main>
  )
}

export default MealPlanPage
