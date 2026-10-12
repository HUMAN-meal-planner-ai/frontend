import { useEffect, useState } from 'react'
import { getWeeklyRiskRankings } from '../../price/api/priceApi'
import './WeeklyRiskIngredientTop5.css'

const TOP_COUNT = 5

const scorePercent = (score) => `${Math.round(Number(score) * 100)}%`

const formatRate = (rate) => {
  if (rate == null) return '계산 불가'
  const percent = Number(rate) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

const formatPrice = (price) => {
  if (price == null || Number.isNaN(Number(price))) return '-'
  return Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const errorMessage = (error) => (
  error.response?.data?.message ||
  (error.request ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' : '위험 식재료 순위를 불러오지 못했습니다.')
)

/**
 * 향후 7일 가격 예측 기준으로 가격 상승 위험이 큰 식재료 1~5위를 주간 메뉴 조회 화면에 보여줍니다.
 * 순위 조회 실패가 주간 식단 화면 전체에 영향을 주지 않도록 자체 로딩·오류 상태를 가집니다.
 */
export default function WeeklyRiskIngredientTop5() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    getWeeklyRiskRankings(TOP_COUNT)
      .then((data) => { if (active) setResponse(data) })
      .catch((requestError) => {
        if (active) {
          setResponse(null)
          setError(errorMessage(requestError))
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  const retry = () => {
    setLoading(true)
    setError('')
    setReloadKey((current) => current + 1)
  }

  const rankings = response?.rankings ?? []

  return (
    <section className="weekly-risk-top5" aria-label="가격 위험 식재료 순위">
      <div className="weekly-risk-heading">
        <div>
          <span className="weekly-insight-label">PRICE RISK TOP 5</span>
          <h2>가격 위험 식재료 순위</h2>
          <p>향후 7일 가격 예측에서 상승 위험이 큰 식재료 1~5위입니다.</p>
        </div>
        <small>Ridge 점수 우선</small>
      </div>

      {loading && <p className="weekly-risk-state">위험 순위를 계산하는 중입니다.</p>}
      {!loading && error && (
        <div className="weekly-risk-state weekly-risk-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>다시 시도</button>
        </div>
      )}
      {!loading && !error && rankings.length === 0 && (
        <p className="weekly-risk-state">조회 가능한 위험 식재료가 없습니다.</p>
      )}
      {!loading && !error && rankings.length > 0 && (
        <ol className="weekly-risk-list">
          {rankings.map((item) => (
            <li key={item.seriesId} className="weekly-risk-item">
              <span className="weekly-risk-rank">{item.rank}</span>
              <span className="weekly-risk-ingredient">
                <strong>{item.ingredientName}</strong>
                <small>{item.ingredientCode} · 기준일 {item.baseDate}</small>
              </span>
              <span className="weekly-risk-price">
                <strong>{formatPrice(item.basePrice)} → {formatPrice(item.predictedPrice)}</strong>
                <small>원/{item.standardUnit} · 7일 평균 예측</small>
              </span>
              <span className="weekly-risk-score">
                <strong>Ridge {scorePercent(item.ridgeScore)}</strong>
                <small>종합 {scorePercent(item.combinedRiskScore)}</small>
              </span>
              <span className={`weekly-risk-change ${Number(item.expectedIncreaseRate) >= 0 ? 'up' : 'down'}`}>
                {formatRate(item.expectedIncreaseRate)}
              </span>
            </li>
          ))}
        </ol>
      )}
      {!loading && !error && response?.excludedSeriesCount > 0 && (
        <p className="weekly-risk-note">
          해당 기간 가격 데이터가 없거나 이력이 부족한 시계열 {response.excludedSeriesCount}건은 순위에서 제외했습니다.
        </p>
      )}
    </section>
  )
}
