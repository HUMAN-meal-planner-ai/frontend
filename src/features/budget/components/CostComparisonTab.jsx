import { useState, useEffect } from 'react';
import { formatWon, checkIsIncreased } from '../utils/budgetUtils';

export default function CostComparisonTab({
  comparisons = [],
  appliedParams = {},
  selectedMenuId = null,
  onSelectMenu = () => {},
  selectedComparison = null,
}) {
  const safeComparisons = Array.isArray(comparisons) ? comparisons : [];
  const targetDateLabel = appliedParams?.targetDate || '미래 예측일자';
  const mealCountLabel = appliedParams?.mealCount ?? 1;

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalItems = safeComparisons.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // 데이터 변경 시 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedComparisons = safeComparisons.slice(startIndex, startIndex + pageSize);

  // 페이지 번호 생성 헬퍼 (최대 5개 번호 표시)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="tab-fade-in">
      <div className="budget-glass-panel">
        <div className="panel-header-bar">
          <div>
            <h3>현재가 vs {targetDateLabel} 미래 예측가 변동 비교</h3>
            <p className="panel-desc">식재료 가격 예측에 따른 1인분 및 총 원가 인상액과 변동률(%)</p>
          </div>
          {totalItems > 0 && (
            <span className="candidate-count-pill">
              총 <strong>{totalItems}</strong>개 메뉴
            </span>
          )}
        </div>

        {totalItems === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p className="text-muted" style={{ margin: 0 }}>원가 변동 비교 데이터가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="brand-table-wrapper">
              <table className="brand-table">
                <thead>
                  <tr>
                    <th>메뉴 ID</th>
                    <th>메뉴명</th>
                    <th>현재 1인분</th>
                    <th>미래 1인분 ({targetDateLabel})</th>
                    <th>1인분 변동액</th>
                    <th>총 변동액 ({mealCountLabel}명)</th>
                    <th>상승률 (%)</th>
                    <th>추세</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComparisons.map((comp, idx) => {
                    const isSelected = selectedMenuId === comp?.menuId;
                    const isIncreased = checkIsIncreased(comp);
                    const costDiff = Number(comp?.costDifference || 0);
                    const isPlus = costDiff > 0;
                    const isMinus = costDiff < 0;
                    return (
                      <tr
                        key={comp?.menuId || startIndex + idx}
                        className={`table-clickable-row ${isSelected ? 'row-active' : ''}`}
                        onClick={() => onSelectMenu && comp?.menuId && onSelectMenu(comp.menuId)}
                      >
                        <td><span className="id-tag">#{comp?.menuId}</span></td>
                        <td><strong className="menu-name-text">{comp?.menuName || '메뉴'}</strong></td>
                        <td>{formatWon(comp?.currentCostPerPerson)}</td>
                        <td>{formatWon(comp?.futureCostPerPerson)}</td>
                        <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                          {isPlus ? `+${formatWon(comp?.costDifference)}` : formatWon(comp?.costDifference)}
                        </td>
                        <td className={isPlus ? 'text-red' : ''}>
                          {isPlus ? `+${formatWon(comp?.totalCostDifference)}` : formatWon(comp?.totalCostDifference)}
                        </td>
                        <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                          {isPlus ? `▲ +${comp?.increaseRate || 0}%` : isMinus ? `▼ ${comp?.increaseRate || 0}%` : '0.00%'}
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

            {/* 페이징 컨트롤 */}
            {totalPages > 1 && (
              <div className="budget-pagination-bar">
                <span className="pagination-info-text">
                  전체 {totalItems}개 중 <strong>{startIndex + 1} - {Math.min(startIndex + pageSize, totalItems)}</strong>번째 표시
                </span>
                <div className="pagination-btn-group">
                  <button
                    type="button"
                    className="pagination-nav-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="이전 페이지"
                  >
                    ‹
                  </button>
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`pagination-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="pagination-nav-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="다음 페이지"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 선택 메뉴의 식재료별 상세 변동 */}
      {selectedComparison && (
        <div className="budget-glass-panel">
          <div className="panel-header-bar">
            <h3>[식재료별 단가 변동 내역] {selectedComparison?.menuName || ''}</h3>
            <span className="formula-sum-badge">
              총 인상률: <strong className={checkIsIncreased(selectedComparison) ? 'text-red' : 'text-green'}>
                {selectedComparison?.increaseRate || 0}% ({formatWon(selectedComparison?.costDifference)})
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
                {selectedComparison?.ingredientComparisons?.map((ing, idx) => {
                  const lineDiff = Number(ing?.lineCostDifference || 0);
                  const isUp = lineDiff > 0;
                  const isDown = lineDiff < 0;
                  return (
                    <tr key={ing?.ingredientId || idx}>
                      <td><strong>{ing?.ingredientName || '식재료'}</strong></td>
                      <td>{Number(ing?.quantity || 0).toLocaleString()}g</td>
                      <td>{formatWon(ing?.currentUnitPrice)}</td>
                      <td>{formatWon(ing?.futureUnitPrice)}</td>
                      <td className={isUp ? 'text-red' : isDown ? 'text-green' : ''}>
                        {isUp ? `▲ +${ing?.unitPriceIncreaseRate || 0}%` : isDown ? `▼ ${ing?.unitPriceIncreaseRate || 0}%` : '0%'}
                      </td>
                      <td className={isUp ? 'text-red fw-bold' : isDown ? 'text-green' : ''}>
                        {isUp ? `+${formatWon(ing?.lineCostDifference)}` : formatWon(ing?.lineCostDifference)}
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
  );
}
