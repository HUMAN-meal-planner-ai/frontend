import { useEffect } from 'react'
import './BudgetRiskToast.css'

const AUTO_CLOSE_MS = 12000

const LEVEL_LABELS = {
  WARNING: '예산 초과 위험',
  CAUTION: '예산 주의',
}

/**
 * 로그인 직후 예산 재평가에서 위험이 감지되면 화면 우측 상단에 띄우는 토스트입니다.
 * 카드를 누르면 onOpen으로 주간 식단 화면 이동을 맡기고, X 버튼이나 시간 경과로 닫힙니다.
 */
function BudgetRiskToast({ toast, onOpen, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onClose, AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const exceeded = Number(toast.exceededAmount)
  const levelClass = toast.riskLevel === 'WARNING' ? 'is-warning' : 'is-caution'

  return (
    <div className={`risk-toast ${levelClass}`} role="status" aria-live="polite">
      <button type="button" className="risk-toast-body" onClick={onOpen}>
        <strong className="risk-toast-title">{LEVEL_LABELS[toast.riskLevel] || '예산 알림'}</strong>
        <span className="risk-toast-message">
          {toast.warningMessage || '이번 주 식단의 예산 위험이 감지되었습니다.'}
        </span>
        {exceeded > 0 && (
          <span className="risk-toast-amount">예상 초과 {exceeded.toLocaleString()}원</span>
        )}
        <span className="risk-toast-link">주간 식단 확인하기 →</span>
      </button>
      <button type="button" className="risk-toast-close" onClick={onClose} aria-label="알림 닫기">×</button>
    </div>
  )
}

export default BudgetRiskToast
