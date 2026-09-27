export default function BudgetBottomActions({
  onNavigateMealPlans,
  onNavigateMenus,
  onConfirmReview,
  onVerifyWeeklyPlan,
  isExceeded,
}) {
  return (
    <section className="budget-bottom-actions">
      <button
        type="button"
        className="action-pill-btn secondary"
        onClick={onNavigateMealPlans}
      >
        식단 관리로 이동
      </button>

      <button
        type="button"
        className="action-pill-btn secondary"
        onClick={onNavigateMenus}
      >
        메뉴 목록 검토
      </button>

      {onVerifyWeeklyPlan && (
        <button
          type="button"
          className="action-pill-btn secondary auto-verify-btn"
          onClick={onVerifyWeeklyPlan}
          title="재구성된 주간 식단의 예산 위험 해소 여부와 절감액을 재검증합니다. (AUTO-004)"
        >
          ✨ 주간 식단 예산 재검증
        </button>
      )}

      <button
        type="button"
        className="action-pill-btn primary"
        disabled={isExceeded}
        title={
          isExceeded
            ? '목표 원가/예산을 초과한 항목이 있어 검토를 확정할 수 없습니다. 식단 수정 또는 대체메뉴를 검토해 주세요.'
            : '원가 및 예산 분석 검토를 확정합니다.'
        }
        onClick={onConfirmReview}
      >
        {isExceeded ? '목표 예산 초과 (확정 불가)' : '분석 검토 완료'}
      </button>
    </section>
  );
}
