const scorePercent = (score) => `${Math.round(Number(score) * 100)}%`

const formatRate = (rate) => {
  if (rate == null) return '계산 불가'
  const percent = Number(rate) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

export default function RiskIngredientRanking({ rankings, selectedSeriesId, onSelect }) {
  if (!rankings.length) {
    return <div className="price-empty">조회 가능한 위험 식재료가 없습니다.</div>
  }

  return (
    <ol className="risk-ranking-list">
      {rankings.map((item) => (
        <li key={item.seriesId}>
          <button
            type="button"
            className={`risk-ranking-item ${selectedSeriesId === item.seriesId ? 'active' : ''}`}
            onClick={() => onSelect(item.seriesId)}
          >
            <span className="risk-rank">{item.rank}</span>
            <span className="risk-ingredient">
              <strong>{item.ingredientName}</strong>
              <small>{item.ingredientCode} · {item.standardUnit}</small>
            </span>
            <span className="risk-score">
              <strong>Ridge {scorePercent(item.ridgeScore)}</strong>
              <small>종합 {scorePercent(item.combinedRiskScore)}</small>
            </span>
            <span className={`risk-change ${Number(item.expectedIncreaseRate) >= 0 ? 'up' : 'down'}`}>
              {formatRate(item.expectedIncreaseRate)}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
