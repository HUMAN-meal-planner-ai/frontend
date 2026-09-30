import React, { useState } from 'react';
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
}) {
  const [simulationPeriod, setSimulationPeriod] = useState('1w'); // '1w' | '2w'

  if (!budgetRisk && !budgetUsage) return null;

  // 1주 / 2주 선택에 따른 지표 결정
  const isOneWeek = simulationPeriod === '1w';

  const currentRiskLevel = isOneWeek
    ? (budgetRisk?.oneWeekRiskLevel || budgetRisk?.riskLevel || 'SAFE')
    : (budgetRisk?.twoWeeksRiskLevel || budgetRisk?.riskLevel || 'SAFE');

  const currentWarningMessage = isOneWeek
    ? (budgetRisk?.oneWeekWarningMessage || budgetRisk?.warningMessage || budgetUsage?.statusMessage)
    : (budgetRisk?.twoWeeksWarningMessage || budgetRisk?.warningMessage || budgetUsage?.statusMessage);

  const currentExpectedCost = isOneWeek
    ? (budgetRisk?.oneWeekExpectedCost || budgetRisk?.thisWeekExpectedCost)
    : (budgetRisk?.twoWeeksTotalExpectedCost);

  const currentProjectedRemaining = isOneWeek
    ? (budgetRisk?.oneWeekProjectedRemainingBudget ?? budgetRisk?.projectedRemainingBudget)
    : (budgetRisk?.twoWeeksProjectedRemainingBudget ?? budgetRisk?.projectedRemainingBudget);

  const isCurrentRisk = isOneWeek
    ? (budgetRisk?.oneWeekIsRisk ?? checkIsRisk(budgetRisk))
    : (budgetRisk?.twoWeeksIsRisk ?? checkIsRisk(budgetRisk));

  return (
    <section className={`budget-risk-card-hero ${riskStatusClass}`}>
      <div className="risk-card-top">
        <div className="risk-badge-group">
          <span className="risk-level-tag">
            {currentRiskLevel === 'WARNING' || budgetUsage?.status === 'EXCEEDED' || budgetUsage?.status === 'WARNING'
              ? '🚨 예산 초과 위험 (WARNING)'
              : currentRiskLevel === 'CAUTION' || budgetUsage?.status === 'CAUTION'
                ? '⚠️ 예산 주의 (CAUTION)'
                : '✅ 예산 안정 (SAFE)'}
          </span>
          <span className="risk-facility-info">
            {budgetRisk?.facilityName || budgetUsage?.facilityName || '시설 1'} · {budgetRisk?.budgetMonth || budgetUsage?.yearMonth || appliedParams.baseDate?.slice(0, 7)} 기준
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
          {/* 1주 / 2주 시뮬레이션 기간 전환 탭 */}
          <div className="simulation-period-toggle" role="tablist" aria-label="시뮬레이션 기간 선택">
            <button
              type="button"
              role="tab"
              aria-selected={isOneWeek}
              className={`period-toggle-btn ${isOneWeek ? 'active' : ''}`}
              onClick={() => setSimulationPeriod('1w')}
            >
              1주간 시뮬레이션
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isOneWeek}
              className={`period-toggle-btn ${!isOneWeek ? 'active' : ''}`}
              onClick={() => setSimulationPeriod('2w')}
            >
              2주간 시뮬레이션
            </button>
          </div>

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
              title="향후 식단 비용과 잔여 예산을 바탕으로 예산 초과 위험을 실시간 재평가하고 알림을 갱신합니다."
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
        {currentWarningMessage}
      </p>

      {/* 월 예산 소진 프로그레스 바 (월 예산은 그대로 유지) */}
      {budgetUsage && (
        <div className="budget-usage-progress-container">
          <div className="progress-labels-row">
            <span>집행: {formatWon(budgetUsage.actualSpentCost)} ({budgetUsage.currentUsageRate}%)</span>
            <span>월 예상: {formatWon(budgetUsage.totalExpectedCost)} / {formatWon(budgetUsage.monthlyBudget)}</span>
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
          <span className="stat-label">{isOneWeek ? '1주간 예상 소요액' : '2주간 총 예상 소요액'}</span>
          <strong className="stat-val highlight">{formatCurrency(currentExpectedCost)}</strong>
        </div>
        <div className="risk-stat-box">
          <span className="stat-label">{isOneWeek ? '1주 소요 후 잔여 예산' : '2주 소요 후 잔여 예산'}</span>
          <strong className={`stat-val ${isCurrentRisk || budgetUsage?.isExceeded ? 'val-danger' : 'val-success'}`}>
            {formatCurrency(currentProjectedRemaining)}
          </strong>
        </div>
      </div>
    </section>
  );
}
