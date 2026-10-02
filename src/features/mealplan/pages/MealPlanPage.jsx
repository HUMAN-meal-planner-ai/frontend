import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyMonthlyBudgets } from '../../account/api/accountApi'
import MealFitHeader from '../../../layouts/MealFitHeader'
import { getMenus, getWeeklyMealPlan } from '../api/mealPlanApi'
import './MealPlanPage.css'

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const MEAL_TYPE_LABELS = {
  BREAKFAST: '조식',
  LUNCH: '중식',
  DINNER: '석식',
}

const toDateString = (date) => formatLocalDate(date)

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
const getMonthInputValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

function MealPlanPage() {
  const navigate = useNavigate()
  const [displayMonth, setDisplayMonth] = useState(() => {
    const current = new Date()
    return new Date(current.getFullYear(), current.getMonth(), 1)
  })
  const [menus, setMenus] = useState([])
  const [plansByWeek, setPlansByWeek] = useState({})
  const [monthlyBudgets, setMonthlyBudgets] = useState([])
  const [monthlyBudgetError, setMonthlyBudgetError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getMenus()
      .then(({ data }) => setMenus(Array.isArray(data) ? data : []))
      .catch(() => setError('메뉴를 불러오지 못했습니다. 백엔드가 실행 중인지 확인해 주세요.'))
  }, [])

  useEffect(() => {
    let active = true
    getMyMonthlyBudgets()
      .then((budgets) => {
        if (active) setMonthlyBudgets(Array.isArray(budgets) ? budgets : [])
      })
      .catch(() => {
        if (active) setMonthlyBudgetError('월 예산 정보를 불러오지 못했습니다.')
      })
    return () => { active = false }
  }, [])

  const groupedMeals = useMemo(() => {
    const allMeals = Object.values(plansByWeek).flatMap((weeklyPlan) => weeklyPlan?.meals || [])
    return allMeals.reduce((acc, meal) => {
      const key = meal.mealDate
      if (!acc[key]) acc[key] = []
      acc[key].push(meal)
      return acc
    }, {})
  }, [plansByWeek])

  const monthDays = useMemo(() => getMonthCalendar(displayMonth), [displayMonth])

  const monthWeekStarts = useMemo(() => {
    return Array.from({ length: 5 }, (_, weekIndex) => monthDays[weekIndex * 7].date)
  }, [monthDays])

  const selectedMonthBudget = monthlyBudgets.find((budget) => budget.month === getMonthInputValue(displayMonth))

  const selectMonth = (monthDate) => {
    const selectedMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    setDisplayMonth(selectedMonth)
  }

  useEffect(() => {
    let active = true
    Promise.allSettled(monthWeekStarts.map((date) => getWeeklyMealPlan(date)))
      .then((results) => {
        if (!active) return
        const loadedPlans = {}
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            loadedPlans[monthWeekStarts[index]] = result.value.data
          }
        })
        setPlansByWeek(loadedPlans)
      })
    return () => { active = false }
  }, [monthWeekStarts])

  return (
    <main className="meal-plan-page">
      <MealFitHeader />

      <section className="meal-plan-content">
        <div className="meal-plan-heading">
          <div>
            <p className="eyebrow">MONTHLY MEAL PLAN</p>
            <h1>이번 달 식단</h1>
            <p>주간 식단을 확인하고 필요한 메뉴를 직접 편성하세요.</p>
          </div>
          <div className="meal-plan-heading-summary">
            <span className="menu-count">메뉴 {menus.length}개 연결됨</span>
            <div className="meal-plan-monthly-budget" aria-live="polite">
              <span>{displayMonth.getFullYear()}년 {displayMonth.getMonth() + 1}월 저장 예산</span>
              <strong>
                {monthlyBudgetError
                  ? '불러오기 실패'
                  : !selectedMonthBudget
                    ? '입력 가능 기간 외'
                    : selectedMonthBudget.budgetAmount == null
                      ? '저장된 예산 없음'
                      : `${Number(selectedMonthBudget.budgetAmount).toLocaleString('ko-KR')}원`}
              </strong>
            </div>
          </div>
        </div>

        <section className="meal-plan-controls">
          <label>
            선택 월
            <input
              type="month"
              value={getMonthInputValue(displayMonth)}
              onChange={(event) => {
                if (!event.target.value) return
                const [year, month] = event.target.value.split('-').map(Number)
                selectMonth(new Date(year, month - 1, 1))
              }}
            />
          </label>
        </section>

        {error && <p className="form-message error-message" role="alert">{error}</p>}

        <section className="meal-plan-calendar">
          <div className="calendar-header">
            <button className="calendar-month-button" onClick={() => selectMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1))}>← {displayMonth.getMonth() === 0 ? 12 : displayMonth.getMonth()}월 식단</button>
            <h2>{getMonthLabel(displayMonth)}</h2>
            <button className="calendar-month-button" onClick={() => selectMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1))}>{displayMonth.getMonth() + 2 > 12 ? 1 : displayMonth.getMonth() + 2}월 식단 →</button>
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
                      const meals = groupedMeals[date] || []
                          const mealTypes = [...new Set(meals
                            .filter((meal) => meal.menuItems?.length || meal.menuId != null || meal.menuName?.trim())
                            .map((meal) => meal.mealType))]
                            .sort((first, second) => ['BREAKFAST', 'LUNCH', 'DINNER'].indexOf(first) - ['BREAKFAST', 'LUNCH', 'DINNER'].indexOf(second))
                      return (
                        <div className={`month-day-card${isCurrentMonth ? '' : ' outside-month'}`} key={date}>
                          <strong>{day}</strong>
                              {mealTypes.map((mealType) => (
                                <span key={`${date}-${mealType}`}>{MEAL_TYPE_LABELS[mealType] || mealType || '식사'}</span>
                              ))}
                        </div>
                      )
                    })}
                  </div>
                  <button
                    className="week-query-button"
                    onClick={() => navigate(`/meal-plans/weekly?weekStartDate=${rowStart}`)}
                  >
                    주간 조회
                  </button>
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
