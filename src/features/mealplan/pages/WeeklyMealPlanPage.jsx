import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getWeeklyMealPlan } from '../api/mealPlanApi'
import './WeeklyMealPlanPage.css'

const MEAL_TYPE_LABELS = {
  BREAKFAST: '조식',
  LUNCH: '중식',
  DINNER: '석식',
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER']

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getMonday(date = new Date()) {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day))
  return formatLocalDate(monday)
}

function addDays(dateString, amount) {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function normalizeMonday(dateString) {
  if (!dateString) return getMonday()
  const date = parseLocalDate(dateString)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return formatLocalDate(date)
}

function formatShortDate(dateString) {
  const date = parseLocalDate(dateString)
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function WeeklyMealPlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedWeekStart = normalizeMonday(searchParams.get('weekStartDate') || getMonday())
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getWeeklyMealPlan(requestedWeekStart)
      .then(({ data }) => {
        if (active) setPlan(data)
      })
      .catch((requestError) => {
        if (active) {
          setPlan(null)
          setError(requestError.response?.data?.message || '해당 주의 식단을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [requestedWeekStart])

  const mealsByDate = useMemo(() => {
    return (plan?.meals || []).reduce((grouped, meal) => {
      if (!grouped[meal.mealDate]) grouped[meal.mealDate] = []
      grouped[meal.mealDate].push(meal)
      return grouped
    }, {})
  }, [plan])

  const dates = Array.from({ length: 7 }, (_, index) => addDays(requestedWeekStart, index))

  return (
    <main className="weekly-meal-page">
      <header className="weekly-meal-header">
        <button type="button" className="text-button" onClick={() => navigate('/meal-plans')}>← 월간 식단</button>
        <strong>MEAL<span>FIT</span></strong>
        <span className="weekly-meal-label">WEEKLY MENU</span>
      </header>

      <section className="weekly-meal-content">
        <div className="weekly-meal-heading">
          <div>
            <p className="eyebrow">WEEKLY MENU</p>
            <h1>주간 메뉴 조회</h1>
            <p>{requestedWeekStart}부터 7일 동안 제공되는 끼니와 메뉴입니다.</p>
          </div>
          <input
            aria-label="주 시작일"
            type="date"
            value={requestedWeekStart}
            onChange={(event) => navigate(`/meal-plans/weekly?weekStartDate=${event.target.value}`)}
          />
        </div>

        {loading && <p className="weekly-meal-state">주간 메뉴를 불러오는 중입니다.</p>}
        {!loading && error && (
          <div className="weekly-meal-state weekly-meal-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => navigate('/meal-plans')}>월간 식단으로 돌아가기</button>
          </div>
        )}
        {!loading && !error && (
          <section className="weekly-meal-board" aria-label="주간 식단 목록">
            <div className="weekly-board-corner">구분</div>
            {dates.map((date) => (
              <div className="weekly-board-date" key={date}>
                <strong>{formatShortDate(date)}</strong>
                <span>{DAY_LABELS[parseLocalDate(date).getDay()]}요일</span>
              </div>
            ))}

            {MEAL_TYPES.map((mealType) => (
              <div className="weekly-board-row" key={mealType}>
                <div className="weekly-board-meal-type">{MEAL_TYPE_LABELS[mealType]}</div>
                {dates.map((date) => {
                  const meals = (mealsByDate[date] || []).filter((meal) => meal.mealType === mealType)
                  return (
                    <div className="weekly-board-cell" key={`${mealType}-${date}`}>
                      {meals.length ? meals.map((meal, index) => (
                        <span key={`${date}-${index}`}>{meal.menuName || '메뉴 정보 없음'}</span>
                      )) : <span className="weekly-empty-meal">-</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}

export default WeeklyMealPlanPage
