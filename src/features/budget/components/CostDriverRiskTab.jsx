import { formatWon, checkIsCostIncrease } from '../utils/budgetUtils';

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

export default function CostDriverRiskTab({
  drivers,
  menuRisks,
  selectedMenuId,
  onSelectMenu,
  selectedMenuRisk,
  selectedDriver,
  replacementCandidates,
}) {
  const candidates = replacementCandidates?.candidates || [];

  return (
    <div className="tab-fade-in">
      {/* 1. [AUTO-006] 주간 재평가 변경 검토 메뉴 후보 배너/섹션 */}
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
            {candidates.map((c) => {
              const isSelected = selectedMenuId === c.menuId;
              return (
                <div
                  key={c.menuId}
                  className={`candidate-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectMenu(c.menuId)}
                >
                  <div className="candidate-card-top">
                    <span className="candidate-rank-badge">영향도 #{c.impactRank || c.rank || 1}</span>
                    <strong className="candidate-menu-name">{c.menuName}</strong>
                    <span className="candidate-surge-rate">
                      +{c.increaseRate}% 상승
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. 전체 메뉴 위험도 & Cost Driver 카드 그리드 */}
      <div className="driver-cards-masonry">
        {drivers.map((drv) => {
          const isSelected = selectedMenuId === drv.menuId;
          const top = drv.topDriver;
          const isTopIncrease = checkIsCostIncrease(top);
          const riskInfo = menuRisks.find((r) => r.menuId === drv.menuId);
          const riskLevel =
            riskInfo?.riskLevel ||
            (Number(drv.totalIncreaseRate) >= 15
              ? 'WARNING'
              : Number(drv.totalIncreaseRate) >= 7
                ? 'CAUTION'
                : 'SAFE');
          const riskScore =
            riskInfo?.riskScore ??
            (riskLevel === 'WARNING' ? 85 : riskLevel === 'CAUTION' ? 55 : 20);

          return (
            <div
              key={drv.menuId}
              className={`driver-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectMenu(drv.menuId)}
            >
              <div className="driver-card-head">
                <span className="id-tag">#{drv.menuId}</span>
                <strong className="driver-menu-title">{drv.menuName}</strong>
                <span className="driver-rate-tag">▲ {drv.totalIncreaseRate}%</span>
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
                    className={`risk-score-bar-fill ${riskLevel.toLowerCase()}`}
                    style={{ width: `${Math.min(riskScore, 100)}%` }}
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

      {/* 3. 선택된 메뉴의 세부 식재료별 변동 내역 테이블 */}
      {(selectedMenuRisk || selectedDriver) && (
        <div className="budget-glass-panel">
          <div className="panel-header-bar">
            <div>
              <h3>
                [식재료별 위험 요인 상세]{' '}
                {selectedMenuRisk?.menuName || selectedDriver?.menuName}
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
                <strong className="text-red">
                  +{formatWon(selectedMenuRisk?.costDifference || selectedDriver?.totalCostDifference)}
                </strong>
              </span>
            </div>
          </div>

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
                {(selectedMenuRisk?.riskIngredients || selectedDriver?.rankedDrivers)?.map(
                  (d, idx) => {
                    const rank = d.rank || idx + 1;
                    const isCostUp = checkIsCostIncrease(d);
                    const ingRiskLevel =
                      d.ingredientRiskLevel ||
                      (isCostUp && Number(d.unitPriceIncreaseRate) >= 15
                        ? 'WARNING'
                        : isCostUp && Number(d.unitPriceIncreaseRate) >= 5
                          ? 'CAUTION'
                          : 'SAFE');
                    const riskReason =
                      d.riskReason ||
                      (isCostUp ? `단가 ${d.unitPriceIncreaseRate}% 급등` : '가격 안정');

                    return (
                      <tr key={d.ingredientId} className={rank === 1 && isCostUp ? 'row-top-driver' : ''}>
                        <td>
                          <span className={`rank-pill ${rank === 1 ? 'rank-1' : ''}`}>#{rank}</span>
                        </td>
                        <td><strong>{d.ingredientName}</strong></td>
                        <td>{Number(d.quantity).toLocaleString()}g</td>
                        <td>{formatWon(d.currentUnitPrice)} ➔ {formatWon(d.futureUnitPrice)}</td>
                        <td className={isCostUp ? 'text-red' : ''}>
                          {isCostUp ? `▲ +${d.unitPriceIncreaseRate}%` : `${d.unitPriceIncreaseRate}%`}
                        </td>
                        <td className={isCostUp ? 'text-red fw-bold' : ''}>
                          {isCostUp ? `+${formatWon(d.lineCostDifference)}` : formatWon(d.lineCostDifference)}
                        </td>
                        <td>
                          <div className="driver-bar-wrapper">
                            <div
                              className="driver-bar-fill"
                              style={{ width: `${Math.min(Number(d.contributionRate) || 0, 100)}%` }}
                            />
                            <span>{d.contributionRate}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`risk-reason-pill ${ingRiskLevel.toLowerCase()}`}>
                            {ingRiskLevel === 'WARNING' ? '🚨 ' : ingRiskLevel === 'CAUTION' ? '⚠️ ' : '✅ '}
                            {riskReason}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
