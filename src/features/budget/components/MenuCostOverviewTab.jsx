import React, { useState, useMemo, useEffect } from 'react';
import { calculatePriceScore, formatCurrency, formatWon, checkIsExceeded, getExceededAmount } from '../utils/budgetUtils';

export default function MenuCostOverviewTab({
  costMode,
  setCostMode,
  appliedParams,
  menuCosts = [],
  menuListLoading,
  menuListError,
  menuListWarning,
  weekRange,
  selectedMenuId,
  onSelectMenu,
  selectedMenuDetail,
  detailLoading,
  weeklyPlanCost,
  budgetRisk,
}) {
  const normalize = (s) => (s || '').replace(/\s+/g, '').toLowerCase();

  // 식단 편성에 포함된 메뉴명 목록 추출
  const plannedMenuNamesList = useMemo(() => {
    const list = [];
    const addNames = (rawStr) => {
      if (!rawStr) return;
      rawStr.split(/[,/·\n]/).forEach((part) => {
        const trimmed = part.trim();
        if (trimmed && trimmed !== '편성 메뉴 없음' && trimmed !== '편성 식단 없음') {
          list.push(trimmed);
        }
      });
    };

    weeklyPlanCost?.dailyCosts?.forEach((day) => {
      day.meals?.forEach((meal) => {
        addNames(meal.menuNames);
      });
    });

    [...(budgetRisk?.thisWeekDetails || []), ...(budgetRisk?.nextWeekDetails || [])].forEach((item) => {
      addNames(item.menuNames);
    });

    return Array.from(new Set(list));
  }, [weeklyPlanCost, budgetRisk]);

  // 필터 상태: 기본적으로 식단 편성 메뉴만 보기
  const [showOnlyPlanned, setShowOnlyPlanned] = useState(true);

  // 실제로 화면에 표시할 메뉴 목록
  const displayedMenuCosts = useMemo(() => {
    if (!menuCosts) return [];
    if (!showOnlyPlanned) {
      return menuCosts;
    }
    if (plannedMenuNamesList.length === 0) {
      return menuCosts; // 편성 목록이 없으면 빈 화면 방지를 위해 전체 표시
    }
    const normalizedPlanned = plannedMenuNamesList.map(normalize);

    const filtered = menuCosts.filter((m) => {
      const normName = normalize(m.menuName);
      return normalizedPlanned.some((p) => p === normName || p.includes(normName) || normName.includes(p));
    });

    return filtered.length > 0 ? filtered : menuCosts;
  }, [menuCosts, plannedMenuNamesList, showOnlyPlanned]);

  // 표시된 메뉴 기준 파생 요약 통계 계산
  const summary = useMemo(() => {
    return displayedMenuCosts.reduce((totals, menu) => {
      const mealCount = Number(menu.mealCount ?? appliedParams?.mealCount ?? 1);
      const targetCost = Number(menu.targetCost ?? appliedParams?.targetCost ?? 0);
      totals.totalTargetCost += targetCost * mealCount;
      if (!menu.costUnavailable) {
        totals.totalCurrentCost += Number(menu.totalMealCost ?? (Number(menu.costPerPerson) * mealCount)) || 0;
        totals.totalExceeded += getExceededAmount(menu, appliedParams?.targetCost) * mealCount;
        if (checkIsExceeded(menu, appliedParams?.targetCost)) totals.exceededCount += 1;
      }
      return totals;
    }, { totalCurrentCost: 0, totalTargetCost: 0, totalExceeded: 0, exceededCount: 0 });
  }, [displayedMenuCosts, appliedParams?.mealCount, appliedParams?.targetCost]);

  const priceScore = displayedMenuCosts.length && displayedMenuCosts.every((menu) => !menu.costUnavailable)
    ? calculatePriceScore(summary.totalCurrentCost, summary.totalTargetCost)
    : null;

  // 첫 번째 메뉴 자동 선택
  useEffect(() => {
    if (displayedMenuCosts.length > 0) {
      const isStillInList = displayedMenuCosts.some((m) => m.menuId === selectedMenuId);
      if (!isStillInList) {
        onSelectMenu(displayedMenuCosts[0].menuId);
      }
    }
  }, [displayedMenuCosts, selectedMenuId, onSelectMenu]);

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
          <span className="card-sub-info">
            {showOnlyPlanned
              ? `편성 메뉴 ${displayedMenuCosts.length}종 (회당 ${appliedParams.mealCount}명)`
              : `전체 메뉴 ${displayedMenuCosts.length}종 합산`}
          </span>
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
            {summary.totalExceeded > 0 ? '원가 절감 및 대체 품목 검토 권장' : '편성된 모든 메뉴가 목표 단가 내에 안정됨'}
          </span>
        </div>

        <div className="budget-stat-card price-score-card">
          <span className="card-kicker">가격 점수</span>
          <div className="price-score-value">
            <strong>{priceScore == null ? '-' : priceScore.toFixed(1)}</strong>
            <span>/ 100점</span>
          </div>
          <span className="price-score-status">
            {priceScore == null ? '원가 데이터 없음' : priceScore === 100 ? '목표 예산 이내' : priceScore === 0 ? '점수 하한' : '목표 예산 초과'}
          </span>
          <span className="card-sub-info">
            편성 메뉴 원가 합계 기준 · 예산 이하 100점
          </span>
        </div>
      </div>

      {/* 메뉴 목록 테이블 */}
      <div className="budget-glass-panel">
        <div className="panel-header-bar flex-between-header">
          <div>
            <h3>
              {showOnlyPlanned
                ? `📋 식단 편성 메뉴 원가 현황 (${displayedMenuCosts.length}개 메뉴)`
                : `📋 전체 등록 메뉴 원가 현황 (${menuCosts.length}개 메뉴)`}
            </h3>
            <span className="panel-header-tip">
              {weekRange ? `${weekRange.startDate} ~ ${weekRange.endDate} · ` : ''}
              행을 클릭하면 하단에 해당 메뉴의 세부 식재료 단가 계산식이 표시됩니다.
            </span>
          </div>

          {/* 식단 편성 메뉴 / 전체 메뉴 필터 토글 */}
          <div className="menu-filter-toggle-group">
            <button
              type="button"
              className={`menu-filter-btn ${showOnlyPlanned ? 'active' : ''}`}
              onClick={() => setShowOnlyPlanned(true)}
            >
              📌 식단 편성 메뉴만
            </button>
            <button
              type="button"
              className={`menu-filter-btn ${!showOnlyPlanned ? 'active' : ''}`}
              onClick={() => setShowOnlyPlanned(false)}
            >
              전체 메뉴 보기 ({menuCosts.length}개)
            </button>
          </div>
        </div>

        {menuListWarning && <p className="menu-cost-warning" role="status">{menuListWarning}</p>}

        <div className="brand-table-wrapper">
          <table className="brand-table">
            <thead>
              <tr>
                <th>메뉴 ID</th>
                <th>메뉴명</th>
                <th>1인분 원가</th>
                <th>총 예상 원가 ({appliedParams?.mealCount}명)</th>
                <th>목표 단가</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {menuListLoading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    이번 주 식단 메뉴를 불러오는 중입니다.
                  </td>
                </tr>
              ) : menuListError ? (
                <tr>
                  <td colSpan="6" className="table-empty">{menuListError}</td>
                </tr>
              ) : displayedMenuCosts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#63786c', marginBottom: '12px' }}>
                        현재 선택된 주차에 편성된 식단 메뉴가 없습니다.
                      </p>
                      <button
                        type="button"
                        className="btn-budget-save-primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => setShowOnlyPlanned(false)}
                      >
                        전체 등록 메뉴 보기 ({menuCosts.length}개)
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedMenuCosts.map((item) => {
                  const isSelected = selectedMenuId === item.menuId;
                  const isExceeded = checkIsExceeded(item, appliedParams?.targetCost);
                  const excAmt = getExceededAmount(item, appliedParams?.targetCost);
                  const isPlanned = plannedMenuNamesList.some(p => normalize(p) === normalize(item.menuName) || normalize(p).includes(normalize(item.menuName)));
                  return (
                    <tr
                      key={item.menuId}
                      className={`table-clickable-row ${isSelected ? 'row-active' : ''}`}
                      onClick={() => onSelectMenu(item.menuId)}
                    >
                      <td><span className="id-tag">#{item.menuId}</span></td>
                      <td>
                        <strong className="menu-name-text">
                          {isPlanned && <span className="planned-badge-inline" title="주간 식단 편성 메뉴">편성</span>}
                          {item.menuName}
                        </strong>
                      </td>
                      <td>{item.costUnavailable ? '-' : formatWon(item.costPerPerson)}</td>
                      <td>{item.costUnavailable ? '-' : formatWon(item.totalMealCost)}</td>
                      <td>{formatWon(item.targetCost ?? appliedParams?.targetCost)}</td>
                      <td>
                        {item.costUnavailable ? (
                          <span className="status-pill pill-neutral">원가 정보 없음</span>
                        ) : (
                          <span className={`status-pill ${isExceeded ? 'pill-danger' : 'pill-success'}`}>
                            {isExceeded ? `⚠️ 초과 (+${formatWon(excAmt)})` : '✅ 적정'}
                          </span>
                        )}
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
              {checkIsExceeded(selectedMenuDetail, appliedParams?.targetCost) && (
                <span className="exceed-tag">
                  (+{formatWon(getExceededAmount(selectedMenuDetail, appliedParams?.targetCost))} 초과)
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
