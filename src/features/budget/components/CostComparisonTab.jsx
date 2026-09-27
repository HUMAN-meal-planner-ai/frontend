import { formatWon, checkIsIncreased } from '../utils/budgetUtils';

export default function CostComparisonTab({
  comparisons,
  appliedParams,
  selectedMenuId,
  onSelectMenu,
  selectedComparison,
}) {
  return (
    <div className="tab-fade-in">
      <div className="budget-glass-panel">
        <div className="panel-header-bar">
          <div>
            <h3>현재가 vs {appliedParams.targetDate} 미래 예측가 변동 비교</h3>
            <p className="panel-desc">식재료 가격 예측에 따른 1인분 및 총 원가 인상액과 변동률(%)</p>
          </div>
        </div>

        <div className="brand-table-wrapper">
          <table className="brand-table">
            <thead>
              <tr>
                <th>메뉴 ID</th>
                <th>메뉴명</th>
                <th>현재 1인분</th>
                <th>미래 1인분 ({appliedParams.targetDate})</th>
                <th>1인분 변동액</th>
                <th>총 변동액 ({appliedParams.mealCount}명)</th>
                <th>상승률 (%)</th>
                <th>추세</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((comp) => {
                const isSelected = selectedMenuId === comp.menuId;
                const isIncreased = checkIsIncreased(comp);
                const isPlus = Number(comp.costDifference) > 0;
                const isMinus = Number(comp.costDifference) < 0;
                return (
                  <tr
                    key={comp.menuId}
                    className={`table-clickable-row ${isSelected ? 'row-active' : ''}`}
                    onClick={() => onSelectMenu(comp.menuId)}
                  >
                    <td><span className="id-tag">#{comp.menuId}</span></td>
                    <td><strong className="menu-name-text">{comp.menuName}</strong></td>
                    <td>{formatWon(comp.currentCostPerPerson)}</td>
                    <td>{formatWon(comp.futureCostPerPerson)}</td>
                    <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                      {isPlus ? `+${formatWon(comp.costDifference)}` : formatWon(comp.costDifference)}
                    </td>
                    <td className={isPlus ? 'text-red' : ''}>
                      {isPlus ? `+${formatWon(comp.totalCostDifference)}` : formatWon(comp.totalCostDifference)}
                    </td>
                    <td className={isPlus ? 'text-red fw-bold' : isMinus ? 'text-green' : ''}>
                      {isPlus ? `▲ +${comp.increaseRate}%` : isMinus ? `▼ ${comp.increaseRate}%` : '0.00%'}
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
      </div>

      {/* 선택 메뉴의 식재료별 상세 변동 */}
      {selectedComparison && (
        <div className="budget-glass-panel">
          <div className="panel-header-bar">
            <h3>[식재료별 단가 변동 내역] {selectedComparison.menuName}</h3>
            <span className="formula-sum-badge">
              총 인상률: <strong className={checkIsIncreased(selectedComparison) ? 'text-red' : 'text-green'}>
                {selectedComparison.increaseRate}% ({formatWon(selectedComparison.costDifference)})
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
                {selectedComparison.ingredientComparisons?.map((ing) => {
                  const isUp = Number(ing.lineCostDifference) > 0;
                  const isDown = Number(ing.lineCostDifference) < 0;
                  return (
                    <tr key={ing.ingredientId}>
                      <td><strong>{ing.ingredientName}</strong></td>
                      <td>{Number(ing.quantity).toLocaleString()}g</td>
                      <td>{formatWon(ing.currentUnitPrice)}</td>
                      <td>{formatWon(ing.futureUnitPrice)}</td>
                      <td className={isUp ? 'text-red' : isDown ? 'text-green' : ''}>
                        {isUp ? `▲ +${ing.unitPriceIncreaseRate}%` : isDown ? `▼ ${ing.unitPriceIncreaseRate}%` : '0%'}
                      </td>
                      <td className={isUp ? 'text-red fw-bold' : isDown ? 'text-green' : ''}>
                        {isUp ? `+${formatWon(ing.lineCostDifference)}` : formatWon(ing.lineCostDifference)}
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
