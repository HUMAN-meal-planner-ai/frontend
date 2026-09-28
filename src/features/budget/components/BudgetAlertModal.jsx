import React from 'react';

/**
 * [AUTO-002] 예산 초과 위험 및 자동 재평가 알림 모달/드로어
 */
export default function BudgetAlertModal({
  isOpen,
  onClose,
  alertList = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteAlert,
  onTriggerReevaluation,
  isReevaluating = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div
        className="budget-modal-card alert-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="alert-modal-title"
      >
        <div className="budget-modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🔔</span>
            <div>
              <h3 id="alert-modal-title">예산 및 식단 위험 알림함</h3>
              <p className="modal-sub-desc">
                주간 원가 변동 및 예산 초과 위험 시 실시간으로 발행된 자동화 알림 목록입니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="alert-modal-action-bar">
          <div className="alert-count-tag">
            미확인 알림 <strong>{unreadCount}</strong>건 (총 {alertList.length}건)
          </div>
          <div className="alert-action-buttons">
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                type="button"
                className="action-pill-btn secondary btn-sm"
                onClick={onMarkAllAsRead}
              >
                ✓ 모두 읽음 처리
              </button>
            )}
            {onTriggerReevaluation && (
              <button
                type="button"
                className="action-pill-btn secondary btn-sm"
                onClick={onTriggerReevaluation}
                disabled={isReevaluating}
              >
                {isReevaluating ? '재평가 중...' : '🔄 실시간 재평가'}
              </button>
            )}
          </div>
        </div>

        <div className="alert-items-scrollable">
          {alertList.length === 0 ? (
            <div className="alert-empty-box">
              <span className="empty-icon">🌱</span>
              <p>발행된 예산 알림이 없습니다. 현재 모든 식단이 안정적으로 운영 중입니다.</p>
            </div>
          ) : (
            alertList.map((alert) => {
              const isWarning = alert.alertLevel === 'WARNING' || alert.riskLevel === 'WARNING';
              const isCaution = alert.alertLevel === 'CAUTION' || alert.riskLevel === 'CAUTION';
              const levelClass = isWarning ? 'warning' : isCaution ? 'caution' : 'safe';

              return (
                <div
                  key={alert.alertId}
                  className={`alert-item-card ${levelClass} ${alert.isRead ? 'read' : 'unread'}`}
                >
                  <div className="alert-item-top">
                    <span className={`alert-level-badge ${levelClass}`}>
                      {isWarning ? '🚨 위험' : isCaution ? '⚠️ 주의' : 'ℹ️ 알림'}
                    </span>
                    <strong className="alert-item-title">{alert.title || alert.alertTitle || '예산 위험 알림'}</strong>
                    <span className="alert-item-time">{alert.createdAt ? alert.createdAt.slice(0, 16).replace('T', ' ') : ''}</span>
                  </div>

                  <p className="alert-item-message">{alert.message || alert.alertMessage || alert.warningMessage}</p>

                  <div className="alert-item-bottom">
                    <span className="alert-facility-tag">시설 #{alert.facilityId}</span>
                    <div className="alert-item-actions">
                      {!alert.isRead && onMarkAsRead && (
                        <button
                          type="button"
                          className="alert-btn-action read-btn"
                          onClick={() => onMarkAsRead(alert.alertId)}
                        >
                          읽음
                        </button>
                      )}
                      {onDeleteAlert && (
                        <button
                          type="button"
                          className="alert-btn-action delete-btn"
                          onClick={() => onDeleteAlert(alert.alertId)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="budget-modal-footer">
          <button type="button" className="action-pill-btn secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
