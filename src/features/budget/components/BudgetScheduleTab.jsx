import { formatCurrency, formatWon, getWeekRangeLabel } from '../utils/budgetUtils';

export default function BudgetScheduleTab({
  monthlyPlanCost,
  weeklyPlanCost,
  budgetRisk,
}) {
  return (
    <div className="tab-fade-in">
      {/* 1. 월간 식단 식재료비 요약 카드 (COST-013) */}
      {monthlyPlanCost && (
        <div className="monthly-cost-summary-card">
          <div className="monthly-cost-header">
            <div>
              <h4>📅 {monthlyPlanCost.yearMonth} 월간 총 예상 식재료비</h4>
              <span className="monthly-meta-sub">
                총 식수 {monthlyPlanCost.totalMonthlyMealCount?.toLocaleString()}명 · 1인 평균 {formatWon(monthlyPlanCost.averageCostPerPerson)}
              </span>
            </div>
            <div className="monthly-total-highlight">
              총 예상액: <strong>{formatCurrency(monthlyPlanCost.totalMonthlyExpectedCost)}</strong>
              <span className="monthly-budget-rate">
                (예산 대비 <strong>{monthlyPlanCost.budgetUsageRate}%</strong> 소진)
              </span>
            </div>
          </div>

          {/* 주차별 예상 비용 그리드 */}
          <div className="weekly-breakdown-grid">
            {monthlyPlanCost.weeklyCosts?.map((wk) => (
              <div key={wk.weekOfMonth || wk.weekLabel} className="weekly-cost-item">
                <span className="wk-num">{wk.weekLabel}</span>
                <span className="wk-range">{wk.startDate} ~ {wk.endDate}</span>
                <strong className="wk-cost">{formatCurrency(wk.weeklyTotalCost)}</strong>
                <span className="wk-meal-count">
                  식수 {wk.weeklyMealCount?.toLocaleString()}명 (1인 {formatWon(wk.averageCostPerPerson)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. 주간 7일간 요일별 식단 상세 뷰 (COST-012) */}
      {weeklyPlanCost && weeklyPlanCost.dailyCosts && (
        <div className="budget-glass-panel">
          <div className="panel-header-bar">
            <div>
              <h3>📅 주간 7일 일자별 식재료비 분석</h3>
              <p className="panel-desc">
                기간: {weeklyPlanCost.startDate} ~ {weeklyPlanCost.endDate} · 7일간 총 {formatCurrency(weeklyPlanCost.totalExpectedCost)} (1인 평균 {formatWon(weeklyPlanCost.averageCostPerPerson)})
              </p>
            </div>
          </div>

          <div className="weekly-days-grid">
            {weeklyPlanCost.dailyCosts.map((day) => (
              <div key={day.date} className="day-cost-card">
                <div className="day-cost-head">
                  <span className="day-name">{day.dayOfWeek}</span>
                  <span className="day-date">{day.date}</span>
                </div>
                <div className="day-cost-total">
                  <strong>{formatWon(day.dailyTotalCost)}</strong>
                  <span>{day.dailyMealCount}명</span>
                </div>
                <div className="day-meals-list">
                  {day.meals && day.meals.length > 0 ? (
                    day.meals.map((meal, mIdx) => (
                      <div key={meal.planId || mIdx} className="day-meal-chip">
                        <span className="meal-slot-tag">{meal.mealType}</span>
                        <span className="meal-chip-cost">{formatWon(meal.totalMealCost)}</span>
                        <small>({formatWon(meal.costPerPerson)}/인)</small>
                      </div>
                    ))
                  ) : (
                    <span className="meal-empty-text">편성 식단 없음</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 이번 주 / 다음 주 2주간 일자별 식단 상세 (BUDG-002) */}
      {budgetRisk ? (
        <div className="schedule-two-grid">
          <div className="schedule-pane">
            <div className="schedule-pane-head">
              <div>
                <h4>이번 주 편성 식단</h4>
                <span className="pane-range">{getWeekRangeLabel(budgetRisk.thisWeekDetails)}</span>
              </div>
              <span className="pane-cost">{formatCurrency(budgetRisk.thisWeekExpectedCost)}</span>
            </div>
            <div className="schedule-items-list">
              {budgetRisk.thisWeekDetails?.length === 0 ? (
                <p className="table-empty">이번 주 편성된 식단이 없습니다.</p>
              ) : (
                budgetRisk.thisWeekDetails?.map((plan, idx) => (
                  <div key={plan.planId || idx} className="schedule-plan-card">
                    <div className="plan-meta-row">
                      <span className="plan-date-text">{plan.planDate}</span>
                      <span className="plan-slot-badge">{plan.mealType}</span>
                      <span className="plan-count-text">{plan.mealCount}명</span>
                    </div>
                    <div className="plan-main-row">
                      <strong className="plan-menu-title">식단 #{plan.planId} ({plan.mealType})</strong>
                      <div className="plan-cost-group">
                        <span className="plan-price-text">{formatWon(plan.totalDailyCost)}</span>
                        <small className="plan-per-person">1인 {formatWon(plan.costPerPerson)}</small>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="schedule-pane next-pane">
            <div className="schedule-pane-head">
              <div>
                <h4>다음 주 편성 식단 (예측)</h4>
                <span className="pane-range">{getWeekRangeLabel(budgetRisk.nextWeekDetails)}</span>
              </div>
              <span className="pane-cost">{formatCurrency(budgetRisk.nextWeekExpectedCost)}</span>
            </div>
            <div className="schedule-items-list">
              {budgetRisk.nextWeekDetails?.length === 0 ? (
                <p className="table-empty">다음 주 편성된 식단이 없습니다.</p>
              ) : (
                budgetRisk.nextWeekDetails?.map((plan, idx) => (
                  <div key={plan.planId || idx} className="schedule-plan-card">
                    <div className="plan-meta-row">
                      <span className="plan-date-text">{plan.planDate}</span>
                      <span className="plan-slot-badge">{plan.mealType}</span>
                      <span className="plan-count-text">{plan.mealCount}명</span>
                    </div>
                    <div className="plan-main-row">
                      <strong className="plan-menu-title">식단 #{plan.planId} ({plan.mealType})</strong>
                      <div className="plan-cost-group">
                        <span className="plan-price-text">{formatWon(plan.totalDailyCost)}</span>
                        <small className="plan-per-person">1인 {formatWon(plan.costPerPerson)}</small>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="budget-glass-panel">
          <p className="table-empty">편성된 식단 시뮬레이션 데이터를 찾을 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}
