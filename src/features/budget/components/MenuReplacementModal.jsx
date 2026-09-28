import React, { useState, useEffect } from 'react';
import { formatCurrency, formatWon } from '../utils/budgetUtils';
import { getMenuReplacementAnalysis } from '../api/budgetApi';

/**
 * [BUDG-005] 대체 메뉴 적용 전후 비용 차이 및 절감액 종합 시뮬레이션 모달
 */
export default function MenuReplacementModal({
  isOpen,
  onClose,
  originalMenu,
  appliedParams,
  facilityId = 1,
}) {
  const [selectedReplacementId, setSelectedReplacementId] = useState(null);
  const [applyToAllOccurrences, setApplyToAllOccurrences] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 모달 열리거나 원본 메뉴/조건 변경 시 대체 분석 조회
  useEffect(() => {
    if (!isOpen || !originalMenu) return;

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMenuReplacementAnalysis({
          originalMenuId: originalMenu.menuId,
          replacementMenuId: selectedReplacementId || undefined,
          facilityId,
          targetDate: appliedParams.targetDate,
          mealCount: appliedParams.mealCount,
          applyToAllOccurrences,
        });
        setAnalysisData(data);
        if (!selectedReplacementId && data?.selectedReplacement?.replacementMenuId) {
          setSelectedReplacementId(data.selectedReplacement.replacementMenuId);
        }
      } catch (err) {
        console.error('[BUDG-005 대체 메뉴 분석 실패]:', err);
        setError('대체 메뉴 비용 분석 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [isOpen, originalMenu, selectedReplacementId, applyToAllOccurrences, facilityId, appliedParams]);

  if (!isOpen || !originalMenu) return null;

  const candidateList = analysisData?.candidateReplacements || [];
  const selectedRep = analysisData?.selectedReplacement || (candidateList.length > 0 ? candidateList[0] : null);
  const weeklyImpact = analysisData?.weeklyImpact;

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div
        className="budget-modal-card replacement-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="replacement-modal-title"
      >
        {/* 모달 상단 헤더 */}
        <div className="budget-modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🔄</span>
            <div>
              <h3 id="replacement-modal-title">대체 메뉴 원가 비교 & 절감액 분석</h3>
              <p className="modal-sub-desc">
                [BUDG-005] 고비용/위험 메뉴를 최적의 대체 메뉴로 교체했을 때의 1인분 단가 차이 및 주간·월간 예산 절감 효과를 분석합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 원본 메뉴 vs 교체 옵션 요약 바 */}
        <div className="replacement-source-banner">
          <div className="source-menu-info">
            <span className="source-tag">현재 대상 메뉴</span>
            <strong className="source-name">
              #{originalMenu.menuId} {originalMenu.menuName}
            </strong>
            <span className="source-cost">
              1인분: <strong>{formatWon(originalMenu.futureCostPerPerson || originalMenu.costPerPerson)}</strong>
            </span>
          </div>

          <div className="replacement-toggle-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyToAllOccurrences}
                onChange={(e) => setApplyToAllOccurrences(e.target.checked)}
              />
              <span>주간 식단 내 동일 메뉴 일괄 교체 시뮬레이션</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="replacement-modal-loading">
            <div className="brand-spinner" />
            <p>대체 메뉴 후보군 단가 및 예산 절감 효과를 정밀 계산 중입니다...</p>
          </div>
        ) : error ? (
          <div className="replacement-modal-error">
            <p>⚠️ {error}</p>
          </div>
        ) : (
          <div className="replacement-modal-body">
            {/* 1. 추천 대체 메뉴 후보군 그리드 */}
            <div className="replacement-candidates-section">
              <div className="section-head-bar">
                <h4>🎯 추천 대체 메뉴 후보군 (절감액 순 정렬)</h4>
                <span className="badge-count">후보 {candidateList.length}건</span>
              </div>

              {candidateList.length === 0 ? (
                <p className="table-empty">추천 가능한 대체 메뉴가 없습니다.</p>
              ) : (
                <div className="candidate-select-grid">
                  {candidateList.map((cand) => {
                    const isSelected = (selectedRep?.replacementMenuId === cand.replacementMenuId) || (selectedReplacementId === cand.replacementMenuId);
                    const isSavings = Number(cand.savingsPerPerson || cand.totalSavings) > 0;
                    const isRisk = cand.isRisk || cand.riskLevel === 'WARNING';

                    return (
                      <div
                        key={cand.replacementMenuId}
                        className={`rep-candidate-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedReplacementId(cand.replacementMenuId)}
                      >
                        <div className="rep-card-top">
                          <span className="rep-slot-tag">{cand.slotName || cand.slot || '메뉴'}</span>
                          <strong className="rep-name">{cand.replacementMenuName}</strong>
                          <span className={`rep-savings-badge ${isSavings ? 'badge-savings' : 'badge-increase'}`}>
                            {isSavings ? `절감 +${formatWon(cand.savingsPerPerson)}/인` : '원가 상승'}
                          </span>
                        </div>

                        <div className="rep-meta-row">
                          <span>1인 단가: <strong>{formatWon(cand.replacementCostPerPerson)}</strong></span>
                          <span className="pill-divider" />
                          <span className={isSavings ? 'text-green fw-bold' : 'text-red'}>
                            총 절감: {isSavings ? `+${formatWon(cand.totalSavings)}` : formatWon(cand.totalSavings)}
                          </span>
                        </div>

                        <div className="rep-risk-row">
                          <span className={`rep-risk-pill ${cand.riskLevel ? cand.riskLevel.toLowerCase() : 'safe'}`}>
                            {isRisk ? '🚨 가격위험' : '✅ 가격안정'}
                          </span>
                          {cand.diffRate && (
                            <span className="rep-diff-rate">
                              단가 변동 {Number(cand.diffRate) > 0 ? `-${cand.diffRate}%` : `+${Math.abs(cand.diffRate)}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. 선택된 대체 메뉴 적용 전후 비교 상세 & 예산 영향도 */}
            {selectedRep && (
              <div className="replacement-impact-detail-section">
                <div className="impact-cards-row">
                  {/* 단가 및 끼니 비용 비교 카드 */}
                  <div className="impact-box">
                    <h5>📊 단가 및 끼니 총비용 변화</h5>
                    <div className="impact-metric-list">
                      <div className="impact-metric-item">
                        <span>1인분 예상 단가</span>
                        <div className="val-flow">
                          <del>{formatWon(analysisData.originalCostPerPerson)}</del>
                          <span>➔</span>
                          <strong className="text-green">{formatWon(selectedRep.replacementCostPerPerson)}</strong>
                          <span className="savings-highlight">({selectedRep.savingsPerPerson > 0 ? `-${formatWon(selectedRep.savingsPerPerson)} 절감` : '+비용 추가'})</span>
                        </div>
                      </div>

                      <div className="impact-metric-item">
                        <span>한 끼 식수 총비용 ({appliedParams.mealCount}명)</span>
                        <div className="val-flow">
                          <del>{formatWon(analysisData.beforeMealTotalCost)}</del>
                          <span>➔</span>
                          <strong className="text-green">{formatWon(selectedRep.afterMealTotalCost)}</strong>
                          <span className="savings-highlight">({selectedRep.totalSavings > 0 ? `총 ${formatWon(selectedRep.totalSavings)} 절감` : '+비용 추가'})</span>
                        </div>
                      </div>

                      <div className="impact-metric-item">
                        <span>끼니 비용 절감율</span>
                        <strong className="text-green">{selectedRep.savingsRate || selectedRep.diffRate}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* 주간 식단 및 월 예산 절감 영향도 카드 */}
                  {weeklyImpact && (
                    <div className="impact-box weekly-box">
                      <h5>📅 주간 식단 & 월 예산 영향도</h5>
                      <div className="impact-metric-list">
                        <div className="impact-metric-item">
                          <span>주간 식단 총 식재료비</span>
                          <div className="val-flow">
                            <del>{formatCurrency(weeklyImpact.beforeWeeklyTotalCost)}</del>
                            <span>➔</span>
                            <strong className="text-green">{formatCurrency(weeklyImpact.afterWeeklyTotalCost)}</strong>
                          </div>
                        </div>

                        <div className="impact-metric-item">
                          <span>주간 순 절감액</span>
                          <strong className="text-green fw-bold">
                            +{formatCurrency(weeklyImpact.weeklyTotalSavings)} ({weeklyImpact.weeklySavingsRate}%)
                          </strong>
                        </div>

                        <div className="impact-metric-item">
                          <span>월 예산 사용률 변동</span>
                          <strong className="text-green">
                            {weeklyImpact.budgetUsageRateChange || `${weeklyImpact.beforeUsageRate}% ➔ ${weeklyImpact.afterUsageRate}%`}
                          </strong>
                        </div>

                        <div className="impact-metric-item">
                          <span>주간 내 적용 끼니 수</span>
                          <span>총 <strong>{weeklyImpact.replacedOccurrences}회</strong> ({weeklyImpact.replacedMealCount}명분)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {analysisData.analysisSummary && (
                  <div className="impact-summary-callout">
                    💡 <strong>종합 분석:</strong> {analysisData.analysisSummary}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 모달 하단 버튼 바 */}
        <div className="budget-modal-footer">
          <button type="button" className="action-pill-btn secondary" onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className="action-pill-btn primary"
            onClick={() => {
              alert(`[${selectedRep?.replacementMenuName || '대체 메뉴'}] 교체 시뮬레이션 결과가 반영되었습니다.`);
              onClose();
            }}
          >
            식단에 대체 메뉴 반영하기
          </button>
        </div>
      </div>
    </div>
  );
}
