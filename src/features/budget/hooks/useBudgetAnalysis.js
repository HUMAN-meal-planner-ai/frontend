import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllMenuCosts,
  getMenuCostDetail,
  getFutureMenuCost,
  getAllFutureMenuCosts,
  getMenuCostComparison,
  getAllMenuCostComparisons,
  getMenuCostDrivers,
  getAllMenuCostDrivers,
  getBudgetRisk,
  getWeeklyMealPlanCost,
  getMonthlyMealPlanCost,
  getBudgetUsage,
  getMenuRisk,
  getAllMenuRisks,
} from '../api/costApi';
import {
  reevaluateBudget,
  getReplacementCandidates,
  getUnreadAlertCount,
  getBudgetAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  verifyWeeklyPlanBudget,
} from '../api/budgetAutomationApi';
import {
  getMondayOfWeek,
  checkIsExceeded,
  getExceededAmount,
} from '../utils/budgetUtils';

/**
 * [예산 분석 & 자동화 통합 커스텀 훅]
 * 원가 계산, 비교, 위험 진단 데이터뿐만 아니라
 * AUTO-002(예산 재평가/알림), AUTO-004(주간식단 재확인), AUTO-006(변경 검토 후보 탐지)을 통합 관리합니다.
 */
export function useBudgetAnalysis(facilityId = 1) {
  // 1. 입력 필터 폼 상태
  const [filterMealCount, setFilterMealCount] = useState(100);
  const [filterTargetCost, setFilterTargetCost] = useState(2500);
  const [filterTargetDate, setFilterTargetDate] = useState('2026-09-20');
  const [filterBaseDate, setFilterBaseDate] = useState('2026-09-17');

  // 실제 조회에 적용된 기준 파라미터 상태
  const [appliedParams, setAppliedParams] = useState({
    mealCount: 100,
    targetCost: 2500,
    targetDate: '2026-09-20',
    baseDate: '2026-09-17',
  });

  // 2. 탭 및 원가 모드 상태
  const [activeTab, setActiveTab] = useState('overview');
  const [costMode, setCostMode] = useState('CURRENT');

  // 3. 서버 응답 도메인 데이터
  const [menuCosts, setMenuCosts] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [menuRisks, setMenuRisks] = useState([]);
  const [budgetRisk, setBudgetRisk] = useState(null);
  const [budgetUsage, setBudgetUsage] = useState(null);
  const [monthlyPlanCost, setMonthlyPlanCost] = useState(null);
  const [weeklyPlanCost, setWeeklyPlanCost] = useState(null);

  // 4. 자동화(Automation) 데이터 상태
  const [replacementCandidates, setReplacementCandidates] = useState(null);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [alertList, setAlertList] = useState([]);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [reverificationResult, setReverificationResult] = useState(null);

  // 5. 단건 상세 선택 상태
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedMenuRisk, setSelectedMenuRisk] = useState(null);

  // 로딩 & 에러 상태
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // 단건 메뉴 상세 조회
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

        const riskData = await getMenuRisk(menuId, { targetDate: tDate }).catch((e) => {
          console.warn(`[getMenuRisk #${menuId}] 실패:`, e);
          return null;
        });
        setSelectedMenuRisk(riskData);
      } catch (err) {
        console.error(`[메뉴 #${menuId} 상세 조회 실패]:`, err);
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  // 전체 데이터 일괄 조회 (자동화 API 포함)
  const fetchAllData = useCallback(
    async (count, target, tDate, bDate, facId, mode) => {
      setLoading(true);
      setError(null);
      const currentYearMonth = bDate ? bDate.slice(0, 7) : '2026-09';
      const weekStartDate = getMondayOfWeek(bDate);

      try {
        const [
          costData,
          compData,
          driverData,
          riskListData,
          riskData,
          usageData,
          monthlyData,
          weeklyData,
          candidatesData,
          unreadCountData,
          alertsData,
        ] = await Promise.all([
          mode === 'CURRENT'
            ? getAllMenuCosts({ mealCount: count, targetCost: target })
            : getAllFutureMenuCosts({ targetDate: tDate, mealCount: count, targetCost: target }),
          getAllMenuCostComparisons({ targetDate: tDate, mealCount: count }),
          getAllMenuCostDrivers({ targetDate: tDate }),
          getAllMenuRisks({ targetDate: tDate }).catch((e) => {
            console.warn('[getAllMenuRisks] 실패:', e);
            return [];
          }),
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
          getWeeklyMealPlanCost({ facilityId: facId, startDate: weekStartDate }).catch((e) => {
            console.warn('[getWeeklyMealPlanCost] 실패:', e);
            return null;
          }),
          // AUTO-006 변경 검토 후보 자동 탐지
          getReplacementCandidates({
            facilityId: facId,
            weekStartDate,
            targetDate: tDate,
            mealCount: count,
            targetCost: target,
          }).catch((e) => {
            console.warn('[getReplacementCandidates] 실패:', e);
            return null;
          }),
          // 미확인 알림 건수 조회
          getUnreadAlertCount(facId).catch((e) => {
            console.warn('[getUnreadAlertCount] 실패:', e);
            return { unreadCount: 0 };
          }),
          // 알림 목록 조회
          getBudgetAlerts({ facilityId: facId }).catch((e) => {
            console.warn('[getBudgetAlerts] 실패:', e);
            return [];
          }),
        ]);

        setMenuCosts(costData || []);
        setComparisons(compData || []);
        setDrivers(driverData || []);
        setMenuRisks(riskListData || []);
        setBudgetRisk(riskData);
        setBudgetUsage(usageData);
        setMonthlyPlanCost(monthlyData);
        setWeeklyPlanCost(weeklyData);
        setReplacementCandidates(candidatesData);
        setUnreadAlertCount(unreadCountData?.unreadCount || 0);
        setAlertList(alertsData || []);

        if (costData && costData.length > 0) {
          const defaultMenu = costData.find((m) => checkIsExceeded(m, target)) || costData[0];
          setSelectedMenuId(defaultMenu.menuId);
          fetchSingleMenuDetail(defaultMenu.menuId, mode, count, target, tDate);
        } else {
          setSelectedMenuId(null);
          setSelectedMenuDetail(null);
          setSelectedComparison(null);
          setSelectedDriver(null);
          setSelectedMenuRisk(null);
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

  // [조건 적용] 핸들러
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

  // 메뉴 선택 핸들러
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

  // [AUTO-002] 실시간 예산 초과 위험 재평가 및 알림 트리거 핸들러
  const handleTriggerReevaluation = async () => {
    setIsReevaluating(true);
    try {
      const result = await reevaluateBudget({
        facilityId,
        baseDate: appliedParams.baseDate,
        autoSaveAlert: true,
      });

      // 재평가 결과 반영
      if (result?.riskDetails) {
        setBudgetRisk(result.riskDetails);
      }

      // 미확인 알림 건수 및 알림 목록 새로고침
      const [countRes, alertsRes] = await Promise.all([
        getUnreadAlertCount(facilityId),
        getBudgetAlerts({ facilityId }),
      ]);
      setUnreadAlertCount(countRes?.unreadCount || 0);
      setAlertList(alertsRes || []);

      return result;
    } catch (err) {
      console.error('[AUTO-002 예산 재평가 실패]:', err);
      throw err;
    } finally {
      setIsReevaluating(false);
    }
  };

  // [AUTO-004] 재평가된 주간 식단 예산 재확인 핸들러
  const handleVerifyWeeklyPlan = async (reconfiguredItems = []) => {
    try {
      const weekStartDate = getMondayOfWeek(appliedParams.baseDate);
      const res = await verifyWeeklyPlanBudget({
        facilityId,
        weekStartDate,
        baseDate: appliedParams.baseDate,
        mealCount: appliedParams.mealCount,
        reconfiguredItems,
        autoUpdateAlert: true,
      });
      setReverificationResult(res);

      if (res.isRiskResolved) {
        const countRes = await getUnreadAlertCount(facilityId);
        setUnreadAlertCount(countRes?.unreadCount || 0);
      }
      return res;
    } catch (err) {
      console.error('[AUTO-004 식단 재확인 실패]:', err);
      throw err;
    }
  };

  // 알림 읽음 처리 핸들러
  const handleMarkAlertAsRead = async (alertId) => {
    try {
      await markAlertAsRead(alertId);
      setAlertList((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, isRead: true } : a))
      );
      setUnreadAlertCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[알림 읽음 처리 실패]:', err);
    }
  };

  // 전체 알림 읽음 처리 핸들러
  const handleMarkAllAlertsAsRead = async () => {
    try {
      await markAllAlertsAsRead(facilityId);
      setAlertList((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadAlertCount(0);
    } catch (err) {
      console.error('[전체 알림 읽음 처리 실패]:', err);
    }
  };

  // 메뉴 원가 요약 통계 계산
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

  // 예산 위험 상태 클래스 계산
  const riskStatusClass = useMemo(() => {
    const level = budgetRisk?.riskLevel || budgetUsage?.status || 'SAFE';
    if (level === 'WARNING' || level === 'DANGER' || level === 'EXCEEDED') return 'danger';
    if (level === 'CAUTION') return 'warning';
    return 'stable';
  }, [budgetRisk, budgetUsage]);

  return {
    // 폼 상태 & setters
    filterMealCount,
    setFilterMealCount,
    filterTargetCost,
    setFilterTargetCost,
    filterTargetDate,
    setFilterTargetDate,
    filterBaseDate,
    setFilterBaseDate,
    appliedParams,

    // 탭 & 모드
    activeTab,
    setActiveTab,
    costMode,
    setCostMode,

    // 원가 데이터
    menuCosts,
    comparisons,
    drivers,
    menuRisks,
    budgetRisk,
    budgetUsage,
    monthlyPlanCost,
    weeklyPlanCost,

    // 자동화(Automation) 데이터
    replacementCandidates,
    unreadAlertCount,
    alertList,
    isReevaluating,
    reverificationResult,

    // 단건 선택 데이터
    selectedMenuId,
    selectedMenuDetail,
    selectedComparison,
    selectedDriver,
    selectedMenuRisk,

    // 로딩 & 에러
    loading,
    detailLoading,
    error,

    // 계산된 파생 데이터
    summary,
    riskStatusClass,

    // 액션 핸들러
    handleApplyFilters,
    handleSelectMenu,
    handleTriggerReevaluation,
    handleVerifyWeeklyPlan,
    handleMarkAlertAsRead,
    handleMarkAllAlertsAsRead,
  };
}
