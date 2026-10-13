import { useState, useEffect, useMemo } from 'react';
import { getMenuReplacementAnalysis } from '../api/budgetApi';
import { replaceMealPlanMenu } from '../../mealplan/api/mealPlanApi';

/**
 * [대체 메뉴 교체 분석 및 반영 비즈니스 로직 훅]
 * - 대체 메뉴 후보군 분석 조회
 * - 교체 대상 선택 상태 관리
 * - 식단 교체 API 호출 및 피드백 처리
 */
export function useMenuReplacement({
  isOpen,
  onClose,
  originalMenu,
  appliedParams,
  facilityId = 1,
  onReplacementSuccess,
}) {
  const [selectedReplacementId, setSelectedReplacementId] = useState(null);
  const [applyToAllOccurrences, setApplyToAllOccurrences] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 모달 열림 상태 또는 대상 메뉴 변경 시 선택 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedReplacementId(null);
      setApplyToAllOccurrences(false);
      setAnalysisData(null);
      setError(null);
    }
  }, [isOpen, originalMenu?.menuId]);

  // 대체 메뉴 분석 데이터 페칭
  useEffect(() => {
    if (!isOpen || !originalMenu?.menuId) return;

    let active = true;
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMenuReplacementAnalysis({
          originalMenuId: originalMenu.menuId,
          replacementMenuId: selectedReplacementId || undefined,
          facilityId,
          targetDate: appliedParams?.targetDate,
          mealCount: appliedParams?.mealCount,
          applyToAllOccurrences,
        });

        if (!active) return;
        setAnalysisData(data);
        if (!selectedReplacementId && data?.selectedReplacement?.replacementMenuId) {
          setSelectedReplacementId(data.selectedReplacement.replacementMenuId);
        }
      } catch (err) {
        if (!active) return;
        console.error('[BUDG-005 대체 메뉴 분석 실패]:', err);
        setError('대체 메뉴 비용 분석 데이터를 불러오지 못했습니다.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAnalysis();
    return () => {
      active = false;
    };
  }, [
    isOpen,
    originalMenu?.menuId,
    selectedReplacementId,
    applyToAllOccurrences,
    facilityId,
    appliedParams?.targetDate,
    appliedParams?.mealCount,
  ]);

  // 후보 목록 및 선택된 대체 메뉴 파생 데이터
  const candidateList = useMemo(() => analysisData?.candidateReplacements || [], [analysisData]);
  const selectedRep = useMemo(() => {
    return analysisData?.selectedReplacement || (candidateList.length > 0 ? candidateList[0] : null);
  }, [analysisData, candidateList]);
  const weeklyImpact = useMemo(() => analysisData?.weeklyImpact || null, [analysisData]);

  // 식단에 대체 메뉴 반영 실행
  const handleApplyReplacement = async () => {
    const repl = selectedRep || candidateList.find((c) => c.replacementMenuId === selectedReplacementId);
    if (!repl || !repl.replacementMenuId) {
      alert('반영할 대체 메뉴를 선택해 주세요.');
      return;
    }

    const replName = repl.replacementMenuName || '대체 메뉴';
    const confirmMsg = applyToAllOccurrences
      ? `현재 주간 식단 내 [${originalMenu.menuName}] 메뉴를 모두 [${replName}](으)로 일괄 교체하시겠습니까?`
      : `식단 내 [${originalMenu.menuName}] 메뉴를 [${replName}](으)로 교체하시겠습니까?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        originalMenuId: originalMenu.menuId,
        replacementMenuId: repl.replacementMenuId,
        facilityId: Number(facilityId) || 1,
        planId: originalMenu.planId || undefined,
        targetDate: appliedParams?.targetDate || undefined,
        weekStartDate: appliedParams?.baseDate || undefined,
        applyToAllOccurrences: Boolean(applyToAllOccurrences),
      };

      const result = await replaceMealPlanMenu(payload);
      alert(result?.message || `[${replName}] 대체 메뉴가 식단에 성공적으로 반영되었습니다.`);
      if (onReplacementSuccess) {
        onReplacementSuccess(result);
      }
      onClose();
    } catch (err) {
      console.error('[대체 메뉴 식단 반영 실패]:', err);
      alert(err.response?.data?.message || '식단에 대체 메뉴를 반영하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedReplacementId,
    setSelectedReplacementId,
    applyToAllOccurrences,
    setApplyToAllOccurrences,
    analysisData,
    candidateList,
    selectedRep,
    weeklyImpact,
    loading,
    submitting,
    error,
    handleApplyReplacement,
  };
}
