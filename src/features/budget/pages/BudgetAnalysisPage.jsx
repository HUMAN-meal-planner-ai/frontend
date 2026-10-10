import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../../../api/axios';
import MealFitHeader from '../../../layouts/MealFitHeader';
import { getWeeklyMealPlan } from '../../mealplan/api/mealPlanApi';
import { getFutureMenuCost, getMenuCostDetail } from '../api/costApi';
import { useBudgetAnalysis } from '../hooks/useBudgetAnalysis';
import { formatWon } from '../utils/budgetUtils';

import BudgetFilterCard from '../components/BudgetFilterCard';
import BudgetRiskHero from '../components/BudgetRiskHero';
import BudgetNavTabs from '../components/BudgetNavTabs';
import MenuCostOverviewTab from '../components/MenuCostOverviewTab';
import CostComparisonTab from '../components/CostComparisonTab';
import CostDriverRiskTab from '../components/CostDriverRiskTab';
import BudgetScheduleTab from '../components/BudgetScheduleTab';
import BudgetBottomActions from '../components/BudgetBottomActions';
import BudgetAlertModal from '../components/BudgetAlertModal';
import MenuReplacementModal from '../components/MenuReplacementModal';

import './BudgetAnalysisPage.css';

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysFromMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: formatLocalDate(monday), endDate: formatLocalDate(sunday) };
}

// 상단 GNB 네비게이션 아이템
export default function BudgetAnalysisPage({ user, onLogout }) {
  const navigate = useNavigate();
  const currentWeekRange = useMemo(() => getCurrentWeekRange(), []);
  const [currentWeekMenus, setCurrentWeekMenus] = useState(null);
  const [currentWeekMenuLoading, setCurrentWeekMenuLoading] = useState(true);
  const [currentWeekMenuError, setCurrentWeekMenuError] = useState('');
  const [weeklyMenuCostResult, setWeeklyMenuCostResult] = useState({ key: null, rows: [], error: '' });

  // 비즈니스 로직 & 데이터 상태 커스텀 훅 (자동화 포함)
  const {
    filterMealCount,
    setFilterMealCount,
    filterTargetCost,
    setFilterTargetCost,
    filterTargetDate,
    setFilterTargetDate,
    filterBaseDate,
    setFilterBaseDate,
    appliedParams,

    activeTab,
    setActiveTab,
    costMode,
    setCostMode,

    comparisons,
    drivers,
    menuRisks,
    budgetRisk,
    budgetUsage,
    monthlyPlanCost,
    weeklyPlanCost,
    monthlyBudgetPreview,
    savedMonthlyBudget,
    monthlyBudgetSaving,
    monthlyBudgetMessage,
    monthlyBudgetError,
    highCostData, // BUDG-003

    replacementCandidates,
    unreadAlertCount,
    alertList,
    isReevaluating,
    isAlertModalOpen,
    isReplacementModalOpen,
    replacementTargetMenu,

    selectedMenuId,
    selectedMenuDetail,
    selectedComparison,
    selectedDriver,
    selectedMenuRisk,

    loading,
    detailLoading,
    error,

    summary,
    riskStatusClass,

    handleApplyFilters,
    handleSelectMenu,
    handleSaveMonthlyBudget,
    handleTriggerReevaluation,
    handleVerifyWeeklyPlan,
    handleMarkAlertAsRead,
    handleMarkAllAlertsAsRead,
    handleDeleteAlert,
    handleOpenAlertModal,
    handleCloseAlertModal,
    handleOpenReplacementModal,
    handleCloseReplacementModal,
  } = useBudgetAnalysis(user?.facilityId || user?.facility?.id || 1);

  useEffect(() => {
    let active = true;
    getWeeklyMealPlan(currentWeekRange.startDate)
      .then(({ data }) => {
        if (!active) return;
        const menusById = new Map();
        for (const meal of data?.meals || []) {
          const items = meal.menuItems?.length
            ? meal.menuItems
            : (meal.menuId != null ? [{ menuId: meal.menuId }] : []);
          items.forEach((item) => {
            if (item.menuId == null) return;
            const menuId = String(item.menuId);
            if (!menusById.has(menuId)) {
              menusById.set(menuId, { menuId: Number(item.menuId), menuName: item.menuName || meal.menuName || '' });
            }
          });
        }
        setCurrentWeekMenus([...menusById.values()]);
      })
      .catch((requestError) => {
        if (!active) return;
        setCurrentWeekMenus([]);
        setCurrentWeekMenuError(requestError.response?.data?.message || '이번 주 식단을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setCurrentWeekMenuLoading(false);
      });
    return () => { active = false; };
  }, [currentWeekRange.startDate]);

  const weeklyMenuCostRequestKey = JSON.stringify([
    currentWeekMenus?.map((menu) => menu.menuId) ?? null,
    costMode,
    appliedParams.mealCount,
    appliedParams.targetCost,
    appliedParams.targetDate,
  ]);

  useEffect(() => {
    if (currentWeekMenus == null) return undefined;

    let active = true;
    const requests = currentWeekMenus.map(({ menuId }) => (
      costMode === 'CURRENT'
        ? getMenuCostDetail(menuId, { mealCount: appliedParams.mealCount, targetCost: appliedParams.targetCost })
        : getFutureMenuCost(menuId, {
          targetDate: appliedParams.targetDate,
          mealCount: appliedParams.mealCount,
          targetCost: appliedParams.targetCost,
        })
    ));

    Promise.allSettled(requests).then((results) => {
      if (!active) return;
      let failedCount = 0;
      const rows = results.map((result, index) => {
        const plannedMenu = currentWeekMenus[index];
        if (result.status === 'fulfilled') {
          return {
            ...result.value,
            menuId: plannedMenu.menuId,
            menuName: result.value.menuName || plannedMenu.menuName,
          };
        }
        failedCount += 1;
        return {
          menuId: plannedMenu.menuId,
          menuName: plannedMenu.menuName || `메뉴 #${plannedMenu.menuId}`,
          costUnavailable: true,
          targetCost: appliedParams.targetCost,
          mealCount: appliedParams.mealCount,
        };
      });
      setWeeklyMenuCostResult({
        key: weeklyMenuCostRequestKey,
        rows,
        error: failedCount
          ? `${failedCount}개 주간 메뉴의 식재료 원가 정보를 불러오지 못했습니다.`
          : '',
      });
    });

    return () => { active = false; };
  }, [currentWeekMenus, costMode, appliedParams.mealCount, appliedParams.targetCost, appliedParams.targetDate, weeklyMenuCostRequestKey]);

  const currentWeekMenuIdSet = useMemo(
    () => new Set((currentWeekMenus || []).map((menu) => String(menu.menuId))),
    [currentWeekMenus],
  );
  const currentWeekCostsLoading = weeklyMenuCostResult.key !== weeklyMenuCostRequestKey;
  const currentWeekMenuCosts = currentWeekCostsLoading ? [] : weeklyMenuCostResult.rows;
  const currentWeekMenuCostError = currentWeekCostsLoading ? '' : weeklyMenuCostResult.error;
  const selectedCurrentWeekMenuDetail = selectedMenuDetail
    && currentWeekMenuIdSet.has(String(selectedMenuDetail.menuId))
    ? selectedMenuDetail
    : null;

  // 실시간 재평가 실행 클릭 시 알림
  const handleReevaluateClick = async () => {
    try {
      const res = await handleTriggerReevaluation();
      if (res?.warningMessage) {
        alert(`[예산 재평가 완료]\n${res.warningMessage}`);
      }
    } catch {
      alert('예산 재평가 중 오류가 발생했습니다.');
    }
  };

  // 주간 식단 예산 재검증 클릭 시 알림
  const handleVerifyWeeklyPlanClick = async () => {
    try {
      const res = await handleVerifyWeeklyPlan();
      if (res?.verificationMessage) {
        alert(`[주간 식단 예산 재검증 결과]\n${res.verificationMessage}`);
      }
    } catch {
      alert('식단 예산 재검증 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="budget-root-layout">
      {/* 1. 메인 공통 GNB 헤더 */}
      <MealFitHeader onLogout={onLogout} />

      {/* 2. 본문 컨텐츠 컨테이너 */}
      <main className="budget-main-wrapper">
        <div className="budget-content-container">
          {/* 페이지 타이틀 & 헤더 소개 영역 */}
          <section className="budget-intro-section">
            <p className="landing-kicker">
              SMART MEAL PLANNING · COST & BUDGET
            </p>
            <div className="budget-intro-row">
              <div>
                <h1>원가 및 <em>예산 분석</em></h1>
                <p className="budget-intro-desc">
                  KAMIS 실시간 시세와 7일 가격 예측 모델을 기반으로 메뉴별 원가 변동, 식재료 가격 위험 및 주간 예산 위험을 정밀 진단합니다.
                </p>
              </div>
              <div className="header-meta-pill">
                <span>이번 주 편성 <strong>{currentWeekMenuLoading || currentWeekCostsLoading ? '조회 중' : currentWeekMenuError ? '-' : `${currentWeekMenuCosts.length}개`}</strong> 메뉴</span>
                <span className="header-pill-divider" />
                <span>적용 식수 <strong>{appliedParams.mealCount}명</strong></span>
                <span className="header-pill-divider" />
                <span>목표 단가 <strong>{formatWon(appliedParams.targetCost)}</strong></span>
              </div>
            </div>

            {/* 조건 필터 카드 */}
            <BudgetFilterCard
              filterMealCount={filterMealCount}
              setFilterMealCount={setFilterMealCount}
              filterTargetCost={filterTargetCost}
              setFilterTargetCost={setFilterTargetCost}
              filterTargetDate={filterTargetDate}
              setFilterTargetDate={setFilterTargetDate}
              filterBaseDate={filterBaseDate}
              setFilterBaseDate={setFilterBaseDate}
              onApply={handleApplyFilters}
              loading={loading}
            />
          </section>

          {/* 3. 예산 위험 및 사용률 분석 알림 카드 (BUDG-002, COST-014, AUTO-002 연동) */}
          <BudgetRiskHero
            budgetRisk={budgetRisk}
            budgetUsage={budgetUsage}
            riskStatusClass={riskStatusClass}
            appliedParams={appliedParams}
            unreadAlertCount={unreadAlertCount}
            isReevaluating={isReevaluating}
            onTriggerReevaluation={handleReevaluateClick}
            onOpenAlertModal={handleOpenAlertModal}
          />

          {/* 4. 분석 모드 탭 네비게이션 */}
          <BudgetNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* 로딩 & 에러 처리 */}
          {loading && (
            <div className="budget-glass-panel loading-panel">
              <div className="brand-spinner" />
              <p>KAMIS 실시간 시세 및 예측 데이터를 기반으로 원가와 예산을 분석 중입니다...</p>
            </div>
          )}

          {error && !loading && (
            <div className="budget-glass-panel error-panel">
              <p className="error-text">⚠️ {error}</p>
              {error.includes('로그인') ? (
                <button
                  type="button"
                  className="header-login-button"
                  onClick={() => {
                    if (onLogout) {
                      onLogout('/login');
                    } else {
                      clearAuth();
                      navigate('/login');
                    }
                  }}
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  로그인하러 가기
                </button>
              ) : (
                <button
                  type="button"
                  className="header-login-button"
                  onClick={handleApplyFilters}
                >
                  다시 불러오기
                </button>
              )}
            </div>
          )}

          {/* 탭 컨텐츠 */}
          {!loading && !error && (
            <>
              {activeTab === 'overview' && (
                <MenuCostOverviewTab
                  costMode={costMode}
                  setCostMode={setCostMode}
                  appliedParams={appliedParams}
                  summary={summary}
                  menuCosts={currentWeekMenuCosts}
                  menuListLoading={currentWeekMenuLoading || currentWeekCostsLoading}
                  menuListError={currentWeekMenuError}
                  menuListWarning={currentWeekMenuCostError}
                  weekRange={currentWeekRange}
                  selectedMenuId={currentWeekMenuIdSet.has(String(selectedMenuId)) ? selectedMenuId : null}
                  onSelectMenu={handleSelectMenu}
                  selectedMenuDetail={selectedCurrentWeekMenuDetail}
                  detailLoading={detailLoading}
                  weeklyPlanCost={weeklyPlanCost}
                  budgetRisk={budgetRisk}
                />
              )}

              {activeTab === 'comparison' && (
                <CostComparisonTab
                  comparisons={comparisons}
                  appliedParams={appliedParams}
                  selectedMenuId={selectedMenuId}
                  onSelectMenu={handleSelectMenu}
                  selectedComparison={selectedComparison}
                />
              )}

              {activeTab === 'driver' && (
                <CostDriverRiskTab
                  drivers={drivers}
                  menuRisks={menuRisks}
                  selectedMenuId={selectedMenuId}
                  onSelectMenu={handleSelectMenu}
                  selectedMenuRisk={selectedMenuRisk}
                  selectedDriver={selectedDriver}
                  replacementCandidates={replacementCandidates}
                  highCostData={highCostData}
                  onOpenReplacementModal={handleOpenReplacementModal}
                />
              )}

              {activeTab === 'schedule' && (
                <BudgetScheduleTab
                  monthlyPlanCost={monthlyPlanCost}
                  weeklyPlanCost={weeklyPlanCost}
                  budgetRisk={budgetRisk}
                  monthlyBudgetPreview={monthlyBudgetPreview}
                  savedMonthlyBudget={savedMonthlyBudget}
                  monthlyBudgetSaving={monthlyBudgetSaving}
                  monthlyBudgetMessage={monthlyBudgetMessage}
                  monthlyBudgetError={monthlyBudgetError}
                  onSaveMonthlyBudget={handleSaveMonthlyBudget}
                />
              )}
            </>
          )}

          {/* 5. 하단 액션 버튼 바 (AUTO-004 연동) */}
          <BudgetBottomActions
            onNavigateMealPlans={() => window.location.href = '/meal-plans'}
            onNavigateMenus={() => window.location.href = '/menus'}
            onVerifyWeeklyPlan={handleVerifyWeeklyPlanClick}
            onConfirmReview={() => alert('원가 및 예산 분석 검토가 완료되었습니다.')}
            isExceeded={summary.totalExceeded > 0}
          />

          {/* 6. [AUTO-002] 예산 경고 알림 관리 모달 */}
          <BudgetAlertModal
            isOpen={isAlertModalOpen}
            onClose={handleCloseAlertModal}
            alertList={alertList}
            unreadCount={unreadAlertCount}
            onMarkAsRead={handleMarkAlertAsRead}
            onMarkAllAsRead={handleMarkAllAlertsAsRead}
            onDeleteAlert={handleDeleteAlert}
            onTriggerReevaluation={handleReevaluateClick}
            isReevaluating={isReevaluating}
          />

          {/* 7. [BUDG-005] 대체 메뉴 원가 비교 & 절감액 시뮬레이션 모달 */}
          <MenuReplacementModal
            isOpen={isReplacementModalOpen}
            onClose={handleCloseReplacementModal}
            originalMenu={replacementTargetMenu}
            appliedParams={appliedParams}
            facilityId={1}
          />
        </div>
      </main>
    </div>
  );
}
