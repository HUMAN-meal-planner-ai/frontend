import { useState, useEffect, useMemo } from 'react';
import { formatWon, formatUnitPrice, checkIsIncreased } from '../utils/budgetUtils';

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

  // 정렬 및 필터 상태 (기본값: 원래 순서)
  const [sortOption, setSortOption] = useState('DEFAULT');
  const [filterIncreasedOnly, setFilterIncreasedOnly] = useState(false);

  // 상승 품목 수 계산
  const increasedCount = useMemo(() => {
    return safeComparisons.filter((comp) => Number(comp?.costDifference || 0) > 0).length;
  }, [safeComparisons]);

  // 정렬 및 필터링 적용된 목록
  const sortedAndFilteredComparisons = useMemo(() => {
    let list = [...safeComparisons];

    // 상승 품목만 보기 필터
    if (filterIncreasedOnly) {
      list = list.filter((comp) => Number(comp?.costDifference || 0) > 0);
    }

    // 원래 순서 (기본)
    if (sortOption === 'DEFAULT') {
      return list;
    }

    // 사용자가 별도 정렬을 선택한 경우에만 정렬 실행
    return list.sort((a, b) => {
      const aDiff = Number(a?.costDifference || 0);
      const bDiff = Number(b?.costDifference || 0);
      const aRate = Number(a?.increaseRate || 0);
      const bRate = Number(b?.increaseRate || 0);

      switch (sortOption) {
        case 'RATE_DESC': // 상승률 높은 순
          return bRate - aRate || bDiff - aDiff;

        case 'DIFF_DESC': // 1인분 변동액 큰 순
          return bDiff - aDiff || bRate - aRate;

        case 'RATE_ASC': // 변동률 낮은/하락 순
          return aRate - bRate || aDiff - bDiff;

        case 'MENU_ID': // 메뉴 ID 순
          return (Number(a?.menuId) || 0) - (Number(b?.menuId) || 0);

        default:
          return 0;
      }
    });
  }, [safeComparisons, sortOption, filterIncreasedOnly]);

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalItems = sortedAndFilteredComparisons.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // 데이터 또는 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems, sortOption, filterIncreasedOnly]);

  // 첫 번째 메뉴 자동 선택 (상승 메뉴 우선)
  useEffect(() => {
    if (sortedAndFilteredComparisons.length > 0) {
      const isStillInList = sortedAndFilteredComparisons.some((m) => m.menuId === selectedMenuId);
      if (!isStillInList && onSelectMenu) {
        onSelectMenu(sortedAndFilteredComparisons[0].menuId);
      }
    }
  }, [sortedAndFilteredComparisons, selectedMenuId, onSelectMenu]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedComparisons = sortedAndFilteredComparisons.slice(startIndex, startIndex + pageSize);

  // 선택된 메뉴의 식재료별 상세 변동 내역도 상승 식재료 우선 정렬
  const sortedIngredientComparisons = useMemo(() => {
    if (!selectedComparison?.ingredientComparisons) return [];
    return [...selectedComparison.ingredientComparisons].sort((a, b) => {
      const aDiff = Number(a?.lineCostDifference || 0);
      const bDiff = Number(b?.lineCostDifference || 0);
      const aRate = Number(a?.unitPriceIncreaseRate || 0);
      const bRate = Number(b?.unitPriceIncreaseRate || 0);
      // 상승한 식재료가 최상단에 오도록 정렬
      if (aDiff > 0 && bDiff <= 0) return -1;
      if (bDiff > 0 && aDiff <= 0) return 1;
      return bDiff - aDiff || bRate - aRate;
    });
  }, [selectedComparison]);

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
        <div className="panel-header-bar flex-between-header">
          <div>
            <h3>현재가 vs {targetDateLabel} 미래 예측가 변동 비교</h3>
            <p className="panel-desc">식재료 가격 예측에 따른 1인분 및 총 원가 인상액과 변동률(%)</p>
          </div>

          <div className="comparison-controls-group">
            {/* 상승 품목 필터 토글 버튼 */}
            <div className="menu-filter-toggle-group">
              <button
                type="button"
                className={`menu-filter-btn ${!filterIncreasedOnly ? 'active' : ''}`}
                onClick={() => setFilterIncreasedOnly(false)}
              >
                전체 메뉴 ({safeComparisons.length}개)
              </button>
              <button
                type="button"
                className={`menu-filter-btn ${filterIncreasedOnly ? 'active' : ''}`}
                onClick={() => setFilterIncreasedOnly(true)}
              >
                🔥 상승 품목만 보기 ({increasedCount}개)
              </button>
            </div>

            {/* 정렬 셀렉트 박스 */}
            <select
              className="budget-select-control"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              title="원가 변동 정렬 기준"
            >
              <option value="DEFAULT">원래 순서 (기본)</option>
              <option value="RATE_DESC">▲ 상승률 높은 순</option>
              <option value="DIFF_DESC">▲ 1인분 인상액 큰 순</option>
              <option value="RATE_ASC">▼ 변동률 낮은/하락 순</option>
              <option value="MENU_ID">메뉴 ID 순</option>
            </select>
          </div>
        </div>

        {totalItems === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              {filterIncreasedOnly ? '가격이 상승한 메뉴가 없습니다.' : '원가 변동 비교 데이터가 없습니다.'}
            </p>
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
                          {isPlus ? `+${formatWon(Math.abs(Number(comp?.costDifference || 0)))}` : formatWon(comp?.costDifference)}
                        </td>
                        <td className={isPlus ? 'text-red' : ''}>
                          {isPlus ? `+${formatWon(Math.abs(Number(comp?.totalCostDifference || 0)))}` : formatWon(comp?.totalCostDifference)}
                        </td>
                        <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                          {isPlus ? `▲ +${Math.abs(Number(comp?.increaseRate || 0))}%` : isMinus ? `▼ ${comp?.increaseRate || 0}%` : '0.00%'}
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
            <div>
              <h3>[식재료별 단가 변동 내역] {selectedComparison?.menuName || ''}</h3>
              <span className="panel-header-tip">가격이 상승한 주요 식재료가 상단에 먼저 표시됩니다.</span>
            </div>
            <span className="formula-sum-badge">
              총 인상률: <strong className={checkIsIncreased(selectedComparison) ? 'text-red' : 'text-green'}>
                {Number(selectedComparison?.increaseRate || 0) > 0 ? `+${selectedComparison.increaseRate}` : (selectedComparison?.increaseRate || 0)}% ({Number(selectedComparison?.costDifference || 0) > 0 ? `+${formatWon(selectedComparison.costDifference)}` : formatWon(selectedComparison?.costDifference)})
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
                {sortedIngredientComparisons.map((ing, idx) => {
                  const lineDiff = Number(ing?.lineCostDifference || 0);
                  const isUp = lineDiff > 0;
                  const isDown = lineDiff < 0;
                  return (
                    <tr key={ing?.ingredientId || idx}>
                      <td><strong>{ing?.ingredientName || '식재료'}</strong></td>
                      <td>{Number(ing?.quantity || 0).toLocaleString()}g</td>
                      <td>{formatUnitPrice(ing?.currentUnitPrice)}</td>
                      <td>{formatUnitPrice(ing?.futureUnitPrice)}</td>
                      <td className={isUp ? 'text-red' : isDown ? 'text-green' : ''}>
                        {isUp ? `▲ +${Math.abs(Number(ing?.unitPriceIncreaseRate || 0))}%` : isDown ? `▼ ${ing?.unitPriceIncreaseRate || 0}%` : '0%'}
                      </td>
                      <td className={isUp ? 'text-red fw-bold' : isDown ? 'text-green' : ''}>
                        {isUp ? `+${formatWon(Math.abs(Number(ing?.lineCostDifference || 0)))}` : formatWon(ing?.lineCostDifference)}
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
