import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWeeklyPredictionChart, getWeeklyRiskRankings } from '../api/priceApi'
import PriceHistoryChart from '../components/PriceHistoryChart'
import RiskIngredientRanking from '../components/RiskIngredientRanking'
import './PriceForecastPage.css'

const toLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const errorMessage = (error, fallback) => (
  error.response?.data?.message ||
  (error.request ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' : fallback)
)

export default function PriceForecastPage() {
  const chartPeriod = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 89)
    return { startDate: toLocalDate(start), endDate: toLocalDate(end) }
  }, [])
  const [rankingResponse, setRankingResponse] = useState(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState(null)
  const [chart, setChart] = useState(null)
  const [rankingLoading, setRankingLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [rankingError, setRankingError] = useState('')
  const [chartError, setChartError] = useState('')
  const [chartRequestVersion, setChartRequestVersion] = useState(0)

  useEffect(() => {
    let active = true
    getWeeklyRiskRankings(10).then((response) => {
      if (!active) return
      const nextSeriesId = response.rankings?.[0]?.seriesId ?? null
      setRankingResponse(response)
      setChartLoading(Boolean(nextSeriesId))
      setSelectedSeriesId(nextSeriesId)
    }).catch((error) => {
      if (!active) return
      setRankingError(errorMessage(error, '위험 식재료 순위를 불러오지 못했습니다.'))
    }).finally(() => {
      if (active) setRankingLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedSeriesId) return
    let active = true
    getWeeklyPredictionChart(
      selectedSeriesId,
      chartPeriod.startDate,
      chartPeriod.endDate,
    ).then((response) => {
      if (active) setChart(response)
    }).catch((error) => {
      if (active) {
        setChart(null)
        setChartError(errorMessage(error, '가격 차트를 불러오지 못했습니다.'))
      }
    }).finally(() => {
      if (active) setChartLoading(false)
    })
    return () => { active = false }
  }, [chartPeriod, chartRequestVersion, selectedSeriesId])

  const loadRankings = async () => {
    setRankingLoading(true)
    setRankingError('')
    try {
      const response = await getWeeklyRiskRankings(10)
      const nextSeriesId = response.rankings?.[0]?.seriesId ?? null
      setRankingResponse(response)
      setChartLoading(Boolean(nextSeriesId))
      setChart(null)
      setSelectedSeriesId(nextSeriesId)
      setChartRequestVersion((current) => current + 1)
    } catch (error) {
      setRankingResponse(null)
      setSelectedSeriesId(null)
      setChart(null)
      setRankingError(errorMessage(error, '위험 식재료 순위를 불러오지 못했습니다.'))
    } finally {
      setRankingLoading(false)
    }
  }

  const selectSeries = (seriesId) => {
    if (seriesId === selectedSeriesId) return
    setChartLoading(true)
    setChartError('')
    setSelectedSeriesId(seriesId)
  }

  const retryChart = () => {
    setChartLoading(true)
    setChartError('')
    setChartRequestVersion((current) => current + 1)
  }

  return (
    <main className="price-page">
      <header className="price-page-header">
        <Link to="/home" className="price-logo">MEAL<span>FIT</span></Link>
        <nav aria-label="주요 메뉴">
          <Link to="/meal-plans">식단 관리</Link>
          <Link to="/budget">예산 분석</Link>
          <Link to="/prices" className="active">가격 예측</Link>
        </nav>
      </header>

      <section className="price-page-content">
        <div className="price-title-row">
          <div>
            <p className="price-eyebrow">PRICE FORECAST</p>
            <h1>식재료 가격 예측</h1>
            <p>실제 KAMIS 대표가격과 향후 7일 평균 예측을 비교하고 위험 품목을 확인하세요.</p>
          </div>
          <span className="price-model-badge">weekly Ridge · 7일 평균</span>
        </div>

        <div className="price-dashboard-grid">
          <section className="price-panel price-chart-panel">
            <div className="price-panel-heading">
              <div>
                <span>실제·예측 가격</span>
                <h2>{chart?.ingredientName ?? '식재료를 선택하세요'}</h2>
              </div>
              {chart && <small>단위: 원/{chart.standardUnit}</small>}
            </div>
            {chartLoading && <div className="price-loading"><i />가격 차트를 불러오는 중입니다.</div>}
            {!chartLoading && chartError && (
              <div className="price-error" role="alert">
                <p>{chartError}</p><button type="button" onClick={retryChart}>다시 시도</button>
              </div>
            )}
            {!chartLoading && !chartError && chart && <PriceHistoryChart chart={chart} />}
            {!chartLoading && !chartError && !chart && <div className="price-empty">선택된 가격 데이터가 없습니다.</div>}
          </section>

          <aside className="price-panel risk-panel">
            <div className="price-panel-heading">
              <div><span>RISK RANKING</span><h2>위험 식재료 순위</h2></div>
              <small>Ridge 점수 우선</small>
            </div>
            {rankingLoading && <div className="price-loading"><i />위험 순위를 계산하는 중입니다.</div>}
            {!rankingLoading && rankingError && (
              <div className="price-error" role="alert">
                <p>{rankingError}</p><button type="button" onClick={loadRankings}>다시 시도</button>
              </div>
            )}
            {!rankingLoading && !rankingError && (
              <RiskIngredientRanking
                rankings={rankingResponse?.rankings ?? []}
                selectedSeriesId={selectedSeriesId}
                onSelect={selectSeries}
              />
            )}
            {!rankingLoading && !rankingError && rankingResponse?.excludedSeriesCount > 0 && (
              <p className="risk-excluded-note">
                미지원 또는 가격 이력이 부족한 시계열 {rankingResponse.excludedSeriesCount}건은 제외했습니다.
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}
