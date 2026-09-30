import React, { useState } from 'react';
import { formatCurrency, formatWon, getRiskLabel, getRiskBadgeClass } from '../utils/budgetUtils';

export default function BudgetScheduleTab({
  monthlyPlanCost,
  weeklyPlanCost,
  budgetRisk,
  monthlyBudgetPreview,
  savedMonthlyBudget,
  monthlyBudgetSaving,
  monthlyBudgetMessage,
  monthlyBudgetError,
  onSaveMonthlyBudget,
}) {
  // scheduleView: '1w' (1주간 예산/식단) | '2w' (2주간 예산/식단) | 'monthly' (월간 예산 & 주차별 분석)
  const [scheduleView, setScheduleView] = useState('1w');

  const getWeekRangeLabel = (details) => {
    if (!details || details.length === 0) return '기간 정보 없음';
    const dates = details
      .map((d) => (typeof d.planDate === 'string' ? d.planDate : String(d.planDate)))
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return '기간 정보 없음';
    return `${dates[0]} ~ ${dates[dates.length - 1]}`;
  };

  // DailyPlanCostDetail 리스트를 7일 일자별 카드 구조로 그룹화하는 헬퍼
  const formatDetailsToDailyCards = (details = []) => {
    if (!details || details.length === 0) return [];
    const dayMap = {};
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

    details.forEach((item) => {
      const dStr = typeof item.planDate === 'string' ? item.planDate : String(item.planDate);
      if (!dayMap[dStr]) {
        const dateObj = new Date(dStr + 'T00:00:00');
        dayMap[dStr] = {
          date: dStr,
          dayOfWeek: dayNames[dateObj.getDay()] || '',
          dailyTotalCost: 0,
          dailyMealCount: 0,
          meals: [],
        };
      }
      const cost = Number(item.totalDailyCost || 0);
      const count = Number(item.mealCount || 0);
      dayMap[dStr].dailyTotalCost += cost;
      dayMap[dStr].dailyMealCount += count;
      dayMap[dStr].meals.push({
        planId: item.planId,
        mealType: item.mealType,
        mealCount: count,
        costPerPerson: item.costPerPerson,
        totalMealCost: cost,
        menuNames: item.menuNames || '',
      });
    });

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const nextWeekCards = formatDetailsToDailyCards(budgetRisk?.nextWeekDetails);
  const thisWeekCards = (weeklyPlanCost?.dailyCosts && weeklyPlanCost.dailyCosts.length > 0)
    ? weeklyPlanCost.dailyCosts
    : formatDetailsToDailyCards(budgetRisk?.thisWeekDetails);

  // 1인 1식 평균 계산
  const calcAvgPerPerson = (details = [], totalCost = 0) => {
    const totalMeals = details?.reduce((acc, cur) => acc + (Number(cur.mealCount) || 0), 0) || 0;
    if (!totalMeals || totalMeals === 0) return 0;
    return Math.round(Number(totalCost || 0) / totalMeals);
  };

  const nextWeekAvgPerPerson = calcAvgPerPerson(
    budgetRisk?.nextWeekDetails,
    budgetRisk?.nextWeekExpectedCost
  );

  // 끼니 라벨 변환 헬퍼
  const getMealTypeLabel = (type) => {
    if (!type) return '식사';
    const upper = String(type).toUpperCase();
    if (upper === 'BREAKFAST' || upper === '조식') return '조식';
    if (upper === 'LUNCH' || upper === '중식') return '중식';
    if (upper === 'DINNER' || upper === '석식') return '석식';
    return type;
  };

  return (
    <div className="schedule-tab-content">
      {/* 뷰 컨트롤러 토글 (1주간 예산 / 2주간 예산 / 월간 예산) */}
      <div className="schedule-view-controls">
        <div className="section-title-wrap">
          <h3>📅 식단 및 예산 시뮬레이션 상세</h3>
          <p className="panel-desc">
            기준일(오늘)을 중심으로 1주간(이번 주) 및 2주간(이번 주+다음 주)의 예산 소요액과 일자별 편성 메뉴 및 원가를 조회합니다.
          </p>
        </div>
        <div className="simulation-period-toggle" role="tablist" aria-label="식단 및 예산 시뮬레이션 기간">
          <button
            type="button"
            className={`period-toggle-btn ${scheduleView === '1w' ? 'active' : ''}`}
            onClick={() => setScheduleView('1w')}
          >
            1주간 예산 & 식단 (이번 주)
          </button>
          <button
            type="button"
            className={`period-toggle-btn ${scheduleView === '2w' ? 'active' : ''}`}
            onClick={() => setScheduleView('2w')}
          >
            2주간 예산 & 식단 (다음 주 포함)
          </button>
          <button
            type="button"
            className={`period-toggle-btn ${scheduleView === 'monthly' ? 'active' : ''}`}
            onClick={() => setScheduleView('monthly')}
          >
            월간 예산 & 주차별 분석
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* [CASE 1] 1주간 예산 & 식단 뷰 (scheduleView === '1w')        */}
      {/* ========================================================= */}
      {scheduleView === '1w' && (
        <>
          {/* 1. 1주간 예산 요약 카드 */}
          <div className="budget-glass-panel week-summary-panel">
            <div className="panel-header-bar">
              <div>
                <div className="panel-title-with-badge">
                  <h4>💰 1주간(이번 주) 예산 집행 분석</h4>
                  <span className={`risk-pill-badge ${getRiskBadgeClass(budgetRisk?.oneWeekRiskLevel || budgetRisk?.riskLevel)}`}>
                    {getRiskLabel(budgetRisk?.oneWeekRiskLevel || budgetRisk?.riskLevel)}
                  </span>
                </div>
                <p className="panel-desc">
                  기간: {weeklyPlanCost?.startDate || getWeekRangeLabel(budgetRisk?.thisWeekDetails)} ~ {weeklyPlanCost?.endDate || ''} · 
                  {budgetRisk?.oneWeekWarningMessage || '이번 주 예산 범위 내에서 안정적으로 운영되고 있습니다.'}
                </p>
              </div>
            </div>

            <div className="week-budget-kpis-grid">
              <div className="week-kpi-card highlight-card">
                <span className="kpi-label">1주간 예상 소요액</span>
                <strong className="kpi-value text-primary">
                  {formatCurrency(budgetRisk?.oneWeekExpectedCost || budgetRisk?.thisWeekExpectedCost || weeklyPlanCost?.totalExpectedCost)}
                </strong>
                <span className="kpi-sub">7일간 총 식재료비</span>
              </div>
              <div className="week-kpi-card">
                <span className="kpi-label">1주 소요 후 잔여 예산</span>
                <strong className={`kpi-value ${(budgetRisk?.oneWeekProjectedRemainingBudget ?? 1) < 0 ? 'text-red' : 'text-green'}`}>
                  {formatCurrency(budgetRisk?.oneWeekProjectedRemainingBudget ?? budgetRisk?.monthlyRemainingBudget)}
                </strong>
                <span className="kpi-sub">월 총예산 대비 잔여</span>
              </div>
              <div className="week-kpi-card">
                <span className="kpi-label">1인 1식 평균 단가</span>
                <strong className="kpi-value">
                  {formatWon(weeklyPlanCost?.averageCostPerPerson || calcAvgPerPerson(budgetRisk?.thisWeekDetails, budgetRisk?.thisWeekExpectedCost))}
                </strong>
                <span className="kpi-sub">총 식수 {weeklyPlanCost?.totalMealCount?.toLocaleString() || budgetRisk?.thisWeekDetails?.reduce((a, b) => a + (b.mealCount || 0), 0)}명</span>
              </div>
              <div className="week-kpi-card">
                <span className="kpi-label">예산 초과 위험도</span>
                <strong className={`kpi-value ${(budgetRisk?.oneWeekIsRisk) ? 'text-red' : 'text-green'}`}>
                  {budgetRisk?.oneWeekRiskLevel || 'SAFE'}
                </strong>
                <span className="kpi-sub">
                  {budgetRisk?.oneWeekExceededAmount > 0 ? `초과 예상: ${formatWon(budgetRisk.oneWeekExceededAmount)}` : '초과 없음 (정상)'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. 1주차 7일 일자별 카드 그리드 */}
          <div className="budget-glass-panel">
            <div className="panel-header-bar">
              <div>
                <h4>📊 1주차 (이번 주 7일) 일자별 식재료비 내역</h4>
                <p className="panel-desc">
                  기간: {weeklyPlanCost?.startDate || getWeekRangeLabel(budgetRisk?.thisWeekDetails)} ~ {weeklyPlanCost?.endDate || ''}
                </p>
              </div>
            </div>

            <div className="weekly-days-grid">
              {thisWeekCards && thisWeekCards.length > 0 ? (
                thisWeekCards.map((day) => (
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
                            <div className="meal-chip-top">
                              <span className="meal-slot-tag">{getMealTypeLabel(meal.mealType)}</span>
                              <span className="meal-chip-cost">{formatWon(meal.totalMealCost)}</span>
                            </div>
                            {meal.menuNames && (
                              <div className="meal-chip-menus" title={meal.menuNames}>
                                🍚 {meal.menuNames}
                              </div>
                            )}
                            <small className="meal-chip-sub">1인 {formatWon(meal.costPerPerson)} · {meal.mealCount}명</small>
                          </div>
                        ))
                      ) : (
                        <span className="meal-empty-text">편성 식단 없음</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="table-empty">이번 주 편성된 식단이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 3. 1주차 일자별 상세 식단 편성표 (예산 내역 바로 아래 배치) */}
          <div className="budget-glass-panel meal-details-table-panel">
            <div className="panel-header-bar">
              <div>
                <h4>📋 1주차 (이번 주) 일자별 상세 식단 편성표</h4>
                <p className="panel-desc">각 끼니별로 배정된 구체적인 메뉴 구성과 식재료 원가 내역입니다.</p>
              </div>
            </div>

            <div className="detailed-meal-plans-list">
              {thisWeekCards && thisWeekCards.some((d) => d.meals && d.meals.length > 0) ? (
                thisWeekCards.map((day) =>
                  day.meals && day.meals.length > 0 ? (
                    <div key={day.date} className="day-meal-group-card">
                      <div className="day-group-header">
                        <span className="day-group-title">{day.date} ({day.dayOfWeek})</span>
                        <span className="day-group-total">일 합계: <strong>{formatWon(day.dailyTotalCost)}</strong> ({day.dailyMealCount}명)</span>
                      </div>
                      <div className="day-group-items">
                        {day.meals.map((m, idx) => (
                          <div key={m.planId || idx} className="meal-row-card">
                            <div className="meal-row-left">
                              <span className="meal-row-badge">{getMealTypeLabel(m.mealType)}</span>
                              <div className="meal-row-info">
                                <strong className="meal-row-menus">{m.menuNames || '편성 메뉴 없음'}</strong>
                                <span className="meal-row-meta">식수: {m.mealCount}명 · 1인분 단가: {formatWon(m.costPerPerson)}</span>
                              </div>
                            </div>
                            <div className="meal-row-right">
                              <span className="meal-row-cost">{formatWon(m.totalMealCost)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )
              ) : (
                <p className="table-empty">편성된 상세 식단이 없습니다.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* [CASE 2] 2주간 예산 & 식단 뷰 (scheduleView === '2w')        */}
      {/* ========================================================= */}
      {scheduleView === '2w' && (
        <>
          {/* 1. 2주간 종합 예산 요약 카드 */}
          <div className="budget-glass-panel week-summary-panel two-week-panel">
            <div className="panel-header-bar">
              <div>
                <div className="panel-title-with-badge">
                  <h4>💰 2주간(이번 주 + 다음 주) 종합 예산 분석</h4>
                  <span className={`risk-pill-badge ${getRiskBadgeClass(budgetRisk?.twoWeeksRiskLevel || budgetRisk?.riskLevel)}`}>
                    {getRiskLabel(budgetRisk?.twoWeeksRiskLevel || budgetRisk?.riskLevel)}
                  </span>
                </div>
                <p className="panel-desc">
                  {budgetRisk?.twoWeeksWarningMessage || '향후 2주간 식단 운영에 따른 종합 예산 지표입니다.'}
                </p>
              </div>
            </div>

            <div className="week-budget-kpis-grid two-week-kpis">
              <div className="week-kpi-card highlight-card">
                <span className="kpi-label">2주간 총 예상 소요액</span>
                <strong className="kpi-value text-primary">
                  {formatCurrency(budgetRisk?.twoWeeksTotalExpectedCost)}
                </strong>
                <span className="kpi-sub">1주차 + 2주차 합계</span>
              </div>
              <div className="week-kpi-card">
                <span className="kpi-label">1주차 소요 / 2주차 예측</span>
                <strong className="kpi-value">
                  {formatWon(budgetRisk?.thisWeekExpectedCost)} / {formatWon(budgetRisk?.nextWeekExpectedCost)}
                </strong>
                <span className="kpi-sub">주차별 예상 소요액</span>
              </div>
              <div className="week-kpi-card">
                <span className="kpi-label">2주 소요 후 잔여 예산</span>
                <strong className={`kpi-value ${(budgetRisk?.twoWeeksProjectedRemainingBudget ?? 1) < 0 ? 'text-red' : 'text-green'}`}>
                  {formatCurrency(budgetRisk?.twoWeeksProjectedRemainingBudget)}
                </strong>
                <span className="kpi-sub">월 총예산 대비 잔여</span>
              </div>
              <div className="week-kpi-card">
                <span className="kpi-label">2주차 예산 초과 여부</span>
                <strong className={`kpi-value ${(budgetRisk?.twoWeeksIsRisk) ? 'text-red' : 'text-green'}`}>
                  {budgetRisk?.twoWeeksRiskLevel || 'SAFE'}
                </strong>
                <span className="kpi-sub">
                  {budgetRisk?.twoWeeksExceededAmount > 0 ? `초과 예상: ${formatWon(budgetRisk.twoWeeksExceededAmount)}` : '예산 내 집행 가능'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. 1주차 (이번 주 7일) 일자별 카드 그리드 */}
          <div className="budget-glass-panel">
            <div className="panel-header-bar">
              <div>
                <h4>📊 1주차 (이번 주 7일) 일자별 식재료비 내역</h4>
                <p className="panel-desc">
                  기간: {getWeekRangeLabel(budgetRisk?.thisWeekDetails)} · 1주차 합계: {formatCurrency(budgetRisk?.thisWeekExpectedCost)}
                </p>
              </div>
            </div>

            <div className="weekly-days-grid">
              {thisWeekCards && thisWeekCards.length > 0 ? (
                thisWeekCards.map((day) => (
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
                            <div className="meal-chip-top">
                              <span className="meal-slot-tag">{getMealTypeLabel(meal.mealType)}</span>
                              <span className="meal-chip-cost">{formatWon(meal.totalMealCost)}</span>
                            </div>
                            {meal.menuNames && (
                              <div className="meal-chip-menus" title={meal.menuNames}>
                                🍚 {meal.menuNames}
                              </div>
                            )}
                            <small className="meal-chip-sub">1인 {formatWon(meal.costPerPerson)} · {meal.mealCount}명</small>
                          </div>
                        ))
                      ) : (
                        <span className="meal-empty-text">편성 식단 없음</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="table-empty">이번 주 편성된 식단이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 3. 2주차 (다음 주 7일 예측) 일자별 카드 그리드 */}
          <div className="budget-glass-panel">
            <div className="panel-header-bar">
              <div>
                <h4>🔮 2주차 (다음 주 7일 예측) 일자별 식재료비 내역</h4>
                <p className="panel-desc">
                  기간: {getWeekRangeLabel(budgetRisk?.nextWeekDetails)} · 2주차 합계: {formatCurrency(budgetRisk?.nextWeekExpectedCost)} (1인 평균 {formatWon(nextWeekAvgPerPerson)})
                </p>
              </div>
            </div>

            <div className="weekly-days-grid next-week-grid">
              {nextWeekCards && nextWeekCards.length > 0 ? (
                nextWeekCards.map((day) => (
                  <div key={day.date} className="day-cost-card next-day-card">
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
                            <div className="meal-chip-top">
                              <span className="meal-slot-tag">{getMealTypeLabel(meal.mealType)}</span>
                              <span className="meal-chip-cost">{formatWon(meal.totalMealCost)}</span>
                            </div>
                            {meal.menuNames && (
                              <div className="meal-chip-menus" title={meal.menuNames}>
                                🔮 {meal.menuNames}
                              </div>
                            )}
                            <small className="meal-chip-sub">1인 {formatWon(meal.costPerPerson)} · {meal.mealCount}명</small>
                          </div>
                        ))
                      ) : (
                        <span className="meal-empty-text">편성 식단 없음</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="table-empty">다음 주 편성된 식단이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 4. 2주차 일자별 상세 식단 편성표 (예산 내역 바로 아래 배치) */}
          <div className="budget-glass-panel meal-details-table-panel">
            <div className="panel-header-bar">
              <div>
                <h4>📋 1주차 & 2주차 일자별 상세 식단 편성표</h4>
                <p className="panel-desc">2주간 각 끼니별 메뉴 구성과 식재료 원가 내역입니다.</p>
              </div>
            </div>

            <div className="detailed-meal-plans-list">
              {thisWeekCards && thisWeekCards.some((d) => d.meals && d.meals.length > 0) && (
                <div className="week-detail-section">
                  <h5 className="week-section-title">📍 1주차 편성 식단</h5>
                  {thisWeekCards.map((day) =>
                    day.meals && day.meals.length > 0 ? (
                      <div key={day.date} className="day-meal-group-card">
                        <div className="day-group-header">
                          <span className="day-group-title">{day.date} ({day.dayOfWeek})</span>
                          <span className="day-group-total">일 합계: <strong>{formatWon(day.dailyTotalCost)}</strong> ({day.dailyMealCount}명)</span>
                        </div>
                        <div className="day-group-items">
                          {day.meals.map((m, idx) => (
                            <div key={m.planId || idx} className="meal-row-card">
                              <div className="meal-row-left">
                                <span className="meal-row-badge">{getMealTypeLabel(m.mealType)}</span>
                                <div className="meal-row-info">
                                  <strong className="meal-row-menus">{m.menuNames || '편성 메뉴 없음'}</strong>
                                  <span className="meal-row-meta">식수: {m.mealCount}명 · 1인분 단가: {formatWon(m.costPerPerson)}</span>
                                </div>
                              </div>
                              <div className="meal-row-right">
                                <span className="meal-row-cost">{formatWon(m.totalMealCost)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {nextWeekCards && nextWeekCards.some((d) => d.meals && d.meals.length > 0) && (
                <div className="week-detail-section">
                  <h5 className="week-section-title next-section-title">🔮 2주차 예측 식단</h5>
                  {nextWeekCards.map((day) =>
                    day.meals && day.meals.length > 0 ? (
                      <div key={day.date} className="day-meal-group-card next-group-card">
                        <div className="day-group-header next-group-header">
                          <span className="day-group-title">{day.date} ({day.dayOfWeek})</span>
                          <span className="day-group-total">일 합계: <strong>{formatWon(day.dailyTotalCost)}</strong> ({day.dailyMealCount}명)</span>
                        </div>
                        <div className="day-group-items">
                          {day.meals.map((m, idx) => (
                            <div key={m.planId || idx} className="meal-row-card next-row-card">
                              <div className="meal-row-left">
                                <span className="meal-row-badge next-badge">{getMealTypeLabel(m.mealType)}</span>
                                <div className="meal-row-info">
                                  <strong className="meal-row-menus">{m.menuNames || '편성 메뉴 없음'}</strong>
                                  <span className="meal-row-meta">식수: {m.mealCount}명 · 1인분 단가: {formatWon(m.costPerPerson)}</span>
                                </div>
                              </div>
                              <div className="meal-row-right">
                                <span className="meal-row-cost">{formatWon(m.totalMealCost)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* [CASE 3] 월간 예산 & 주차별 분석 (scheduleView === 'monthly') */}
      {/* ========================================================= */}
      {scheduleView === 'monthly' && (
        <div className="monthly-view-wrapper">
          {/* 1. 월간 총 예산 및 확정 패널 */}
          {monthlyPlanCost ? (
            <div className="budget-glass-panel monthly-budget-main-panel">
              <div className="panel-header-bar monthly-header-bar">
                <div>
                  <div className="panel-title-with-badge">
                    <h4>📅 {monthlyPlanCost.yearMonth} 월간 총 예상 식재료비 및 예산</h4>
                  </div>
                  <p className="panel-desc">
                    월간 총 식단 원가: <strong>{formatCurrency(monthlyPlanCost.totalMonthlyCost)}</strong> (총 {monthlyPlanCost.totalMealCount?.toLocaleString()}명 · 1인 평균 {formatWon(monthlyPlanCost.averageCostPerPerson)})
                  </p>
                </div>

                {/* 월 예산 확정 영역 (프리미엄 버튼 CSS 적용) */}
                <div className="budget-save-action-group">
                  <div className="monthly-budget-display-badge">
                    <span className="budget-badge-label">확정 월 예산</span>
                    <strong className="budget-badge-value">
                      {savedMonthlyBudget != null ? formatCurrency(savedMonthlyBudget) : '미설정 (자동 계산)'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn-budget-save-primary"
                    onClick={onSaveMonthlyBudget}
                    disabled={monthlyBudgetSaving}
                  >
                    {monthlyBudgetSaving ? '저장 중...' : savedMonthlyBudget == null ? '월 예산 확정' : '월 예산 다시 확정'}
                  </button>
                </div>
              </div>

              {monthlyBudgetMessage && <p className="monthly-budget-feedback success" role="status">✅ {monthlyBudgetMessage}</p>}
              {monthlyBudgetError && <p className="monthly-budget-feedback error" role="alert">⚠️ {monthlyBudgetError}</p>}

              {/* 주차별(1~5주차) 예상 비용 그리드 */}
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
          ) : (
            <div className="budget-glass-panel">
              <p className="table-empty">월간 식단 및 예산 정보가 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
