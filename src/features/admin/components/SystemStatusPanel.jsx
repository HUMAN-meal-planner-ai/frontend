import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAdminSystemStatus } from '../api/adminApi'

const statusLabels = { UP: '정상', DEGRADED: '일부 장애', DOWN: '오류' }

function formatCheckedAt(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(value))
}

/** ADMIN-005 요구사항에 맞춰 핵심 연동 서비스 상태와 응답 시간을 표시합니다. */
export default function SystemStatusPanel() {
  // statusData에는 전체 상태, 확인 시각, 서비스별 상태 배열이 저장됩니다.
  // loading과 error를 분리해 최초 확인·재확인·실패 화면이 겹치지 않도록 합니다.
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    // 새로고침 버튼으로 실행하는 명시적 재조회입니다. 이전 오류 문구를 먼저 제거합니다.
    setLoading(true)
    setError('')
    try {
      setStatusData(await getAdminSystemStatus())
    } catch (requestError) {
      setError(requestError.response?.data?.message || '시스템 상태를 확인하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 최초 조회는 응답이 돌아온 뒤에만 상태를 변경하고, 화면을 떠난 뒤의 응답은 무시합니다.
    let cancelled = false
    getAdminSystemStatus()
      .then((data) => { if (!cancelled) setStatusData(data) })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || '시스템 상태를 확인하지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const healthyCount = useMemo(
    // 전체 서비스 수와 정상 서비스 수를 함께 보여주기 위한 화면용 집계입니다.
    () => statusData?.services?.filter((service) => service.status === 'UP').length || 0,
    [statusData],
  )

  // 데이터가 준비되기 전에는 빈 카드 대신 명확한 로딩 또는 재시도 화면을 표시합니다.
  if (loading) return <div className="admin-state"><span className="admin-spinner" />시스템 상태를 확인하고 있습니다.</div>
  if (error) return <div className="admin-state error"><strong>상태를 확인할 수 없습니다.</strong><p>{error}</p><button type="button" onClick={loadStatus}>다시 확인</button></div>

  return (
    <section className="admin-operations-panel" aria-labelledby="system-status-title">
      <div className="operations-heading">
        <div><p>SERVICE HEALTH</p><h2 id="system-status-title">시스템 상태</h2></div>
        <button type="button" onClick={loadStatus}>상태 새로고침</button>
      </div>
      <div className={`overall-status ${statusData?.overallStatus?.toLowerCase()}`}>
        {/* 한 서비스라도 DOWN이면 백엔드가 전체 상태를 DEGRADED로 계산해 주의 색상으로 표시합니다. */}
        <div><span>전체 상태</span><strong>{statusLabels[statusData?.overallStatus] || statusData?.overallStatus}</strong></div>
        <p>{healthyCount}/{statusData?.services?.length || 0}개 서비스 정상 · {formatCheckedAt(statusData?.checkedAt)} 확인</p>
      </div>
      <div className="service-status-grid">
        {/* 서비스 key는 React 목록 식별자이자 backend/database/kamis/ai를 구분하는 고정 코드입니다. */}
        {statusData?.services?.map((service) => (
          <article key={service.key} className={service.status.toLowerCase()}>
            <div className="service-status-head"><span>{service.name}</span><b><i />{statusLabels[service.status] || service.status}</b></div>
            <p>{service.message}</p>
            <small>응답 시간 {service.responseTimeMs.toLocaleString()}ms</small>
          </article>
        ))}
      </div>
    </section>
  )
}
