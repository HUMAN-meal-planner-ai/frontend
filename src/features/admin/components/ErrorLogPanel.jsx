import { useCallback, useEffect, useState } from 'react'
import { getAdminErrorLog, getAdminErrorLogs, resolveAdminErrorLog } from '../api/adminApi'

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(value))
}

/** ADMIN-006 요구사항의 오류 목록, 상세 원인, 처리 완료 흐름을 한 화면에 제공합니다. */
export default function ErrorLogPanel() {
  // OPEN은 resolved=false, RESOLVED는 true, ALL은 파라미터를 생략하도록 API 호출 조건을 관리합니다.
  const [filter, setFilter] = useState('OPEN')
  // Spring Data의 페이지 번호는 0부터 시작하므로 첫 화면 값을 0으로 설정합니다.
  const [page, setPage] = useState(0)
  // logs에는 Page 응답, selectedLog에는 스택 트레이스를 포함한 단건 상세 응답이 들어갑니다.
  const [logs, setLogs] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)

  const loadLogs = useCallback(async () => {
    // 새로고침 및 처리 완료 후 현재 필터·페이지를 유지한 채 목록을 다시 동기화합니다.
    setLoading(true)
    setError('')
    try {
      const resolved = filter === 'ALL' ? undefined : filter === 'RESOLVED'
      setLogs(await getAdminErrorLogs({ resolved, page, size: 20 }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || '오류 로그를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    // 필터나 페이지가 바뀌면 해당 조건의 목록을 요청하며, 이전 화면의 늦은 응답은 반영하지 않습니다.
    let cancelled = false
    const resolved = filter === 'ALL' ? undefined : filter === 'RESOLVED'
    getAdminErrorLogs({ resolved, page, size: 20 })
      .then((data) => { if (!cancelled) setLogs(data) })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || '오류 로그를 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filter, page])

  const changeFilter = (nextFilter) => {
    // 필터가 바뀌면 새 조건에서 존재하지 않을 수 있는 기존 페이지와 상세 선택을 초기화합니다.
    setLoading(true)
    setError('')
    setFilter(nextFilter)
    setPage(0)
    setSelectedLog(null)
  }

  const changePage = (nextPage) => {
    // 페이지 전환 중 이전 목록을 그대로 조작하지 못하도록 로딩 상태를 먼저 활성화합니다.
    setLoading(true)
    setError('')
    setPage(nextPage)
    setSelectedLog(null)
  }

  const openDetail = async (logId) => {
    // 목록 응답은 가벼운 조회를 위해 stackTrace를 제외하므로 선택 시 상세 API를 별도로 호출합니다.
    setDetailLoading(true)
    try {
      setSelectedLog(await getAdminErrorLog(logId))
    } catch (requestError) {
      setError(requestError.response?.data?.message || '오류 상세 정보를 불러오지 못했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const resolveSelectedLog = async () => {
    // 처리 완료 응답을 대화상자에 즉시 반영한 뒤 목록도 다시 조회해 필터 결과를 맞춥니다.
    if (!selectedLog) return
    setResolving(true)
    try {
      const updated = await resolveAdminErrorLog(selectedLog.id)
      setSelectedLog(updated)
      await loadLogs()
    } catch (requestError) {
      setError(requestError.response?.data?.message || '오류 로그를 처리 완료로 변경하지 못했습니다.')
    } finally {
      setResolving(false)
    }
  }

  return (
    <section className="admin-operations-panel" aria-labelledby="error-log-title">
      <div className="operations-heading">
        <div><p>ERROR MONITORING</p><h2 id="error-log-title">시스템 오류 로그</h2></div>
        <button type="button" onClick={loadLogs}>목록 새로고침</button>
      </div>
      <div className="log-filter" role="group" aria-label="오류 로그 처리 상태">
        {/* 미처리 로그를 기본값으로 두어 관리자가 조치가 필요한 항목을 먼저 확인하게 합니다. */}
        {[['OPEN', '미처리'], ['RESOLVED', '처리 완료'], ['ALL', '전체']].map(([value, label]) => (
          <button key={value} className={filter === value ? 'active' : ''} type="button" onClick={() => changeFilter(value)}>{label}</button>
        ))}
      </div>
      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {loading ? <div className="admin-state"><span className="admin-spinner" />오류 로그를 불러오고 있습니다.</div> : (
        <div className="error-log-table-wrap">
          <table className="error-log-table">
            <thead><tr><th>발생 시각</th><th>상태</th><th>오류 코드</th><th>요청</th><th>사용자</th><th>처리</th></tr></thead>
            <tbody>
              {logs?.content?.map((log) => (
                // 마우스 클릭뿐 아니라 Enter 키로도 상세 창을 열 수 있게 해 키보드 접근성을 유지합니다.
                <tr key={log.id} onClick={() => openDetail(log.id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter') openDetail(log.id) }}>
                  <td>{formatDateTime(log.occurredAt)}</td><td><b className="http-status">{log.httpStatus}</b></td>
                  <td><strong>{log.errorCode}</strong><small>{log.errorMessage || log.exceptionClass}</small></td>
                  <td><code>{log.requestMethod} {log.requestPath}</code></td><td>{log.userEmail || '비로그인 요청'}</td>
                  <td><span className={`log-resolution ${log.resolved ? 'resolved' : 'open'}`}>{log.resolved ? '처리 완료' : '미처리'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs?.content?.length && <div className="admin-state"><strong>표시할 오류 로그가 없습니다.</strong><p>현재 선택한 처리 상태에 해당하는 기록이 없습니다.</p></div>}
        </div>
      )}
      <div className="log-pagination">
        <button type="button" disabled={page === 0 || loading} onClick={() => changePage(page - 1)}>이전</button>
        <span>{(logs?.number || 0) + 1} / {Math.max(logs?.totalPages || 1, 1)} 페이지</span>
        <button type="button" disabled={loading || logs?.last !== false} onClick={() => changePage(page + 1)}>다음</button>
      </div>

      {(selectedLog || detailLoading) && (
        /* 배경 영역을 클릭하면 닫고, 대화상자 내부 클릭은 닫기 동작으로 처리하지 않습니다. */
        <div className="log-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLog(null) }}>
          <section className="log-detail" role="dialog" aria-modal="true" aria-labelledby="log-detail-title">
            {detailLoading && !selectedLog ? <div className="admin-state"><span className="admin-spinner" />상세 정보를 불러오고 있습니다.</div> : selectedLog && <>
              <header><div><p>ERROR #{selectedLog.id}</p><h3 id="log-detail-title">{selectedLog.errorCode}</h3></div><button type="button" onClick={() => setSelectedLog(null)} aria-label="상세 닫기">×</button></header>
              <dl><div><dt>발생 시각</dt><dd>{formatDateTime(selectedLog.occurredAt)}</dd></div><div><dt>HTTP 상태</dt><dd>{selectedLog.httpStatus}</dd></div><div><dt>요청</dt><dd>{selectedLog.requestMethod} {selectedLog.requestPath}</dd></div><div><dt>사용자</dt><dd>{selectedLog.userEmail || '비로그인 요청'}</dd></div><div className="wide"><dt>오류 메시지</dt><dd>{selectedLog.errorMessage || '-'}</dd></div></dl>
              <div className="stack-trace"><span>Stack trace</span><pre>{selectedLog.stackTrace || '저장된 스택 트레이스가 없습니다.'}</pre></div>
              <footer><span className={`log-resolution ${selectedLog.resolved ? 'resolved' : 'open'}`}>{selectedLog.resolved ? '처리 완료' : '미처리'}</span>{!selectedLog.resolved && <button type="button" disabled={resolving} onClick={resolveSelectedLog}>{resolving ? '처리 중...' : '처리 완료로 변경'}</button>}</footer>
            </>}
          </section>
        </div>
      )}
    </section>
  )
}
