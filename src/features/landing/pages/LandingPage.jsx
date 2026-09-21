import { Link, NavLink } from 'react-router-dom'

/**
 * 첫 화면 상단 메뉴 설정입니다.
 * 메뉴 이름은 label, 이동 주소는 to를 수정하면 됩니다.
 * 새 화면을 추가할 때는 App.jsx의 <Routes>에도 같은 주소의 Route를 등록해야 합니다.
 */
const navigationItems = [
  { label: '메뉴 검색', to: '/menus' },
  { label: '식단 관리', to: '/meal-plans' },
  { label: '가격 예측', to: '/prices' },
  { label: '원가·예산', to: '/budget' },
]

/**
 * 첫 화면 아래쪽 기능 카드 설정입니다.
 * 카드 문구와 이동 주소를 바꿀 때 이 배열만 수정하면 화면에 자동으로 반영됩니다.
 */
const serviceCards = [
  {
    number: '01',
    title: '메뉴와 식재료 검색',
    description: '메뉴 분류와 구성 식재료를 빠르게 확인하고 식단 편성에 활용합니다.',
    to: '/menus',
    tone: 'mint',
  },
  {
    number: '02',
    title: '주간 식단 관리',
    description: '시설별 식수와 슬롯을 기준으로 주간 식단을 구성하고 변경합니다.',
    to: '/meal-plans',
    tone: 'lime',
  },
  {
    number: '03',
    title: '가격 흐름과 위험 예측',
    description: '식재료 가격 변화와 향후 7일 예측을 확인해 위험 품목을 먼저 찾습니다.',
    to: '/prices',
    tone: 'amber',
  },
  {
    number: '04',
    title: '원가와 예산 분석',
    description: '메뉴별 원가와 예상 총비용을 계산하고 목표 예산과 비교합니다.',
    to: '/budget',
    tone: 'sage',
  },
]

/** 공개 첫 화면입니다. 인증 화면과 분리하고 주요 기능 진입점을 한곳에 모았습니다. */
export default function LandingPage({ user, onLogout }) {
  return (
    <main className="landing-page">
      {/* 서비스 로고, 화면 이동 메뉴, 로그인 상태별 버튼을 표시하는 상단 영역입니다. */}
      <header className="landing-header">
        <Link className="landing-logo" to="/" aria-label="MealFit 홈">
          <span className="logo-leaf" aria-hidden="true">◆</span>
          MEAL<span>FIT</span>
        </Link>

        <nav className="landing-nav" aria-label="주요 화면">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
        </nav>

        <div className="landing-auth-actions">
          {/* 로그인 상태에서는 대시보드/로그아웃, 비로그인 상태에서는 로그인 버튼을 표시합니다. */}
          {user ? (
            <>
              <Link className="header-dashboard-link" to="/home">내 대시보드</Link>
              <button className="header-login-button secondary" type="button" onClick={onLogout}>로그아웃</button>
            </>
          ) : (
            <Link className="header-login-button" to="/login">로그인</Link>
          )}
        </div>
      </header>

      {/* 서비스의 핵심 가치와 분석 결과 예시를 보여주는 첫 화면 대표 영역입니다. */}
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="landing-kicker"><span /> DATA-DRIVEN MEAL PLANNING</p>
          <h1>가격 변화보다<br /><em>한 끼 먼저</em> 준비하세요.</h1>
          <p className="hero-description">
            식재료 가격을 예측하고, 식단 원가와 예산 위험을 미리 확인하세요.<br />
            MealFit이 안정적인 급식 운영의 시작을 함께합니다.
          </p>
          <div className="hero-actions">
            <Link className="hero-primary-button" to={user ? '/home' : '/login'}>
              {user ? '대시보드로 이동' : 'MealFit 시작하기'} <span>→</span>
            </Link>
            <a className="hero-text-link" href="#services">기능 둘러보기</a>
          </div>
          <div className="hero-trust-list" aria-label="MealFit 주요 특징">
            <span>✓ 7일 가격 예측</span>
            <span>✓ 메뉴별 원가 계산</span>
            <span>✓ 예산 위험 사전 확인</span>
          </div>
        </div>

        <div className="hero-preview" aria-label="MealFit 분석 화면 예시">
          <div className="preview-orbit orbit-one" />
          <div className="preview-orbit orbit-two" />
          <article className="preview-card preview-main-card">
            <div className="preview-card-head">
              <div><span>이번 주 예상 식재료비</span><strong>2,600,000원</strong></div>
              <span className="preview-status">예산 내 운영</span>
            </div>
            <div className="preview-chart">
              <span className="chart-label label-top">예측</span>
              <svg viewBox="0 0 500 180" role="img" aria-label="가격 예측 상승 곡선">
                <defs>
                  <linearGradient id="landingChartArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58bd82" stopOpacity=".34" />
                    <stop offset="100%" stopColor="#58bd82" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M10 140 C65 138 92 104 140 116 C193 128 218 82 268 89 C318 97 354 47 404 61 C442 71 461 39 490 34 L490 175 L10 175 Z" fill="url(#landingChartArea)" />
                <path d="M10 140 C65 138 92 104 140 116 C193 128 218 82 268 89 C318 97 354 47 404 61 C442 71 461 39 490 34" fill="none" stroke="#32a766" strokeWidth="5" strokeLinecap="round" />
                <circle cx="404" cy="61" r="7" fill="#fff" stroke="#32a766" strokeWidth="4" />
              </svg>
              <div className="chart-days"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span></div>
            </div>
          </article>
          <article className="preview-card preview-risk-card"><span>가격 상승 품목</span><strong>3개</strong><small>양파 · 대파 · 감자</small></article>
          <article className="preview-card preview-budget-card"><span>예산 사용률</span><strong>78%</strong><div><i /></div></article>
        </div>
      </section>

      {/* 위의 serviceCards 배열을 사용해 기능별 바로가기 카드를 생성합니다. */}
      <section className="service-section" id="services">
        <div className="section-heading">
          <div><p className="landing-kicker"><span /> MEALFIT SERVICES</p><h2>필요한 업무 화면으로 바로 이동하세요.</h2></div>
          <p>로그인이 필요한 기능은 안전하게 로그인 화면을 거쳐 이동합니다.</p>
        </div>
        <div className="service-grid">
          {serviceCards.map((card) => (
            <Link className={`service-card ${card.tone}`} key={card.to} to={card.to}>
              <span className="service-number">{card.number}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <strong>화면으로 이동 <span>→</span></strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
