const WIDTH = 760
const HEIGHT = 300
const PADDING = { top: 28, right: 36, bottom: 44, left: 72 }

const toTime = (date) => new Date(`${date}T00:00:00`).getTime()

const formatPrice = (value) => new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
}).format(value)

export default function PriceHistoryChart({ chart }) {
  const actualPrices = chart?.actualPrices ?? []
  const prediction = chart?.weeklyPrediction

  if (!prediction || actualPrices.length === 0) {
    return <div className="price-empty">표시할 실제·예측 가격이 없습니다.</div>
  }

  const allDates = [
    ...actualPrices.map((point) => point.priceDate),
    prediction.targetDate,
  ]
  const allPrices = [
    ...actualPrices.map((point) => Number(point.price)),
    Number(prediction.basePrice),
    Number(prediction.predictedPrice),
  ]
  const minTime = Math.min(...allDates.map(toTime))
  const maxTime = Math.max(...allDates.map(toTime))
  const rawMinPrice = Math.min(...allPrices)
  const rawMaxPrice = Math.max(...allPrices)
  const pricePadding = Math.max((rawMaxPrice - rawMinPrice) * 0.12, rawMaxPrice * 0.03, 1)
  const minPrice = rawMinPrice - pricePadding
  const maxPrice = rawMaxPrice + pricePadding
  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const x = (date) => PADDING.left + (
    maxTime === minTime ? plotWidth / 2 : ((toTime(date) - minTime) / (maxTime - minTime)) * plotWidth
  )
  const y = (price) => PADDING.top + (
    (maxPrice - Number(price)) / (maxPrice - minPrice)
  ) * plotHeight
  const actualLine = actualPrices
    .map((point) => `${x(point.priceDate)},${y(point.price)}`)
    .join(' ')
  const basePoint = `${x(prediction.baseDate)},${y(prediction.basePrice)}`
  const predictedPoint = `${x(prediction.targetDate)},${y(prediction.predictedPrice)}`
  const yTicks = [maxPrice, (maxPrice + minPrice) / 2, minPrice]

  return (
    <div className="price-chart-wrap">
      <div className="price-chart-legend" aria-label="차트 범례">
        <span><i className="legend-actual" />실제 일별 대표가격</span>
        <span><i className="legend-prediction" />향후 7일 평균 예측 1건</span>
      </div>
      <svg
        className="price-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${chart.ingredientName} 실제 가격과 향후 7일 평균 예측 가격 차트`}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              className="chart-grid-line"
            />
            <text x={PADDING.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-axis-label">
              {formatPrice(tick)}
            </text>
          </g>
        ))}
        <polyline points={actualLine} className="chart-actual-line" />
        {actualPrices.map((point) => (
          <circle
            key={point.priceDate}
            cx={x(point.priceDate)}
            cy={y(point.price)}
            r="3.5"
            className="chart-actual-point"
          >
            <title>{`${point.priceDate}: ${formatPrice(point.price)}원`}</title>
          </circle>
        ))}
        <line
          x1={basePoint.split(',')[0]}
          y1={basePoint.split(',')[1]}
          x2={predictedPoint.split(',')[0]}
          y2={predictedPoint.split(',')[1]}
          className="chart-prediction-line"
        />
        <circle
          cx={x(prediction.targetDate)}
          cy={y(prediction.predictedPrice)}
          r="6"
          className="chart-prediction-point"
        >
          <title>{`${prediction.targetDate}: 향후 7일 평균 ${formatPrice(prediction.predictedPrice)}원`}</title>
        </circle>
        <text x={x(prediction.targetDate)} y={y(prediction.predictedPrice) - 13} textAnchor="middle" className="chart-prediction-label">
          7일 평균 {formatPrice(prediction.predictedPrice)}원
        </text>
        <text x={PADDING.left} y={HEIGHT - 14} textAnchor="start" className="chart-axis-label">
          {allDates[0]}
        </text>
        <text x={WIDTH - PADDING.right} y={HEIGHT - 14} textAnchor="end" className="chart-axis-label">
          {prediction.targetDate}
        </text>
      </svg>
      <p className="price-chart-note">
        예측점은 {prediction.baseDate} 기준으로 산출한 다음 7일의 평균 예상가격이며,
        D+1~D+7 일별 예측값이 아닙니다.
      </p>
    </div>
  )
}
