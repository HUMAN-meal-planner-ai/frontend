import { useEffect, useState } from 'react';
import { formatCurrency, formatWon, checkIsRisk } from '../utils/budgetUtils';

export default function BudgetRiskHero({
  budgetRisk,
  budgetUsage,
  riskStatusClass,
  appliedParams,
  unreadAlertCount = 0,
  isReevaluating = false,
  onTriggerReevaluation,
  onOpenAlertModal,
  executedAmountSaving = false,
  executedAmountMessage = '',
  executedAmountError = '',
  onSaveExecutedAmount,
}) {
  const [executedAmountInput, setExecutedAmountInput] = useState('0');
  const budgetMonth = budgetUsage?.yearMonth
    || budgetRisk?.budgetMonth
    || appliedParams.baseDate.slice(0, 7);

  useEffect(() => {
    if (budgetUsage?.actualSpentCost != null) {
      setExecutedAmountInput(String(budgetUsage.actualSpentCost));
    }
  }, [budgetUsage?.actualSpentCost]);

  if (!budgetRisk && !budgetUsage && !onSaveExecutedAmount) return null;

  return (
    <section className={`budget-risk-card-hero ${riskStatusClass}`}>
      <div className="risk-card-top">
        <div className="risk-badge-group">
          <span className="risk-level-tag">
            {budgetRisk?.riskLevel === 'WARNING' || budgetUsage?.status === 'EXCEEDED' || budgetUsage?.status === 'WARNING'
              ? '🚨 예산 초과 위험 (WARNING)'
              : budgetRisk?.riskLevel === 'CAUTION' || budgetUsage?.status === 'CAUTION'
                ? '⚠️ 예산 주의 (CAUTION)'
                : '✅ 예산 안정 (SAFE)'}
          </span>
          <span className="risk-facility-info">
            {budgetRisk?.facilityName || budgetUsage?.facilityName || '내 시설'} · {budgetMonth} 기준
          </span>
          {unreadAlertCount > 0 && (
            <button
              type="button"
              className="risk-unread-badge clickable-badge"
              onClick={onOpenAlertModal}
              title={`미확인 예산 경고 알림 ${unreadAlertCount}건 확인하기`}
            >
              🔔 미확인 알림 {unreadAlertCount}
            </button>
          )}
        </div>

        <div className="risk-top-actions">
          {budgetUsage && (
            <div className="budget-usage-pill">
              <span>기 집행: </span>
              <strong className="text-green">
                {budgetUsage.currentUsageRate}%
              </strong>
              <span className="pill-divider" />
              <span>월말 예상 사용률: </span>
              <strong className={Number(budgetUsage.expectedUsageRate) > 100 ? 'text-red' : 'text-green'}>
                {budgetUsage.expectedUsageRate}%
              </strong>
            </div>
          )}

          {onTriggerReevaluation && (
            <button
              type="button"
              className="action-pill-btn auto-reeval-btn"
              onClick={onTriggerReevaluation}
              disabled={isReevaluating}
              title="향후 2주간 식단 비용과 월 잔여 예산을 바탕으로 예산 초과 위험을 실시간 재평가하고 알림을 갱신합니다. (AUTO-002)"
            >
              {isReevaluating ? (
                <>
                  <span className="brand-spinner-mini" /> 재평가 중...
                </>
              ) : (
                '🔄 실시간 예산 재평가'
              )}
            </button>
          )}
        </div>
      </div>

      {/* 종합 메시지 및 권고 안내 */}
      <p className="risk-message-text">
        {budgetRisk?.warningMessage || budgetUsage?.statusMessage}
      </p>

      {onSaveExecutedAmount && (
        <div className="manual-executed-amount-panel">
          <div>
            <strong>기 집행액 수동 입력</strong>
            <span>{budgetUsage
              ? '결제·영수증 연동 없이 사용자가 입력한 금액을 예산 분석에 반영합니다.'
              : '분석 데이터를 불러오지 못했지만, 해당 월의 집행액은 직접 입력할 수 있습니다.'}</span>
          </div>
          <div className="manual-executed-amount-form">
            <label>
              <span>{budgetMonth} 집행액</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={executedAmountInput}
                onChange={(event) => setExecutedAmountInput(event.target.value)}
                aria-label="기 집행액"
              />
              <em>원</em>
            </label>
            <button type="button" onClick={() => onSaveExecutedAmount(executedAmountInput)} disabled={executedAmountSaving}>
              {executedAmountSaving ? '저장 중...' : '집행액 저장'}
            </button>
          </div>
          {executedAmountMessage && <p className="manual-executed-message success">{executedAmountMessage}</p>}
          {executedAmountError && <p className="manual-executed-message error" role="alert">{executedAmountError}</p>}
        </div>
      )}

      {/* 월 예산 소진 프로그레스 바 */}
      {budgetUsage && (
        <div className="budget-usage-progress-container">
          <div className="progress-labels-row">
            <span>집행: {formatWon(budgetUsage.actualSpentCost)} ({budgetUsage.currentUsageRate}%)</span>
            <span>총 예상: {formatWon(budgetUsage.totalExpectedCost)} / {formatWon(budgetUsage.monthlyBudget)}</span>
          </div>
          <div className="budget-progress-track">
            <div
              className="budget-progress-bar-spent"
              style={{ width: `${Math.min(Number(budgetUsage.currentUsageRate) || 0, 100)}%` }}
              title={`기 집행: ${budgetUsage.currentUsageRate}%`}
            />
            <div
              className={`budget-progress-bar-projected ${Number(budgetUsage.expectedUsageRate) > 100 ? 'bar-exceeded' : ''}`}
              style={{
                width: `${Math.min(
                  Math.max((Number(budgetUsage.expectedUsageRate) || 0) - (Number(budgetUsage.currentUsageRate) || 0), 0),
                  100 - Math.min(Number(budgetUsage.currentUsageRate) || 0, 100)
                )}%`,
              }}
              title={`월말 잔여 예상: ${formatWon(budgetUsage.projectedRemainingCost)}`}
            />
          </div>
        </div>
      )}

      {/* 4대 주요 재무 지표 그리드 */}
      <div className="risk-stats-grid">
        <div className="risk-stat-box">
          <span className="stat-label">월 배정 예산</span>
          <strong className="stat-val">{formatCurrency(budgetRisk?.monthlyBudget || budgetUsage?.monthlyBudget)}</strong>
        </div>
        <div className="risk-stat-box">
          <span className="stat-label">기 집행액</span>
          <strong className="stat-val">{formatCurrency(budgetRisk?.currentSpentCost || budgetUsage?.actualSpentCost)}</strong>
        </div>
        <div className="risk-stat-box">
          <span className="stat-label">2주간 총 예상 소요액</span>
          <strong className="stat-val highlight">{formatCurrency(budgetRisk?.twoWeeksTotalExpectedCost)}</strong>
        </div>
        <div className="risk-stat-box">
          <span className="stat-label">적용 후 잔여 예산</span>
          <strong className={`stat-val ${checkIsRisk(budgetRisk) || budgetUsage?.isExceeded ? 'val-danger' : 'val-success'}`}>
            {formatCurrency(budgetRisk?.projectedRemainingBudget || budgetUsage?.remainingBudget)}
          </strong>
        </div>
      </div>
    </section>
  );
}
