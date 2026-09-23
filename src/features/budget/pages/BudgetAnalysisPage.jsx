import { Link, NavLink } from 'react-router-dom';
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

import './BudgetAnalysisPage.css';

// 상단 GNB 네비게이션 아이템
const navigationItems = [
  { label: '메뉴 검토', to: '/menus' },
  { label: '식단 관리', to: '/meal-plans' },
  { label: '가격 예측', to: '/prices' },
  { label: '원가·예산', to: '/budget' },
];

export default function BudgetAnalysisPage({ user, onLogout }) {
  const accountPage = user?.role === 'ADMIN' ? '/admin' : user?.role === 'MANAGER' ? '/manager' : '/home';
  const accountLabel = user?.role === 'ADMIN' ? '관리자 페이지' : user?.role === 'MANAGER' ? '시설 관리' : '내 대시보드';

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

    menuCosts,
    comparisons,
    drivers,
    menuRisks,
    budgetRisk,
    budgetUsage,
    monthlyPlanCost,
    weeklyPlanCost,

    replacementCandidates,
    unreadAlertCount,
    isReevaluating,

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
    handleTriggerReevaluation,
    handleVerifyWeeklyPlan,
  } = useBudgetAnalysis();

  // 실시간 재평가 실행 클릭 시 알림
  const handleReevaluateClick = async () => {
    try {
      const res = await handleTriggerReevaluation();
      if (res?.warningMessage) {
        alert(`[예산 재평가 완료]\n${res.warningMessage}`);
      }
    } catch (e) {
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
    } catch (e) {
      alert('식단 예산 재검증 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="budget-root-layout">
      {/* 1. 메인 공통 GNB 헤더 */}
      <header className="landing-header">
        <Link className="landing-logo" to="/" aria-label="MealFit 홈">
          <span className="logo-leaf" aria-hidden="true">🌱</span>
          MEAL<span>FIT</span>
        </Link>

        <nav className="landing-nav" aria-label="주요 화면">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="landing-auth-actions">
          {user ? (
            <>
              <Link className="header-dashboard-link" to={accountPage}>{accountLabel}</Link>
              <button className="header-login-button secondary" type="button" onClick={onLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <Link className="header-login-button" to="/login">로그인</Link>
          )}
        </div>
      </header>

      {/* 2. 본문 컨텐츠 컨테이너 */}
      <main className="budget-main-wrapper">
        <div className="budget-content-container">
          {/* 페이지 타이틀 & 헤더 소개 영역 */}
          <section className="budget-intro-section">
            <p className="landing-kicker">
              <span /> SMART MEAL PLANNING · COST & BUDGET
            </p>
            <div className="budget-intro-row">
              <div>
                <h1>원가 및 <em>예산 분석</em></h1>
                <p className="budget-intro-desc">
                  KAMIS 실시간 시세와 7일 가격 예측 모델을 기반으로 메뉴별 원가 변동, 식재료 가격 위험 및 주간 예산 위험을 정밀 진단합니다.
                </p>
              </div>
              <div className="budget-meta-pill">
                <span>분석 대상 <strong>{menuCosts.length}개</strong> 메뉴</span>
                <span className="pill-divider" />
                <span>적용 식수 <strong>{appliedParams.mealCount}명</strong></span>
                <span className="pill-divider" />
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
              <button
                type="button"
                className="header-login-button"
                onClick={handleApplyFilters}
              >
                다시 불러오기
              </button>
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
                  menuCosts={menuCosts}
                  selectedMenuId={selectedMenuId}
                  onSelectMenu={handleSelectMenu}
                  selectedMenuDetail={selectedMenuDetail}
                  detailLoading={detailLoading}
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
                />
              )}

              {activeTab === 'schedule' && (
                <BudgetScheduleTab
                  monthlyPlanCost={monthlyPlanCost}
                  weeklyPlanCost={weeklyPlanCost}
                  budgetRisk={budgetRisk}
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
        </div>
      </main>
    </div>
  );
}
