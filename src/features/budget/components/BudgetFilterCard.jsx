export default function BudgetFilterCard({
  filterMealCount,
  setFilterMealCount,
  filterTargetCost,
  setFilterTargetCost,
  filterTargetDate,
  setFilterTargetDate,
  filterBaseDate,
  setFilterBaseDate,
  onApply,
  loading,
}) {
  return (
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

      {/* 조건 적용 버튼 */}
      <button
        type="button"
        className="filter-apply-btn"
        onClick={onApply}
        disabled={loading}
      >
        {loading ? '분석 중...' : '조건 적용'}
      </button>
    </div>
  );
}
