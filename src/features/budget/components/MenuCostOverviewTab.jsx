import { formatCurrency, formatWon, checkIsExceeded, getExceededAmount } from '../utils/budgetUtils';

export default function MenuCostOverviewTab({
  costMode,
  setCostMode,
  appliedParams,
  summary,
  menuCosts,
  selectedMenuId,
  onSelectMenu,
  selectedMenuDetail,
  detailLoading,
}) {
  return (
    <div className="tab-fade-in">
      {/* 상단 모드 전환 & 지표 카드 */}
      <div className="tab-control-header">
        <div className="brand-segmented-control">
          <button
            type="button"
            className={`segment-btn ${costMode === 'CURRENT' ? 'active' : ''}`}
            onClick={() => setCostMode('CURRENT')}
          >
            현재 실거래가
          </button>
          <button
            type="button"
            className={`segment-btn ${costMode === 'FUTURE' ? 'active' : ''}`}
            onClick={() => setCostMode('FUTURE')}
          >
            미래 예측가 ({appliedParams.targetDate})
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
                      onClick={() => onSelectMenu(item.menuId)}
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
  );
}
