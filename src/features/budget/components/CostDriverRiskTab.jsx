import React, { useState, useEffect } from 'react';
import { formatCurrency, formatWon, formatUnitPrice, checkIsCostIncrease } from '../utils/budgetUtils';

// 메뉴 위험도 태그 렌더링
const renderRiskBadge = (riskLevel) => {
  if (riskLevel === 'WARNING') {
    return <span className="risk-level-badge warning">🚨 위험 (WARNING)</span>;
  }
  if (riskLevel === 'CAUTION') {
    return <span className="risk-level-badge caution">⚠️ 주의 (CAUTION)</span>;
  }
  return <span className="risk-level-badge safe">✅ 안정 (SAFE)</span>;
};

// 검토 우선순위 태그 렌더링 (BUDG-003)
const renderPriorityBadge = (priority) => {
  if (priority === 'URGENT') {
    return <span className="status-pill pill-danger">🚨 긴급 검토 (URGENT)</span>;
  }
  if (priority === 'HIGH') {
    return <span className="status-pill pill-warning">⚠️ 우선 검토 (HIGH)</span>;
  }
  if (priority === 'MEDIUM') {
    return <span className="status-pill pill-info">🔍 일반 검토 (MEDIUM)</span>;
  }
  return <span className="status-pill pill-success">✅ 안정 (LOW)</span>;
};

// 페이지 번호 생성 헬퍼
const getPageNumbers = (currentPage, totalPages, maxVisible = 5) => {
  const pages = [];
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

export default function CostDriverRiskTab({
  drivers = [],
  menuRisks = [],
  selectedMenuId = null,
  onSelectMenu = () => {},
  selectedMenuRisk = null,
  selectedDriver = null,
  replacementCandidates = null,
  highCostData = null, // BUDG-003
  dashboardRiskSummary = null, // DASH-005
  onOpenReplacementModal = null, // BUDG-005
}) {
  const candidates = (replacementCandidates?.candidates || []).filter(
    (c) => Number(c?.increaseRate || 0) > 0
  );
  const highCostCandidates = highCostData?.candidates || [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];
  const safeMenuRisks = Array.isArray(menuRisks) ? menuRisks : [];

  // 1. 주간 식단 비용 기여 상위 메뉴 페이징
  const [highCostPage, setHighCostPage] = useState(1);
  const highCostPageSize = 5;
  const highCostTotalPages = Math.ceil(highCostCandidates.length / highCostPageSize) || 1;
  const paginatedHighCost = highCostCandidates.slice(
    (highCostPage - 1) * highCostPageSize,
    highCostPage * highCostPageSize
  );

  // 2. 주간 재평가 추천 메뉴 후보 페이징 (4개씩)
  const [candidatePage, setCandidatePage] = useState(1);
  const candidatePageSize = 4;
  const candidateTotalPages = Math.ceil(candidates.length / candidatePageSize) || 1;
  const paginatedCandidates = candidates.slice(
    (candidatePage - 1) * candidatePageSize,
    candidatePage * candidatePageSize
  );

  // 3. 전체 메뉴 위험도 카드 그리드 페이징 (6개씩)
  const [driverPage, setDriverPage] = useState(1);
  const driverPageSize = 6;
  const driverTotalPages = Math.ceil(safeDrivers.length / driverPageSize) || 1;
  const paginatedDrivers = safeDrivers.slice(
    (driverPage - 1) * driverPageSize,
    driverPage * driverPageSize
  );

  // 데이터 목록 변경 시 1페이지로 초기화
  useEffect(() => { setHighCostPage(1); }, [highCostCandidates.length]);
  useEffect(() => { setCandidatePage(1); }, [candidates.length]);
  useEffect(() => { setDriverPage(1); }, [safeDrivers.length]);

  return (
    <div className="tab-fade-in">
      {/* 0. [DASH-005] 현재 식단 내 가격 위험 메뉴 비중 요약 */}
      {dashboardRiskSummary && (
        <section className="budget-glass-panel dash-risk-summary-section">
          <div className="panel-header-bar flex-between-header">
            <div>
              <div className="panel-title-with-badge">
                <h4>📊 [DASH-005] 현재 식단 내 가격 위험 메뉴 비중 요약</h4>
                <span className={`risk-pill-badge ${Number(dashboardRiskSummary.riskMenuRatio || 0) > 20 ? 'risk-badge-danger' : Number(dashboardRiskSummary.riskMenuRatio || 0) > 0 ? 'risk-badge-caution' : 'risk-badge-safe'}`}>
                  위험 비중 {dashboardRiskSummary.riskMenuRatio ?? 0}%
                </span>
              </div>
              <p className="panel-desc">
                현재 주간 식단({dashboardRiskSummary.startDate || ''} ~ {dashboardRiskSummary.endDate || ''}) 중 가격 급등 위험 식재료가 포함된 메뉴의 점유 비중과 비용 분포입니다.
              </p>
            </div>
            <div className="dash-summary-kpis-mini">
              <span className="dash-kpi-chip">
                총 편성 메뉴: <strong>{dashboardRiskSummary.totalMenuCount ?? 0}개</strong>
              </span>
              <span className="dash-kpi-chip">
                위험 메뉴: <strong className="text-red">{dashboardRiskSummary.riskMenuCount ?? 0}개</strong>
              </span>
              <span className="dash-kpi-chip">
                비용 위험 비중: <strong className="text-red">{dashboardRiskSummary.costRiskRatio ?? 0}%</strong>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 1. [BUDG-003] 선택 주차 식단 비용 기여도 높은 메뉴 식별 & 재구성 변경 검토 후보 */}
      {highCostCandidates.length > 0 && (
        <section className="budget-glass-panel high-cost-detection-panel">
          <div className="panel-header-bar">
            <div>
              <div className="panel-kicker-tag high-cost-tag">
                <span className="sparkle-icon">💰</span> 비용 기여 분석
              </div>
              <h3 className="panel-candidate-title">
                주간 식단 비용 기여 상위 메뉴 Top {highCostCandidates.length}
              </h3>
              <p className="panel-candidate-desc">
                선택 주차 식단 총 식재료비({formatCurrency(highCostData?.weeklyTotalCost)}) 중 비용 기여율이 높은 핵심 메뉴들을 식별하고 대체 메뉴 교체 시 예상 절감액을 분석합니다.
              </p>
            </div>
            <div className="high-cost-meta-badge">
              <span>주간 총 비용 <strong>{formatCurrency(highCostData?.weeklyTotalCost)}</strong></span>
              <span className="pill-divider" />
              <span>평균 단가 <strong>{formatWon(highCostData?.averageCostPerMeal)}</strong></span>
            </div>
          </div>

          <div className="brand-table-wrapper">
            <table className="brand-table high-cost-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>메뉴명</th>
                  <th>카테고리</th>
                  <th>1인분 예상 단가</th>
                  <th>제공 횟수</th>
                  <th>주간 총 소요액</th>
                  <th>비용 기여율</th>
                  <th>검토 우선순위</th>
                  <th>예상 절감 잠재액</th>
                  <th>대체 분석</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHighCost.map((hc, idx) => {
                  const globalIdx = (highCostPage - 1) * highCostPageSize + idx;
                  const rank = hc.rank || globalIdx + 1;
                  const isSelected = selectedMenuId === hc.menuId;
                  const contribution = hc.contributionRate ?? hc.costContributionRate ?? 0;
                  const weeklyCost = hc.weeklyMenuCost ?? hc.weeklyTotalMenuCost ?? 0;
                  const mealCount = hc.totalMealCount ?? hc.totalServedMealCount ?? 0;
                  const servedCount = hc.appearanceCount ?? hc.servedCount ?? hc.servedMeals?.length ?? 1;

                  return (
                    <tr
                      key={hc.menuId || globalIdx}
                      className={`table-clickable-row ${isSelected ? 'row-active' : ''}`}
                      onClick={() => onSelectMenu && hc.menuId && onSelectMenu(hc.menuId)}
                    >
                      <td><span className={`rank-pill ${rank <= 2 ? 'rank-1' : ''}`}>#{rank}</span></td>
                      <td>
                        <strong className="menu-name-text">{hc.menuName}</strong>
                        {hc.topCostDriver && (
                          <small className="hc-sub-driver"> (핵심: {hc.topCostDriver})</small>
                        )}
                      </td>
                      <td><span className="rep-slot-tag">{hc.slotName || hc.slot}</span></td>
                      <td>{formatWon(hc.averageCostPerPerson || hc.costPerPerson)}</td>
                      <td>총 <strong>{servedCount}회</strong> ({mealCount.toLocaleString()}명)</td>
                      <td><strong>{formatCurrency(weeklyCost)}</strong></td>
                      <td>
                        <div className="driver-bar-wrapper">
                          <div
                            className="driver-bar-fill"
                            style={{ width: `${Math.min(Math.max(Number(contribution) || 0, 0), 100)}%` }}
                          />
                          <span className="text-red fw-bold">{contribution}%</span>
                        </div>
                      </td>
                      <td>{renderPriorityBadge(hc.reviewPriority)}</td>
                      <td>
                        {hc.estimatedSavingsPotential ? (
                          <strong className="text-green">
                            +{formatCurrency(hc.estimatedSavingsPotential)} 절감 가능
                          </strong>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {onOpenReplacementModal && (
                          <button
                            type="button"
                            className="action-pill-btn secondary btn-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReplacementModal(hc);
                            }}
                            title="대체 메뉴 적용 전후 비용 차이 및 절감액 분석"
                          >
                            🔄 대체 비교
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 비용 기여 메뉴 페이징 */}
          {highCostTotalPages > 1 && (
            <div className="budget-pagination-bar">
              <span className="pagination-info-text">
                전체 {highCostCandidates.length}개 중 <strong>{(highCostPage - 1) * highCostPageSize + 1} - {Math.min(highCostPage * highCostPageSize, highCostCandidates.length)}</strong>번째 표시
              </span>
              <div className="pagination-btn-group">
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={highCostPage === 1}
                  onClick={() => setHighCostPage((p) => Math.max(1, p - 1))}
                  title="이전 페이지"
                >
                  ‹
                </button>
                {getPageNumbers(highCostPage, highCostTotalPages).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pagination-num-btn ${highCostPage === pageNum ? 'active' : ''}`}
                    onClick={() => setHighCostPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={highCostPage === highCostTotalPages}
                  onClick={() => setHighCostPage((p) => Math.min(highCostTotalPages, p + 1))}
                  title="다음 페이지"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {highCostData?.recommendationSummary && (
            <div className="impact-summary-callout high-cost-summary" style={{ marginTop: '14px' }}>
              💡 <strong>식단 재구성 권고:</strong> {highCostData.recommendationSummary}
            </div>
          )}
        </section>
      )}

      {/* 2. [AUTO-006] 주간 재평가 변경 검토 메뉴 후보 배너/섹션 */}
      {candidates.length > 0 && (
        <section className="budget-glass-panel candidate-detection-panel">
          <div className="panel-header-bar">
            <div>
              <div className="panel-kicker-tag">
                <span className="sparkle-icon">✨</span> 자동화 추천
              </div>
              <h3 className="panel-candidate-title">
                🚨 주간 재평가 변경 검토 추천 메뉴 ({candidates.length}건)
              </h3>
              <p className="panel-candidate-desc">
                원가 급등(+10% 이상), 주요 식재료 가격 급등(WARNING), 목표 단가 초과 요인을 종합 분석하여 대체가 권장되는 메뉴 목록입니다.
              </p>
            </div>
            <span className="candidate-count-pill">
              후보 <strong>{candidates.length}</strong>개 탐지됨
            </span>
          </div>

          <div className="candidate-cards-grid">
            {paginatedCandidates.map((c, idx) => {
              const isSelected = selectedMenuId === c.menuId;
              return (
                <div
                  key={c.menuId || idx}
                  className={`candidate-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectMenu && c.menuId && onSelectMenu(c.menuId)}
                >
                  <div className="candidate-card-top">
                    <span className="candidate-rank-badge">영향도 #{c.impactRank || c.rank || 1}</span>
                    <strong className="candidate-menu-name">{c.menuName}</strong>
                    <span className="candidate-surge-rate">
                      {Number(c.increaseRate) > 0
                        ? `+${c.increaseRate}% 상승`
                        : Number(c.increaseRate) < 0
                          ? `${c.increaseRate}% 하락`
                          : '0% 변동'}
                    </span>
                  </div>

                  <div className="candidate-meta-row">
                    <span>1인분: {formatWon(c.currentCostPerPerson)} ➔ <strong>{formatWon(c.futureCostPerPerson)}</strong></span>
                    {c.topCostDriver && (
                      <span className="candidate-driver-text">
                        주요 원인: <strong className="text-red">{c.topCostDriver}</strong>
                      </span>
                    )}
                  </div>

                  {c.reasons && c.reasons.length > 0 && (
                    <div className="candidate-reason-tags">
                      {c.reasons.map((r, i) => (
                        <span key={i} className="candidate-reason-tag">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {onOpenReplacementModal && (
                    <div className="candidate-card-footer">
                      <button
                        type="button"
                        className="action-pill-btn secondary btn-xs w-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReplacementModal(c);
                        }}
                      >
                        🔄 대체 메뉴 절감액 분석
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 재평가 추천 후보 페이징 */}
          {candidateTotalPages > 1 && (
            <div className="budget-pagination-bar cards-pagination">
              <span className="pagination-info-text">
                후보 {candidates.length}건 중 <strong>{(candidatePage - 1) * candidatePageSize + 1} - {Math.min(candidatePage * candidatePageSize, candidates.length)}</strong>번째 표시
              </span>
              <div className="pagination-btn-group">
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={candidatePage === 1}
                  onClick={() => setCandidatePage((p) => Math.max(1, p - 1))}
                  title="이전 페이지"
                >
                  ‹
                </button>
                {getPageNumbers(candidatePage, candidateTotalPages).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pagination-num-btn ${candidatePage === pageNum ? 'active' : ''}`}
                    onClick={() => setCandidatePage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={candidatePage === candidateTotalPages}
                  onClick={() => setCandidatePage((p) => Math.min(candidateTotalPages, p + 1))}
                  title="다음 페이지"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. 전체 메뉴 위험도 & Cost Driver 카드 그리드 */}
      {safeDrivers.length === 0 ? (
        <div className="budget-glass-panel" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p className="text-muted" style={{ margin: 0 }}>등록된 식단 메뉴 원가 및 변동 요인(Cost Driver) 분석 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="budget-glass-panel" style={{ padding: '24px' }}>
          <div className="panel-header-bar" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#173f2d' }}>
                전체 메뉴 위험도 및 원가 상승 요인 (Cost Driver)
              </h3>
              <p className="panel-desc" style={{ margin: '4px 0 0', fontSize: '13px', color: '#677d70' }}>
                메뉴별 종합 가격 위험도와 가장 큰 폭으로 상승한 식재료 품목을 분석합니다.
              </p>
            </div>
            <span className="candidate-count-pill">
              총 <strong>{safeDrivers.length}</strong>개 메뉴
            </span>
          </div>

          <div className="driver-cards-masonry">
            {paginatedDrivers.map((drv, idx) => {
              const isSelected = selectedMenuId === drv?.menuId;
              const top = drv?.topDriver;
              const isTopIncrease = checkIsCostIncrease(top);
              const riskInfo = safeMenuRisks.find((r) => r?.menuId === drv?.menuId);
              const increaseRate = Number(drv?.totalIncreaseRate || 0);
              const riskLevel =
                riskInfo?.riskLevel ||
                (increaseRate >= 15
                  ? 'WARNING'
                  : increaseRate >= 7
                    ? 'CAUTION'
                    : 'SAFE');
              const riskScore = Number(
                riskInfo?.riskScore ??
                (riskLevel === 'WARNING' ? 85 : riskLevel === 'CAUTION' ? 55 : 20)
              );

              return (
                <div
                  key={drv?.menuId || idx}
                  className={`driver-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectMenu && drv?.menuId && onSelectMenu(drv.menuId)}
                >
                  <div className="driver-card-head">
                    <span className="id-tag">#{drv?.menuId}</span>
                    <strong className="driver-menu-title">{drv?.menuName || '메뉴'}</strong>
                    {(() => {
                      const r = Number(drv?.totalIncreaseRate || 0);
                      if (r > 0) return <span className="driver-rate-tag">▲ +{r}%</span>;
                      if (r < 0) return <span className="driver-rate-tag" style={{ color: '#16a34a' }}>▼ {r}%</span>;
                      return <span className="driver-rate-tag" style={{ color: '#64748b' }}>0%</span>;
                    })()}
                  </div>

                  {/* MENU-009 메뉴 종합 위험도 점수 & 프로그레스 */}
                  <div className="menu-risk-score-box">
                    <div className="risk-score-header">
                      <span className="risk-score-label">식재료 종합 위험도</span>
                      <div className="risk-badge-mini">
                        {renderRiskBadge(riskLevel)}
                        <span className="risk-score-num">
                          <strong>{riskScore}</strong>점
                        </span>
                      </div>
                    </div>
                    <div className="risk-score-bar-track">
                      <div
                        className={`risk-score-bar-fill ${(riskLevel || 'safe').toLowerCase()}`}
                        style={{ width: `${Math.min(Math.max(riskScore, 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Top 1 원가 상승 주도 식재료 */}
                  <div className="driver-top-box">
                    <span className="driver-top-label">🔥 최대 상승 주도 식재료 (Top 1)</span>
                    {top && isTopIncrease ? (
                      <div className="driver-top-detail">
                        <span className="top-name">{top.ingredientName}</span>
                        <div className="top-meta">
                          <span>상승액: +{formatWon(top.lineCostDifference)}</span>
                          <span className="text-red fw-bold">기여율: {top.contributionRate}%</span>
                        </div>
                      </div>
                    ) : (
                      <span className="safe-text">가격 변동 안정 (안전)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 전체 메뉴 위험도 카드 그리드 페이징 */}
          {driverTotalPages > 1 && (
            <div className="budget-pagination-bar cards-pagination">
              <span className="pagination-info-text">
                전체 {safeDrivers.length}개 중 <strong>{(driverPage - 1) * driverPageSize + 1} - {Math.min(driverPage * driverPageSize, safeDrivers.length)}</strong>번째 표시
              </span>
              <div className="pagination-btn-group">
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={driverPage === 1}
                  onClick={() => setDriverPage((p) => Math.max(1, p - 1))}
                  title="이전 페이지"
                >
                  ‹
                </button>
                {getPageNumbers(driverPage, driverTotalPages).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pagination-num-btn ${driverPage === pageNum ? 'active' : ''}`}
                    onClick={() => setDriverPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={driverPage === driverTotalPages}
                  onClick={() => setDriverPage((p) => Math.min(driverTotalPages, p + 1))}
                  title="다음 페이지"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 선택된 메뉴의 세부 식재료별 변동 내역 테이블 */}
      {(selectedMenuRisk || selectedDriver) && (() => {
        const rawIngredients = selectedMenuRisk?.riskIngredients || selectedDriver?.rankedDrivers || [];
        // 단가 또는 원가가 실제로 상승한 식재료만 추출 및 상승액 높은 순 정렬
        const increasedIngredients = rawIngredients
          .filter(
            (d) =>
              checkIsCostIncrease(d) ||
              Number(d?.lineCostDifference || 0) > 0 ||
              Number(d?.unitPriceIncreaseRate || 0) > 0
          )
          .sort((a, b) => {
            const diffA = Number(a?.lineCostDifference || 0);
            const diffB = Number(b?.lineCostDifference || 0);
            if (diffB !== diffA) return diffB - diffA;
            return Number(b?.unitPriceIncreaseRate || 0) - Number(a?.unitPriceIncreaseRate || 0);
          });

        const totalDiff = Number(
          selectedMenuRisk?.costDifference || selectedDriver?.totalCostDifference || 0
        );

        return (
          <div className="budget-glass-panel">
            <div className="panel-header-bar">
              <div>
                <h3>
                  [식재료별 위험 요인 상세]{' '}
                  {selectedMenuRisk?.menuName || selectedDriver?.menuName || ''}
                </h3>
                {selectedMenuRisk?.riskSummary && (
                  <p className="panel-risk-summary-text">
                    💡 <strong>종합 진단:</strong> {selectedMenuRisk.riskSummary}
                  </p>
                )}
              </div>
              <div className="risk-header-actions">
                {selectedMenuRisk && renderRiskBadge(selectedMenuRisk.riskLevel)}
                <span className="formula-sum-badge">
                  메뉴 총 상승액:{' '}
                  <strong className={totalDiff > 0 ? 'text-red' : ''}>
                    {totalDiff > 0 ? `+${formatWon(totalDiff)}` : formatWon(totalDiff)}
                  </strong>
                </span>
                {onOpenReplacementModal && (
                  <button
                    type="button"
                    className="action-pill-btn secondary btn-sm"
                    onClick={() => onOpenReplacementModal({
                      menuId: selectedMenuRisk?.menuId || selectedDriver?.menuId,
                      menuName: selectedMenuRisk?.menuName || selectedDriver?.menuName,
                      costPerPerson: selectedMenuRisk?.currentCostPerPerson || selectedDriver?.currentCostPerPerson,
                      futureCostPerPerson: selectedMenuRisk?.futureCostPerPerson || selectedDriver?.futureCostPerPerson,
                    })}
                  >
                    🔄 대체 메뉴 절감액 분석
                  </button>
                )}
              </div>
            </div>

            {increasedIngredients.length === 0 ? (
              <div
                className="table-empty-box"
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '12px',
                  margin: '12px 0',
                }}
              >
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>✅</span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1b4332' }}>
                  위험도가 감지된 식재료가 없습니다.
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#607d6d' }}>
                  해당 메뉴는 단가가 상승한 식재료가 없으며, 모든 구성 품목의 가격이 안정적으로 유지되고 있습니다.
                </p>
              </div>
            ) : (
              <div className="brand-table-wrapper">
                <table className="brand-table">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>식재료명</th>
                      <th>사용량</th>
                      <th>단가 변동</th>
                      <th>상승률</th>
                      <th>재료비 상승액</th>
                      <th>기여율 (%)</th>
                      <th>위험도 / 사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {increasedIngredients.map((d, idx) => {
                      const rank = idx + 1;
                      const isCostUp = true;
                      const increaseRate = Number(d?.unitPriceIncreaseRate || 0);
                      const ingRiskLevel =
                        d?.ingredientRiskLevel && d.ingredientRiskLevel !== 'SAFE'
                          ? d.ingredientRiskLevel
                          : increaseRate >= 15
                            ? 'WARNING'
                            : increaseRate >= 5
                              ? 'CAUTION'
                              : 'SAFE';
                      const riskReason =
                        d?.riskReason && d.riskReason !== '가격 변동 안정'
                          ? d.riskReason
                          : `단가 +${increaseRate}% 상승`;

                      return (
                        <tr key={d?.ingredientId || idx} className={rank === 1 ? 'row-top-driver' : ''}>
                          <td>
                            <span className={`rank-pill ${rank === 1 ? 'rank-1' : ''}`}>#{rank}</span>
                          </td>
                          <td><strong>{d?.ingredientName || '식재료'}</strong></td>
                          <td>{Number(d?.quantity || 0).toLocaleString()}g</td>
                          <td>{formatUnitPrice(d?.currentUnitPrice)} ➔ {formatUnitPrice(d?.futureUnitPrice)}</td>
                          <td className="text-red">
                            ▲ +{Math.abs(Number(d?.unitPriceIncreaseRate || 0))}%
                          </td>
                          <td className="text-red fw-bold">
                            +{formatWon(Math.abs(Number(d?.lineCostDifference || 0)))}
                          </td>
                          <td>
                            <div className="driver-bar-wrapper">
                              <div
                                className="driver-bar-fill"
                                style={{ width: `${Math.min(Math.max(Number(d?.contributionRate) || 0, 0), 100)}%` }}
                              />
                              <span>{d?.contributionRate || 0}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`risk-reason-pill ${(ingRiskLevel || 'safe').toLowerCase()}`}>
                              {ingRiskLevel === 'WARNING' ? '🚨 ' : ingRiskLevel === 'CAUTION' ? '⚠️ ' : '✅ '}
                              {riskReason}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
