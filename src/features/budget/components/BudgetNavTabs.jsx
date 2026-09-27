export default function BudgetNavTabs({ activeTab, onTabChange }) {
  return (
    <nav className="budget-nav-tabs" aria-label="분석 모드 전환">
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => onTabChange('overview')}
      >
        📊 메뉴별 원가 현황
      </button>
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'comparison' ? 'active' : ''}`}
        onClick={() => onTabChange('comparison')}
      >
        ⚖️ 현재 vs 미래 변동 비교
      </button>
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'driver' ? 'active' : ''}`}
        onClick={() => onTabChange('driver')}
      >
        🔥 원가 상승 & 위험도 진단
      </button>
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}
        onClick={() => onTabChange('schedule')}
      >
        📅 2주간 식단 & 월간 시뮬레이션
      </button>
    </nav>
  );
}
