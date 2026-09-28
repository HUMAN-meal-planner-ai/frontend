import { useEffect, useMemo, useState } from 'react'
import { getWeeklyPredictionChart, getWeeklyRiskRankings } from '../../price/api/priceApi'

const toLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatPrice = (value) => value == null
  ? '-'
  : `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value)}원`

const formatRate = (value) => {
  if (value == null) return '-'
  const percent = Number(value) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

const formatScore = (value) => value == null ? '-' : `${Math.round(Number(value) * 100)}점`

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message ||
  (error.request ? '백엔드 또는 AI 서버에 연결할 수 없습니다.' : fallback)
)

/** 가격 수집 결과와 주간 예측·위험도를 운영자가 한 화면에서 점검하는 관리자 패널입니다. */
export default function AdminPriceDataPanel() {
  const period = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 89)
    return { startDate: toLocalDate(start), endDate: toLocalDate(end) }
  }, [])
  const [rankingResponse, setRankingResponse] = useState(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState(null)
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartError, setChartError] = useState('')

  const rankings = rankingResponse?.rankings ?? []
  const selectedRanking = rankings.find((item) => item.seriesId === selectedSeriesId) ?? null
  const riskyCount = rankings.filter((item) => item.risky).length

  const loadRankings = async () => {
    setLoading(true)
    setError('')
    setChartLoading(true)
    setChartError('')
    setChart(null)
    setSelectedSeriesId(null)
    try {
      const response = await getWeeklyRiskRankings(100)
      setRankingResponse(response)
      setSelectedSeriesId(response.rankings?.[0]?.seriesId ?? null)
    } catch (requestError) {
      setRankingResponse(null)
      setSelectedSeriesId(null)
      setChart(null)
      setError(getErrorMessage(requestError, '가격 데이터를 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getWeeklyRiskRankings(100)
      .then((response) => {
        if (cancelled) return
        setRankingResponse(response)
        setSelectedSeriesId(response.rankings?.[0]?.seriesId ?? null)
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(getErrorMessage(requestError, '가격 데이터를 불러오지 못했습니다.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedSeriesId) return
    let cancelled = false
    getWeeklyPredictionChart(selectedSeriesId, period.startDate, period.endDate)
      .then((response) => { if (!cancelled) setChart(response) })
      .catch((requestError) => {
        if (!cancelled) {
          setChart(null)
          setChartError(getErrorMessage(requestError, '선택한 가격 이력을 불러오지 못했습니다.'))
        }
      })
      .finally(() => { if (!cancelled) setChartLoading(false) })
    return () => { cancelled = true }
  }, [period, selectedSeriesId])

  const actualPrices = [...(chart?.actualPrices ?? [])].reverse()
  const selectSeries = (seriesId) => {
    setChartLoading(true)
    setChartError('')
    setChart(null)
    setSelectedSeriesId(seriesId)
  }

  return (
    <section className="admin-price-panel" aria-labelledby="admin-price-title">
      <div className="operations-heading">
        <div><p>PRICE OPERATIONS</p><h2 id="admin-price-title">가격 데이터 조회</h2></div>
        <button type="button" onClick={loadRankings} disabled={loading}>새로고침</button>
      </div>

      {loading && <div className="admin-state"><span className="admin-spinner" />가격·예측 데이터를 불러오고 있습니다.</div>}
      {!loading && error && <div className="admin-state error"><strong>가격 데이터를 표시할 수 없습니다.</strong><p>{error}</p><button type="button" onClick={loadRankings}>다시 시도</button></div>}
      {!loading && !error && <>
        <div className="price-admin-summary">
          <article><span>조회 가능 품목</span><strong>{rankingResponse?.rankedCount ?? 0}<small>개</small></strong><p>최신 주간 예측 보유</p></article>
          <article><span>위험 품목</span><strong>{riskyCount}<small>개</small></strong><p>종합 위험점수 75점 이상</p></article>
          <article><span>제외 시계열</span><strong>{rankingResponse?.excludedSeriesCount ?? 0}<small>건</small></strong><p>미지원 또는 이력 부족</p></article>
          <article><span>조회 기간</span><strong className="price-period-value">90<small>일</small></strong><p>{period.startDate}부터</p></article>
        </div>

        {rankings.length === 0 ? (
          <div className="admin-state"><strong>조회 가능한 가격 예측이 없습니다.</strong><p>가격 수집과 주간 예측 실행 상태를 확인해 주세요.</p></div>
        ) : <>
          <div className="price-admin-toolbar">
            <label htmlFor="admin-price-series">조회 품목</label>
            <select id="admin-price-series" value={selectedSeriesId ?? ''} onChange={(event) => selectSeries(Number(event.target.value))}>
              {rankings.map((item) => <option key={item.seriesId} value={item.seriesId}>{item.ingredientName} · {item.standardUnit} · series {item.seriesId}</option>)}
            </select>
            <span>위험 신호가 높은 순서로 정렬됩니다.</span>
          </div>

          <div className="price-admin-grid">
            <section className="price-admin-card">
              <div className="price-admin-card-head"><div><span>SELECTED SERIES</span><h3>{selectedRanking?.ingredientName}</h3></div><b className={selectedRanking?.risky ? 'danger' : 'safe'}>{selectedRanking?.risky ? '위험' : '안정'}</b></div>
              <dl className="price-admin-metrics">
                <div><dt>기준 가격</dt><dd>{formatPrice(selectedRanking?.basePrice)}</dd></div>
                <div><dt>7일 평균 예측</dt><dd>{formatPrice(selectedRanking?.predictedPrice)}</dd></div>
                <div><dt>예상 상승률</dt><dd>{formatRate(selectedRanking?.expectedIncreaseRate)}</dd></div>
                <div><dt>최대가격 예측</dt><dd>{formatPrice(selectedRanking?.predictedMaxPrice)}</dd></div>
                <div><dt>Ridge 점수</dt><dd>{formatScore(selectedRanking?.ridgeScore)}</dd></div>
                <div><dt>종합 위험점수</dt><dd>{formatScore(selectedRanking?.combinedRiskScore)}</dd></div>
              </dl>
              <p className="price-admin-note">기준일 {selectedRanking?.baseDate} · 예측 대상일 {selectedRanking?.targetDate} · {selectedRanking?.ingredientCode}</p>
            </section>

            <section className="price-admin-card price-history-card">
              <div className="price-admin-card-head"><div><span>ACTUAL PRICE HISTORY</span><h3>최근 실제 대표가격</h3></div><small>{chart?.standardUnit ? `원/${chart.standardUnit}` : ''}</small></div>
              {chartLoading && <div className="price-admin-substate">가격 이력을 불러오는 중입니다.</div>}
              {!chartLoading && chartError && <div className="price-admin-substate error">{chartError}</div>}
              {!chartLoading && !chartError && actualPrices.length === 0 && <div className="price-admin-substate">표시할 실제 가격이 없습니다.</div>}
              {!chartLoading && !chartError && actualPrices.length > 0 && (
                <div className="price-history-table-wrap"><table className="price-history-table"><thead><tr><th>가격일</th><th>대표가격</th></tr></thead><tbody>{actualPrices.slice(0, 12).map((point) => <tr key={point.priceDate}><td>{point.priceDate}</td><td>{formatPrice(point.price)}</td></tr>)}</tbody></table></div>
              )}
            </section>
          </div>

          <section className="price-ranking-table-card">
            <div className="price-admin-card-head"><div><span>RISK RANKING</span><h3>전체 가격 위험 순위</h3></div><small>Ridge 점수 우선</small></div>
            <div className="price-ranking-table-wrap"><table className="price-ranking-table"><thead><tr><th>순위</th><th>식재료</th><th>기준가격</th><th>7일 평균 예측</th><th>예상 상승률</th><th>Ridge</th><th>종합 위험</th><th>상태</th></tr></thead><tbody>{rankings.map((item) => <tr key={item.seriesId} className={item.seriesId === selectedSeriesId ? 'selected' : ''} onClick={() => selectSeries(item.seriesId)}><td>{item.rank}</td><td><strong>{item.ingredientName}</strong><small>{item.ingredientCode} · {item.standardUnit}</small></td><td>{formatPrice(item.basePrice)}</td><td>{formatPrice(item.predictedPrice)}</td><td className={Number(item.expectedIncreaseRate) >= 0 ? 'price-up' : 'price-down'}>{formatRate(item.expectedIncreaseRate)}</td><td>{formatScore(item.ridgeScore)}</td><td>{formatScore(item.combinedRiskScore)}</td><td><span className={`price-risk-chip ${item.risky ? 'danger' : 'safe'}`}>{item.risky ? '위험' : '안정'}</span></td></tr>)}</tbody></table></div>
          </section>
        </>}
      </>}
    </section>
  )
}
