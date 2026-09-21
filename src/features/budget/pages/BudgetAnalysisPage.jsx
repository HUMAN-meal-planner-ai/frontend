import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  getAllMenuCosts,
  getMenuCostDetail,
  getAllFutureMenuCosts,
  getFutureMenuCost,
  getAllMenuCostComparisons,
  getMenuCostComparison,
  getAllMenuCostDrivers,
  getMenuCostDrivers,
  getBudgetRisk,
  getWeeklyMealPlanCost,
  getMonthlyMealPlanCost,
  getBudgetUsage,
} from '../api/costApi';
import { getStoredUser, clearAuth } from '../../../api/axios';
import './BudgetAnalysisPage.css';

// 상단 GNB 내비게이션 아이템
const navigationItems = [
  { label: '메뉴 검색', to: '/menus' },
  { label: '식단 관리', to: '/meal-plans' },
  { label: '가격 예측', to: '/prices' },
  { label: '원가·예산', to: '/budget' },
];

/**
 * [방어 로직] Java Jackson 직렬화 특성:
 * Java의 boolean isExceeded / isIncreased / isRisk 필드는 JSON 직렬화 시
 * "isExceeded" -> "exceeded"로 변환될 수 있으므로 양쪽 키와 실시간 계산을 지원합니다.
 */
const checkIsExceeded = (item, fallbackTarget) => {
  if (!item) return false;
  if (item.isExceeded !== undefined) return Boolean(item.isExceeded);
  if (item.exceeded !== undefined) return Boolean(item.exceeded);
  if (item.exceededAmount !== undefined && Number(item.exceededAmount) > 0) return true;
  const cost = Number(item.costPerPerson ?? 0);
  const target = Number(item.targetCost ?? fallbackTarget ?? 0);
  return cost > target;
};

const getExceededAmount = (item, fallbackTarget) => {
  if (!item) return 0;
  if (item.exceededAmount !== undefined && Number(item.exceededAmount) > 0) {
    return Number(item.exceededAmount);
  }
  const cost = Number(item.costPerPerson ?? 0);
  const target = Number(item.targetCost ?? fallbackTarget ?? 0);
  return cost > target ? cost - target : 0;
};

const checkIsIncreased = (comp) => {
  if (!comp) return false;
  if (comp.isIncreased !== undefined) return Boolean(comp.isIncreased);
  if (comp.increased !== undefined) return Boolean(comp.increased);
  return Number(comp.costDifference ?? 0) > 0;
};

const checkIsCostIncrease = (driver) => {
  if (!driver) return false;
  if (driver.isCostIncrease !== undefined) return Boolean(driver.isCostIncrease);
  if (driver.costIncrease !== undefined) return Boolean(driver.costIncrease);
  return Number(driver.lineCostDifference ?? 0) > 0;
};

const checkIsRisk = (risk) => {
  if (!risk) return false;
  if (risk.isRisk !== undefined) return Boolean(risk.isRisk);
  if (risk.risk !== undefined) return Boolean(risk.risk);
  return Number(risk.projectedRemainingBudget ?? 0) < 0;
};

export default function BudgetAnalysisPage({ user, onLogout }) {
  const navigate = useNavigate();

  // 로그인 사용자 및 로그아웃 자체 처리 (App.jsx의 prop이 없어도 독립 동작)
  const [currentUser, setCurrentUser] = useState(() => user || getStoredUser());
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      clearAuth();
      setCurrentUser(null);
      navigate('/', { replace: true });
    }
  };

  // 1. 입력 폼 상태 (사용자가 변경하는 값)
  const [filterMealCount, setFilterMealCount] = useState(100);
  const [filterTargetCost, setFilterTargetCost] = useState(2500);
  const [filterTargetDate, setFilterTargetDate] = useState('2026-09-20');
  const [filterBaseDate, setFilterBaseDate] = useState('2026-09-17');
  const [facilityId] = useState(1);

  // 2. 적용된 분석 기준 파라미터 상태 (API 호출 및 결과 표출 기준)
  const [appliedParams, setAppliedParams] = useState({
    mealCount: 100,
    targetCost: 2500,
    targetDate: '2026-09-20',
    baseDate: '2026-09-17',
  });

  // 3. 탭 및 뷰 상태
  const [activeTab, setActiveTab] = useState('overview');
  const [costMode, setCostMode] = useState('CURRENT');

  // 4. API 응답 데이터 상태
  const [menuCosts, setMenuCosts] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [budgetRisk, setBudgetRisk] = useState(null);
  const [budgetUsage, setBudgetUsage] = useState(null); // GET /api/cost/budget-usage (COST-014)
  const [monthlyPlanCost, setMonthlyPlanCost] = useState(null); // GET /api/cost/monthly-plan-cost (COST-013)
  const [weeklyPlanCost, setWeeklyPlanCost] = useState(null); // GET /api/cost/weekly-plan-cost (COST-012)

  // 단건 상세 선택 상태
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // 로딩 & 에러 상태
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- API 호출 함수들 ---

  const fetchSingleMenuDetail = useCallback(
    async (menuId, mode, count, target, tDate) => {
      if (!menuId) return;
      setDetailLoading(true);
      try {
        if (mode === 'CURRENT') {
          const data = await getMenuCostDetail(menuId, { mealCount: count, targetCost: target });
          setSelectedMenuDetail(data);
        } else {
          const data = await getFutureMenuCost(menuId, {
            targetDate: tDate,
            mealCount: count,
            targetCost: target,
          });
          setSelectedMenuDetail(data);
        }

        const compData = await getMenuCostComparison(menuId, { targetDate: tDate, mealCount: count });
        setSelectedComparison(compData);

        const driverData = await getMenuCostDrivers(menuId, { targetDate: tDate });
        setSelectedDriver(driverData);
      } catch (err) {
        console.error(`[메뉴 #${menuId} 상세 조회 실패]:`, err);
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const fetchAllData = useCallback(
    async (count, target, tDate, bDate, facId, mode) => {
      setLoading(true);
      setError(null);
      const currentYearMonth = bDate ? bDate.slice(0, 7) : '2026-09';
      try {
        const [
          costData,
          compData,
          driverData,
          riskData,
          usageData,
          monthlyData,
          weeklyData,
        ] = await Promise.all([
          mode === 'CURRENT'
            ? getAllMenuCosts({ mealCount: count, targetCost: target })
            : getAllFutureMenuCosts({ targetDate: tDate, mealCount: count, targetCost: target }),
          getAllMenuCostComparisons({ targetDate: tDate, mealCount: count }),
          getAllMenuCostDrivers({ targetDate: tDate }),
          getBudgetRisk({ facilityId: facId, baseDate: bDate }).catch((e) => {
            console.warn('[getBudgetRisk] 실패:', e);
            return null;
          }),
          getBudgetUsage({ facilityId: facId, yearMonth: currentYearMonth, baseDate: bDate }).catch((e) => {
            console.warn('[getBudgetUsage] 실패:', e);
            return null;
          }),
          getMonthlyMealPlanCost({ facilityId: facId, yearMonth: currentYearMonth }).catch((e) => {
            console.warn('[getMonthlyMealPlanCost] 실패:', e);
            return null;
          }),
          getWeeklyMealPlanCost({ facilityId: facId, startDate: bDate }).catch((e) => {
            console.warn('[getWeeklyMealPlanCost] 실패:', e);
            return null;
          }),
        ]);

        setMenuCosts(costData || []);
        setComparisons(compData || []);
        setDrivers(driverData || []);
        setBudgetRisk(riskData);
        setBudgetUsage(usageData);
        setMonthlyPlanCost(monthlyData);
        setWeeklyPlanCost(weeklyData);

        if (costData && costData.length > 0) {
          const defaultMenu = costData.find((m) => checkIsExceeded(m, target)) || costData[0];
          setSelectedMenuId(defaultMenu.menuId);
          fetchSingleMenuDetail(defaultMenu.menuId, mode, count, target, tDate);
        } else {
          setSelectedMenuId(null);
          setSelectedMenuDetail(null);
          setSelectedComparison(null);
          setSelectedDriver(null);
        }
      } catch (err) {
        console.error('[원가 API 일괄 조회 실패]:', err);
        setError(
          err.response?.data?.message ||
            '원가 분석 데이터를 불러오지 못했습니다. 백엔드 서버 상태를 확인해 주세요.'
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchSingleMenuDetail]
  );

  // 초기 렌더링 시 1회 호출
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAllData(
        appliedParams.mealCount,
        appliedParams.targetCost,
        appliedParams.targetDate,
        appliedParams.baseDate,
        facilityId,
        costMode
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAllData, appliedParams, facilityId, costMode]);

  // [조건 적용] 버튼 클릭 핸들러 (KAMIS/원가 API 명시적 트리거)
  const handleApplyFilters = () => {
    const nextParams = {
      mealCount: filterMealCount,
      targetCost: filterTargetCost,
      targetDate: filterTargetDate,
      baseDate: filterBaseDate,
    };
    setAppliedParams(nextParams);
    fetchAllData(
      nextParams.mealCount,
      nextParams.targetCost,
      nextParams.targetDate,
      nextParams.baseDate,
      facilityId,
      costMode
    );
  };

  const handleSelectMenu = (menuId) => {
    setSelectedMenuId(menuId);
    fetchSingleMenuDetail(
      menuId,
      costMode,
      appliedParams.mealCount,
      appliedParams.targetCost,
      appliedParams.targetDate
    );
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0원';
    const num = Number(val);
    if (Math.abs(num) >= 100000000) {
      return `${(num / 100000000).toFixed(1)}억원`;
    }
    if (Math.abs(num) >= 10000) {
      const man = Math.round(num / 10000);
      return `${man.toLocaleString()}만원`;
    }
    return `${Math.round(num).toLocaleString()}원`;
  };

  const formatWon = (val) => {
    if (val === undefined || val === null) return '0원';
    return `${Math.round(Number(val)).toLocaleString()}원`;
  };

  const summary = useMemo(() => {
    if (!menuCosts || menuCosts.length === 0) {
      return { totalCurrentCost: 0, totalTargetCost: 0, totalExceeded: 0, exceededCount: 0 };
    }
    const totalCurrentCost = menuCosts.reduce((sum, m) => sum + (Number(m.totalMealCost) || 0), 0);
    const totalTargetCost = menuCosts.reduce(
      (sum, m) => sum + (Number(m.targetCost || appliedParams.targetCost) * (m.mealCount || appliedParams.mealCount)),
      0
    );
    const totalExceeded = menuCosts.reduce(
      (sum, m) => sum + getExceededAmount(m, appliedParams.targetCost) * (m.mealCount || appliedParams.mealCount),
      0
    );
    const exceededCount = menuCosts.filter((m) => checkIsExceeded(m, appliedParams.targetCost)).length;

    return { totalCurrentCost, totalTargetCost, totalExceeded, exceededCount };
  }, [menuCosts, appliedParams.targetCost, appliedParams.mealCount]);

  return (
    <div className="budget-root-layout">
      {/* 1. 메인 화면과 동일한 공통 GNB 헤더 */}
      <header className="landing-header">
        <Link className="landing-logo" to="/" aria-label="MealFit 홈">
          <span className="logo-leaf" aria-hidden="true">◆</span>
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
          {currentUser ? (
            <>
              <Link className="header-dashboard-link" to="/home">내 대시보드</Link>
              <button className="header-login-button secondary" type="button" onClick={handleLogout}>
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
                <h1>원가와 <em>예산 분석</em></h1>
                <p className="budget-intro-desc">
                  KAMIS 실시간 시세와 7일 가격 예측 모델을 기반으로 메뉴별 원가 변동과 월간 예산 위험을 정밀 진단합니다.
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

            {/* 조건 필터 카드 (KAMIS 조건 설정 + 조건 적용 버튼) */}
            <div className="budget-filter-card">
              <div className="filter-item">
                <span className="filter-label">식수 인원</span>
                <div className="filter-input-wrap">
                  <input
                    type="number"
                    min="1"
                    value={filterMealCount}
                    onChange={(e) => setFilterMealCount(Number(e.target.value) || 1)}
                  />
                  <em>명</em>
                </div>
              </div>

              <div className="filter-item">
                <span className="filter-label">1인 목표 단가</span>
                <div className="filter-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={filterTargetCost}
                    onChange={(e) => setFilterTargetCost(Number(e.target.value) || 0)}
                  />
                  <em>원</em>
                </div>
              </div>

              <div className="filter-item">
                <span className="filter-label">미래 예측 기준일</span>
                <input
                  type="date"
                  className="filter-date-input"
                  value={filterTargetDate}
                  onChange={(e) => setFilterTargetDate(e.target.value)}
                />
              </div>

              <div className="filter-item">
                <span className="filter-label">예산 분석 기준일</span>
                <input
                  type="date"
                  className="filter-date-input"
                  value={filterBaseDate}
                  onChange={(e) => setFilterBaseDate(e.target.value)}
                />
              </div>

              {/* KAMIS 연동 조건 적용 버튼 */}
              <button
                type="button"
                className="filter-apply-btn"
                onClick={handleApplyFilters}
                disabled={loading}
              >
                {loading ? '분석 중...' : '조건 적용'}
              </button>
            </div>
          </section>

          {/* 3. 예산 위험 및 사용률 분석 알림 카드 (BUDG-002 & COST-014 연동) */}
          {(budgetRisk || budgetUsage) && (
            <section className={`budget-risk-card-hero ${budgetRisk?.riskLevel?.toLowerCase() || 'stable'}`}>
              <div className="risk-card-top">
                <div className="risk-badge-group">
                  <span className="risk-level-tag">
                    {budgetRisk?.riskLevel === 'DANGER'
                      ? '🚨 예산 초과 위험 (DANGER)'
                      : budgetRisk?.riskLevel === 'WARNING'
                      ? '⚠️ 예산 주의 (WARNING)'
                      : '✅ 예산 안정 (STABLE)'}
                  </span>
                  <span className="risk-facility-info">
                    {budgetRisk?.facilityName || '시설 1'} · {budgetRisk?.budgetMonth || appliedParams.baseDate.slice(0, 7)} 기준
                  </span>
                </div>
                {budgetUsage && (
                  <div className="budget-usage-pill">
                    <span>예산 사용률: </span>
                    <strong className={Number(budgetUsage.usageRate) > 100 ? 'text-red' : 'text-green'}>
                      {budgetUsage.usageRate}%
                    </strong>
                  </div>
                )}
              </div>

              <p className="risk-message-text">{budgetRisk?.warningMessage || budgetUsage?.statusMessage}</p>

              <div className="risk-stats-grid">
                <div className="risk-stat-box">
                  <span className="stat-label">월간 총 예산</span>
                  <strong className="stat-val">{formatCurrency(budgetRisk?.monthlyBudget || budgetUsage?.budgetAmount)}</strong>
                </div>
                <div className="risk-stat-box">
                  <span className="stat-label">현재 기집행액</span>
                  <strong className="stat-val">{formatCurrency(budgetRisk?.currentSpentCost || budgetUsage?.spentAmount)}</strong>
                </div>
                <div className="risk-stat-box">
                  <span className="stat-label">2주간 예상 총비용</span>
                  <strong className="stat-val highlight">{formatCurrency(budgetRisk?.twoWeeksTotalExpectedCost)}</strong>
                </div>
                <div className="risk-stat-box">
                  <span className="stat-label">시뮬레이션 잔여 예산</span>
                  <strong className={`stat-val ${checkIsRisk(budgetRisk) ? 'val-danger' : 'val-success'}`}>
                    {formatCurrency(budgetRisk?.projectedRemainingBudget || budgetUsage?.remainingBudget)}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* 4. 분석 모드 탭 네비게이션 */}
          <nav className="budget-nav-tabs" aria-label="분석 모드 전환">
            <button
              type="button"
              className={`nav-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 메뉴별 원가 현황
            </button>
            <button
              type="button"
              className={`nav-tab-item ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
            >
              ⚖️ 현재 vs 미래 변동 비교
            </button>
            <button
              type="button"
              className={`nav-tab-item ${activeTab === 'driver' ? 'active' : ''}`}
              onClick={() => setActiveTab('driver')}
            >
              🔥 원가 상승 요인 (Cost Driver)
            </button>
            <button
              type="button"
              className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              📅 2주간 식단 & 월간 시뮬레이션
            </button>
          </nav>

          {/* 로딩 & 에러 처리 */}
          {loading && (
            <div className="budget-glass-panel loading-panel">
              <div className="brand-spinner" />
              <p>KAMIS 실시간 시세 및 예측 데이터를 기반으로 원가를 정밀 분석 중입니다...</p>
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

          {!loading && !error && (
            <>
              {/* ========================================================
                  [탭 1] 📊 메뉴별 원가 현황 (현재 / 미래 예측)
                 ======================================================== */}
              {activeTab === 'overview' && (
                <div className="tab-fade-in">
                  {/* 상단 모드 전환 & 지표 카드 */}
                  <div className="tab-control-header">
                    <div className="brand-segmented-control">
                      <button
                        type="button"
                        className={`segment-btn ${costMode === 'CURRENT' ? 'active' : ''}`}
                        onClick={() => setCostMode('CURRENT')}
                      >
                        현재 실거래가 (COST-001)
                      </button>
                      <button
                        type="button"
                        className={`segment-btn ${costMode === 'FUTURE' ? 'active' : ''}`}
                        onClick={() => setCostMode('FUTURE')}
                      >
                        미래 예측가 (COST-005, {appliedParams.targetDate})
                      </button>
                    </div>
                    <span className="control-caption">
                      {costMode === 'CURRENT'
                        ? 'KAMIS 최신 실거래 식재료 가격 기준'
                        : `${appliedParams.targetDate} 7일 가격 예측 모델 적용`}
                    </span>
                  </div>

                  {/* 3대 요약 지표 카드 */}
                  <div className="budget-summary-grid">
                    <div className="budget-stat-card">
                      <span className="card-kicker">{costMode === 'CURRENT' ? '현재가' : '예측가'} 총비용</span>
                      <strong className="card-number">{formatCurrency(summary.totalCurrentCost)}</strong>
                      <span className="card-sub-info">회당 {appliedParams.mealCount}명 전체 메뉴 합산</span>
                    </div>

                    <div className="budget-stat-card">
                      <span className="card-kicker">목표 예산 총액</span>
                      <strong className="card-number">{formatCurrency(summary.totalTargetCost)}</strong>
                      <span className="card-sub-info">1인당 {formatWon(appliedParams.targetCost)} 기준</span>
                    </div>

                    <div className={`budget-stat-card ${summary.totalExceeded > 0 ? 'card-alert' : 'card-safe'}`}>
                      <div className="card-header-flex">
                        <span className="card-kicker">목표 초과액</span>
                        <span className={`status-pill ${summary.totalExceeded > 0 ? 'pill-danger' : 'pill-success'}`}>
                          {summary.totalExceeded > 0 ? `초과 ${summary.exceededCount}건` : '적정'}
                        </span>
                      </div>
                      <strong className={`card-number ${summary.totalExceeded > 0 ? 'text-red' : 'text-green'}`}>
                        {summary.totalExceeded > 0 ? `+${formatCurrency(summary.totalExceeded)}` : '0원 (안정 운영)'}
                      </strong>
                      <span className="card-sub-info">
                        {summary.totalExceeded > 0 ? '원가 절감 및 대체 품목 검토 권장' : '모든 메뉴가 목표 단가 내에 편성됨'}
                      </span>
                    </div>
                  </div>

                  {/* 메뉴 목록 테이블 */}
                  <div className="budget-glass-panel">
                    <div className="panel-header-bar">
                      <h3>메뉴별 원가 현황 목록</h3>
                      <span className="panel-header-tip">※ 행을 클릭하면 하단에 세부 식재료 단가 계산식이 표시됩니다.</span>
                    </div>

                    <div className="brand-table-wrapper">
                      <table className="brand-table">
                        <thead>
                          <tr>
                            <th>메뉴 ID</th>
                            <th>메뉴명</th>
                            <th>1인분 원가</th>
                            <th>총 예상 원가 ({appliedParams.mealCount}명)</th>
                            <th>목표 단가</th>
                            <th>상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {menuCosts.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="table-empty">
                                등록된 메뉴 및 원가 데이터가 없습니다.
                              </td>
                            </tr>
                          ) : (
                            menuCosts.map((item) => {
                              const isSelected = selectedMenuId === item.menuId;
                              const isExceeded = checkIsExceeded(item, appliedParams.targetCost);
                              const excAmt = getExceededAmount(item, appliedParams.targetCost);
                              return (
                                <tr
                                  key={item.menuId}
                                  className={`table-clickable-row ${isSelected ? 'row-active' : ''}`}
                                  onClick={() => handleSelectMenu(item.menuId)}
                                >
                                  <td><span className="id-tag">#{item.menuId}</span></td>
                                  <td><strong className="menu-name-text">{item.menuName}</strong></td>
                                  <td>{formatWon(item.costPerPerson)}</td>
                                  <td>{formatWon(item.totalMealCost)}</td>
                                  <td>{formatWon(item.targetCost || appliedParams.targetCost)}</td>
                                  <td>
                                    <span className={`status-pill ${isExceeded ? 'pill-danger' : 'pill-success'}`}>
                                      {isExceeded ? `⚠️ 초과 (+${formatWon(excAmt)})` : '✅ 적정'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 세부 식재료 단가 계산식 */}
                  <div className="budget-glass-panel formula-panel">
                    <div className="panel-header-bar">
                      <h3>
                        [식재료 단가 계산식]{' '}
                        {selectedMenuDetail
                          ? `${selectedMenuDetail.menuName} (#${selectedMenuDetail.menuId})`
                          : '메뉴를 선택해 주세요'}
                      </h3>
                      {selectedMenuDetail && (
                        <div className="formula-sum-badge">
                          <span>1인분 합계: <strong>{formatWon(selectedMenuDetail.costPerPerson)}</strong></span>
                          {checkIsExceeded(selectedMenuDetail, appliedParams.targetCost) && (
                            <span className="exceed-tag">
                              (+{formatWon(getExceededAmount(selectedMenuDetail, appliedParams.targetCost))} 초과)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {detailLoading ? (
                      <div className="detail-loading-box">식재료 데이터를 조회하는 중...</div>
                    ) : (
                      <div className="formula-cards-grid">
                        {selectedMenuDetail && selectedMenuDetail.details && selectedMenuDetail.details.length > 0 ? (
                          selectedMenuDetail.details.map((detail, idx) => (
                            <div key={detail.ingredientId || idx} className="formula-card-item">
                              <span className="ing-name">{detail.ingredientName}</span>
                              <span className="ing-calc">
                                {Number(detail.quantity).toLocaleString()}g × {Number(detail.standardUnitPrice).toLocaleString()}원/g
                              </span>
                              <strong className="ing-cost">{formatWon(detail.lineCost)}</strong>
                              {detail.priceDate && <small className="ing-date">{detail.priceDate}</small>}
                            </div>
                          ))
                        ) : (
                          <p className="table-empty">선택된 메뉴의 식재료 정보가 없습니다.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================
                  [탭 2] ⚖️ 현재 vs 미래 변동 비교
                 ======================================================== */}
              {activeTab === 'comparison' && (
                <div className="tab-fade-in">
                  <div className="budget-glass-panel">
                    <div className="panel-header-bar">
                      <div>
                        <h3>현재가 vs {appliedParams.targetDate} 미래 예측가 변동 비교</h3>
                        <p className="panel-desc">식재료 가격 예측에 따른 1인분 및 총 원가 인상액과 변동률(%)</p>
                      </div>
                    </div>

                    <div className="brand-table-wrapper">
                      <table className="brand-table">
                        <thead>
                          <tr>
                            <th>메뉴 ID</th>
                            <th>메뉴명</th>
                            <th>현재 1인분</th>
                            <th>미래 1인분 ({appliedParams.targetDate})</th>
                            <th>1인분 변동액</th>
                            <th>총 변동액 ({appliedParams.mealCount}명)</th>
                            <th>상승률 (%)</th>
                            <th>추세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisons.map((comp) => {
                            const isSelected = selectedMenuId === comp.menuId;
                            const isIncreased = checkIsIncreased(comp);
                            const isPlus = Number(comp.costDifference) > 0;
                            const isMinus = Number(comp.costDifference) < 0;
                            return (
                              <tr
                                key={comp.menuId}
                                className={`table-clickable-row ${isSelected ? 'row-active' : ''}`}
                                onClick={() => handleSelectMenu(comp.menuId)}
                              >
                                <td><span className="id-tag">#{comp.menuId}</span></td>
                                <td><strong className="menu-name-text">{comp.menuName}</strong></td>
                                <td>{formatWon(comp.currentCostPerPerson)}</td>
                                <td>{formatWon(comp.futureCostPerPerson)}</td>
                                <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                                  {isPlus ? `+${formatWon(comp.costDifference)}` : formatWon(comp.costDifference)}
                                </td>
                                <td className={isPlus ? 'text-red' : ''}>
                                  {isPlus ? `+${formatWon(comp.totalCostDifference)}` : formatWon(comp.totalCostDifference)}
                                </td>
                                <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                                  {isPlus ? `▲ +${comp.increaseRate}%` : isMinus ? `▼ ${comp.increaseRate}%` : '0.00%'}
                                </td>
                                <td>
                                  <span className={`status-pill ${isIncreased ? 'pill-danger' : 'pill-success'}`}>
                                    {isIncreased ? '원가 상승' : '안정/하락'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 선택 메뉴의 식재료별 상세 변동 */}
                  {selectedComparison && (
                    <div className="budget-glass-panel">
                      <div className="panel-header-bar">
                        <h3>[식재료별 단가 변동 내역] {selectedComparison.menuName}</h3>
                        <span className="formula-sum-badge">
                          총 인상률: <strong className={checkIsIncreased(selectedComparison) ? 'text-red' : 'text-green'}>
                            {selectedComparison.increaseRate}% ({formatWon(selectedComparison.costDifference)})
                          </strong>
                        </span>
                      </div>

                      <div className="brand-table-wrapper">
                        <table className="brand-table">
                          <thead>
                            <tr>
                              <th>식재료명</th>
                              <th>사용량</th>
                              <th>현재 단가</th>
                              <th>미래 예측단가</th>
                              <th>단가 변동률</th>
                              <th>1인분 원가 변동액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedComparison.ingredientComparisons?.map((ing) => {
                              const isUp = Number(ing.lineCostDifference) > 0;
                              const isDown = Number(ing.lineCostDifference) < 0;
                              return (
                                <tr key={ing.ingredientId}>
                                  <td><strong>{ing.ingredientName}</strong></td>
                                  <td>{Number(ing.quantity).toLocaleString()}g</td>
                                  <td>{formatWon(ing.currentUnitPrice)}</td>
                                  <td>{formatWon(ing.futureUnitPrice)}</td>
                                  <td className={isUp ? 'text-red' : isDown ? 'text-green' : ''}>
                                    {isUp ? `▲ +${ing.unitPriceIncreaseRate}%` : isDown ? `▼ ${ing.unitPriceIncreaseRate}%` : '0%'}
                                  </td>
                                  <td className={isUp ? 'text-red fw-bold' : isDown ? 'text-green' : ''}>
                                    {isUp ? `+${formatWon(ing.lineCostDifference)}` : formatWon(ing.lineCostDifference)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  [탭 3] 🔥 원가 상승 요인 (Cost Driver)
                 ======================================================== */}
              {activeTab === 'driver' && (
                <div className="tab-fade-in">
                  <div className="driver-cards-masonry">
                    {drivers.map((drv) => {
                      const isSelected = selectedMenuId === drv.menuId;
                      const top = drv.topDriver;
                      const isTopIncrease = checkIsCostIncrease(top);
                      return (
                        <div
                          key={drv.menuId}
                          className={`driver-card ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectMenu(drv.menuId)}
                        >
                          <div className="driver-card-head">
                            <span className="id-tag">#{drv.menuId}</span>
                            <strong className="driver-menu-title">{drv.menuName}</strong>
                            <span className="driver-rate-tag">▲ {drv.totalIncreaseRate}%</span>
                          </div>

                          <div className="driver-top-box">
                            <span className="driver-top-label">🚨 최대 인상 주도 재료 (Top 1)</span>
                            {top && isTopIncrease ? (
                              <div className="driver-top-detail">
                                <span className="top-name">{top.ingredientName}</span>
                                <div className="top-meta">
                                  <span>상승액: +{formatWon(top.lineCostDifference)}</span>
                                  <span className="text-red fw-bold">기여율: {top.contributionRate}%</span>
                                </div>
                              </div>
                            ) : (
                              <span className="safe-text">가격 상승 식재료 없음 (안정)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedDriver && (
                    <div className="budget-glass-panel">
                      <div className="panel-header-bar">
                        <h3>[원가 상승 기여도 전체 순위] {selectedDriver.menuName}</h3>
                        <span className="formula-sum-badge">
                          메뉴 총 인상액: <strong className="text-red">+{formatWon(selectedDriver.totalCostDifference)}</strong>
                        </span>
                      </div>

                      <div className="brand-table-wrapper">
                        <table className="brand-table">
                          <thead>
                            <tr>
                              <th>순위</th>
                              <th>식재료명</th>
                              <th>사용량</th>
                              <th>단가 변동</th>
                              <th>단가 변동률</th>
                              <th>원가 상승액</th>
                              <th>기여율 (%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDriver.rankedDrivers?.map((d) => {
                              const isCostUp = checkIsCostIncrease(d);
                              return (
                                <tr key={d.ingredientId} className={d.rank === 1 && isCostUp ? 'row-top-driver' : ''}>
                                  <td>
                                    <span className={`rank-pill ${d.rank === 1 ? 'rank-1' : ''}`}>#{d.rank}</span>
                                  </td>
                                  <td><strong>{d.ingredientName}</strong></td>
                                  <td>{Number(d.quantity).toLocaleString()}g</td>
                                  <td>{formatWon(d.currentUnitPrice)} ➔ {formatWon(d.futureUnitPrice)}</td>
                                  <td className={isCostUp ? 'text-red' : ''}>
                                    {isCostUp ? `▲ +${d.unitPriceIncreaseRate}%` : `${d.unitPriceIncreaseRate}%`}
                                  </td>
                                  <td className={isCostUp ? 'text-red fw-bold' : ''}>
                                    {isCostUp ? `+${formatWon(d.lineCostDifference)}` : formatWon(d.lineCostDifference)}
                                  </td>
                                  <td>
                                    <div className="driver-bar-wrapper">
                                      <div
                                        className="driver-bar-fill"
                                        style={{ width: `${Math.min(Number(d.contributionRate) || 0, 100)}%` }}
                                      />
                                      <span>{d.contributionRate}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  [탭 4] 📅 2주간 식단 & 월간 시뮬레이션 (COST-012, 013, 014 연동)
                 ======================================================== */}
              {activeTab === 'schedule' && (
                <div className="tab-fade-in">
                  {/* 월간 식단 식재료비 요약 카드 (COST-013) */}
                  {monthlyPlanCost && (
                    <div className="monthly-cost-summary-card">
                      <div className="monthly-cost-header">
                        <h4>📅 {monthlyPlanCost.yearMonth} 월간 총 예상 식재료비 (COST-013)</h4>
                        <span className="monthly-total-highlight">
                          총 예상액: <strong>{formatCurrency(monthlyPlanCost.monthlyTotalCost)}</strong>
                        </span>
                      </div>
                      <div className="weekly-breakdown-grid">
                        {monthlyPlanCost.weeklyCosts?.map((wk) => (
                          <div key={wk.weekNumber} className="weekly-cost-item">
                            <span className="wk-num">{wk.weekNumber}주차 ({wk.weekRange})</span>
                            <strong className="wk-cost">{formatCurrency(wk.weeklyTotalCost)}</strong>
                            <span className="wk-meal-count">{wk.mealPlanCount}개 식단 편성</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 이번 주 / 다음 주 2주간 일자별 식단 상세 (BUDG-002 & COST-012) */}
                  {budgetRisk ? (
                    <div className="schedule-two-grid">
                      <div className="schedule-pane">
                        <div className="schedule-pane-head">
                          <h4>이번 주 편성 식단</h4>
                          <span className="pane-range">{budgetRisk.thisWeekRange}</span>
                          <span className="pane-cost">{formatCurrency(budgetRisk.thisWeekExpectedCost)}</span>
                        </div>
                        <div className="schedule-items-list">
                          {budgetRisk.thisWeekDetails?.length === 0 ? (
                            <p className="table-empty">이번 주 편성된 식단이 없습니다.</p>
                          ) : (
                            budgetRisk.thisWeekDetails?.map((plan) => (
                              <div key={plan.mealPlanId} className="schedule-plan-card">
                                <div className="plan-meta-row">
                                  <span className="plan-date-text">{plan.planDate}</span>
                                  <span className="plan-slot-badge">{plan.mealSlot || plan.mealType}</span>
                                  <span className="plan-count-text">{plan.mealCount}명</span>
                                </div>
                                <div className="plan-main-row">
                                  <strong className="plan-menu-title">{plan.menuName}</strong>
                                  <span className="plan-price-text">{formatWon(plan.totalCost || plan.totalDailyCost)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="schedule-pane next-pane">
                        <div className="schedule-pane-head">
                          <h4>다음 주 편성 식단 (예측)</h4>
                          <span className="pane-range">{budgetRisk.nextWeekRange}</span>
                          <span className="pane-cost">{formatCurrency(budgetRisk.nextWeekExpectedCost)}</span>
                        </div>
                        <div className="schedule-items-list">
                          {budgetRisk.nextWeekDetails?.length === 0 ? (
                            <p className="table-empty">다음 주 편성된 식단이 없습니다.</p>
                          ) : (
                            budgetRisk.nextWeekDetails?.map((plan) => (
                              <div key={plan.mealPlanId} className="schedule-plan-card">
                                <div className="plan-meta-row">
                                  <span className="plan-date-text">{plan.planDate}</span>
                                  <span className="plan-slot-badge">{plan.mealSlot || plan.mealType}</span>
                                  <span className="plan-count-text">{plan.mealCount}명</span>
                                </div>
                                <div className="plan-main-row">
                                  <strong className="plan-menu-title">{plan.menuName}</strong>
                                  <span className="plan-price-text">{formatWon(plan.totalCost || plan.totalDailyCost)}</span>
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
              )}
            </>
          )}

          {/* 5. 하단 액션 버튼 바 (메인 화면 스타일) */}
          <section className="budget-bottom-actions">
            <button
              type="button"
              className="action-pill-btn secondary"
              onClick={() => navigate('/meal-plans')}
            >
              식단 관리로 이동
            </button>
            <button
              type="button"
              className="action-pill-btn secondary"
              onClick={() => navigate('/menus')}
            >
              대체 메뉴 검색
            </button>
            <button
              type="button"
              className="action-pill-btn primary"
              disabled={summary.totalExceeded > 0}
              title={
                summary.totalExceeded > 0
                  ? '목표 단가/예산을 초과한 항목이 있어 검토를 확정할 수 없습니다. 식단 수정 또는 대체 메뉴를 검토해 주세요.'
                  : '원가 및 예산 분석 검토를 확정합니다.'
              }
              onClick={() => alert('원가 및 예산 분석 검토가 완료되었습니다.')}
            >
              {summary.totalExceeded > 0 ? '목표 예산 초과 (확정 불가)' : '분석 검토 완료'}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
