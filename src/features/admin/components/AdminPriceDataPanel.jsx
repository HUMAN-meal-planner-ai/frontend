import { useEffect, useMemo, useState } from 'react'
import { getWeeklyPredictionChart, getWeeklyRiskRankings } from '../../price/api/priceApi'
import { getAdminPriceDataStatus, getAdminPriceMappings, reviewAdminPriceMapping } from '../api/adminApi'

const toLocalDate = (date) => {
  // 브라우저의 UTC 변환으로 날짜가 하루 달라지는 일을 피하려고 로컬 연·월·일을 직접 조합합니다.
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatPrice = (value) => value == null
  ? '-'
  : `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value)}원`

const formatRate = (value) => {
  // API 상승률은 0.05처럼 비율로 전달되므로 관리자 화면에서는 5.0% 형태로 변환합니다.
  if (value == null) return '-'
  const percent = Number(value) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

const formatScore = (value) => value == null ? '-' : `${Math.round(Number(value) * 100)}점`
// 저장 건수와 시계열 수는 천 단위 구분 기호를 넣어 많은 데이터도 빠르게 읽을 수 있게 합니다.
const formatCount = (value) => new Intl.NumberFormat('ko-KR').format(value ?? 0)
// 서버가 전달한 ISO 시각은 관리자가 사용하는 브라우저의 지역 시각으로 표시합니다.
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '-'

// 백엔드 상태 코드는 조건 분기에 사용하고, 사용자에게는 이해하기 쉬운 한국어 문구를 보여 줍니다.
const statusLabels = { UP: '정상', STALE: '갱신 필요', NO_DATA: '데이터 없음' }

const getErrorMessage = (error, fallback) => (
  // 서버가 업무 오류 문구를 보내면 우선 사용하고, 네트워크 실패와 기타 오류를 구분합니다.
  error.response?.data?.message ||
  (error.request ? '백엔드 또는 AI 서버에 연결할 수 없습니다.' : fallback)
)

/** 가격 수집 결과와 주간 예측·위험도를 운영자가 한 화면에서 점검하는 관리자 패널입니다. */
export default function AdminPriceDataPanel() {
  // 실제 가격 이력은 오늘을 포함한 90일 범위로 고정하며 렌더링 때마다 날짜가 다시 계산되지 않게 합니다.
  const period = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 89)
    return { startDate: toLocalDate(start), endDate: toLocalDate(end) }
  }, [])
  // 수집 현황과 AI 예측은 서로 다른 API이므로 데이터·로딩·오류 상태를 각각 관리합니다.
  // 이렇게 분리하면 AI 서버가 꺼져 있어도 DB 수집 현황은 계속 확인할 수 있습니다.
  const [rankingResponse, setRankingResponse] = useState(null)
  const [dataStatus, setDataStatus] = useState(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState(null)
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [mappings, setMappings] = useState([])
  const [mappingError, setMappingError] = useState('')
  const [reviewingId, setReviewingId] = useState(null)
  const [chartError, setChartError] = useState('')

  const rankings = rankingResponse?.rankings ?? []
  // 선택 ID가 아직 없거나 새 응답에서 제외된 경우 화면이 중단되지 않도록 null을 허용합니다.
  const selectedRanking = rankings.find((item) => item.seriesId === selectedSeriesId) ?? null
  const riskyCount = rankings.filter((item) => item.risky).length

  const loadRankings = async () => {
    // 재조회 중 이전 품목의 차트가 남아 새 결과로 오해되지 않도록 관련 상태를 먼저 초기화합니다.
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

  const loadDataStatus = async () => {
    // 이 함수는 상단 새로고침과 수집 현황의 '다시 시도' 버튼에서 함께 사용합니다.
    setStatusLoading(true)
    setStatusError('')
    try {
      setDataStatus(await getAdminPriceDataStatus())
    } catch (requestError) {
      setDataStatus(null)
      setStatusError(getErrorMessage(requestError, '가격 수집 현황을 불러오지 못했습니다.'))
    } finally {
      setStatusLoading(false)
    }
  }

  const refreshAll = () => {
    // 수집 통계와 AI 예측은 서로 다른 API이므로 한쪽이 실패해도 다른 영역은 계속 표시합니다.
    loadDataStatus()
    loadRankings()
    getAdminPriceMappings().then(setMappings).catch(() => setMappingError('가격 매핑을 불러오지 못했습니다.'))
  }

  useEffect(() => {
    // 최초 진입 시 가격 수집 통계를 불러옵니다. cancelled는 화면 이탈 뒤 setState가 실행되는 것을 막습니다.
    let cancelled = false
    getAdminPriceDataStatus()
      .then((response) => { if (!cancelled) setDataStatus(response) })
      .catch((requestError) => {
        if (!cancelled) setStatusError(getErrorMessage(requestError, '가격 수집 현황을 불러오지 못했습니다.'))
      })
      .finally(() => { if (!cancelled) setStatusLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    getAdminPriceMappings()
      .then((response) => { if (!cancelled) setMappings(response) })
      .catch(() => { if (!cancelled) setMappingError('가격 매핑을 불러오지 못했습니다.') })
    return () => { cancelled = true }
  }, [])

  const reviewMapping = async (mappingId, reviewStatus) => {
    setReviewingId(mappingId)
    setMappingError('')
    try {
      const updated = await reviewAdminPriceMapping(mappingId, reviewStatus)
      setMappings((items) => items.map((item) => item.mappingId === mappingId ? updated : item))
    } catch (requestError) {
      setMappingError(getErrorMessage(requestError, '가격 매핑 검토에 실패했습니다.'))
    } finally {
      setReviewingId(null)
    }
  }

  useEffect(() => {
    // 수집 통계와 독립적으로 예측 순위를 요청하고 첫 번째 품목을 기본 선택합니다.
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
    // 선택 시계열이 바뀔 때에만 해당 품목의 실제 가격 이력을 다시 요청합니다.
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
    // 새 품목의 응답을 기다리는 동안 직전 품목 차트를 숨겨 데이터 혼동을 방지합니다.
    setChartLoading(true)
    setChartError('')
    setChart(null)
    setSelectedSeriesId(seriesId)
  }

  return (
    <section className="admin-price-panel" aria-labelledby="admin-price-title">
      <div className="operations-heading">
        <div><p>PRICE OPERATIONS</p><h2 id="admin-price-title">가격 데이터 조회</h2></div>
        <button type="button" onClick={refreshAll} disabled={loading || statusLoading}>새로고침</button>
      </div>

      <section className="price-collection-section" aria-labelledby="price-collection-title">
        {/* 기존 가격 테이블의 현재 상태를 보여 주는 영역이며 AI 예측 성공 여부와 무관하게 표시됩니다. */}
        <div className="price-section-title">
          <div><span>COLLECTION STATUS</span><h3 id="price-collection-title">가격 수집 현황</h3></div>
          {dataStatus && <b className={`collection-status ${dataStatus.status.toLowerCase()}`}>{statusLabels[dataStatus.status] ?? dataStatus.status}</b>}
        </div>
        {statusLoading && <div className="admin-state compact"><span className="admin-spinner" />수집 통계를 집계하고 있습니다.</div>}
        {!statusLoading && statusError && <div className="admin-state compact error"><strong>수집 현황을 표시할 수 없습니다.</strong><p>{statusError}</p><button type="button" onClick={loadDataStatus}>다시 시도</button></div>}
        {!statusLoading && dataStatus && <>
          {/* 운영자가 수집 규모와 최신성을 먼저 판단할 수 있도록 핵심 값을 요약 카드에 배치합니다. */}
          <div className="price-collection-summary">
            <article><span>전체 저장 건수</span><strong>{formatCount(dataStatus.totalPriceCount)}<small>건</small></strong><p>{formatCount(dataStatus.totalSeriesCount)}개 시계열</p></article>
            <article><span>최신 가격 기준일</span><strong className="collection-date">{dataStatus.latestPriceDate ?? '-'}</strong><p>해당 일자 {formatCount(dataStatus.latestDatePriceCount)}건</p></article>
            <article><span>자동 수집 대상</span><strong>{formatCount(dataStatus.activeCollectionTargetCount)}<small>개</small></strong><p>KAMIS 활성 시계열</p></article>
            <article><span>최근 DB 저장 시각</span><strong className="collection-date">{formatDateTime(dataStatus.latestCollectedAt)}</strong><p>{dataStatus.staleAfterDays}일 이상 미갱신 시 점검</p></article>
          </div>
          <div className="price-source-table-wrap">
            {/* 출처별 행 수를 표시해 특정 공급처의 데이터만 누락된 상황도 확인할 수 있습니다. */}
            <table className="price-source-table">
              <thead><tr><th>수집 출처</th><th>시계열</th><th>저장 건수</th><th>최신 기준일</th><th>최근 저장 시각</th></tr></thead>
              <tbody>
                {dataStatus.sources.length === 0
                  ? <tr><td colSpan="5" className="empty">등록된 가격 출처가 없습니다.</td></tr>
                  : dataStatus.sources.map((source) => <tr key={source.sourceName}><td><strong>{source.sourceName}</strong></td><td>{formatCount(source.seriesCount)}개</td><td>{formatCount(source.priceCount)}건</td><td>{source.latestPriceDate ?? '-'}</td><td>{formatDateTime(source.latestCollectedAt)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>}
      </section>

      <section className="price-mapping-section" aria-labelledby="price-mapping-title">
        <div className="price-section-title">
          <div><span>INGREDIENT MAPPING</span><h3 id="price-mapping-title">식재료 가격 매핑 검토</h3></div>
          <b>{formatCount(mappings.filter((item) => item.reviewStatus === 'PROPOSED').length)}건 검토 대기</b>
        </div>
        {mappingError && <p className="admin-inline-error">{mappingError}</p>}
        <div className="price-source-table-wrap">
          <table className="price-source-table price-mapping-table">
            <thead><tr><th>MealFit 식재료</th><th>KAMIS 기준</th><th>유형</th><th>신뢰도</th><th>상태</th><th>검토</th></tr></thead>
            <tbody>{mappings.length === 0
              ? <tr><td colSpan="6" className="empty">등록된 가격 매핑이 없습니다.</td></tr>
              : mappings.map((mapping) => <tr key={mapping.mappingId}>
                <td><strong>{mapping.ingredientName}</strong><br /><small>{mapping.ingredientCode}</small></td>
                <td>{mapping.variety} · {mapping.grade}<br /><small>series {mapping.seriesId}</small></td>
                <td>{mapping.mappingType}</td><td>{Math.round(Number(mapping.confidenceScore) * 100)}%</td><td>{mapping.reviewStatus}</td>
                <td className="mapping-actions"><button type="button" disabled={reviewingId === mapping.mappingId} onClick={() => reviewMapping(mapping.mappingId, 'APPROVED')}>승인</button><button type="button" className="reject" disabled={reviewingId === mapping.mappingId} onClick={() => reviewMapping(mapping.mappingId, 'REJECTED')}>거절</button></td>
              </tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="price-section-title prediction-title"><div><span>PREDICTION STATUS</span><h3>주간 가격 예측</h3></div></div>
      {/* 아래 영역은 AI 예측 API를 사용하므로 수집 현황과 별도의 로딩·오류 화면을 가집니다. */}
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
