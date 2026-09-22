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

/**
 * KAMIS 당일 가격 API가 연결되기 전 화면 구성을 확인하기 위한 예시 데이터입니다.
 * 추후 API 연동 시 이 배열을 서버 응답값으로 교체하면 카드 UI를 그대로 사용할 수 있습니다.
 */
const valueProduceItems = [
  { name: '애호박', category: '채소류', unit: '1개', currentPrice: '1,480원', lastYearPrice: '2,120원', savingRate: 30, accent: 'leaf', mark: '호박' },
  { name: '대파', category: '채소류', unit: '1kg', currentPrice: '2,960원', lastYearPrice: '3,740원', savingRate: 21, accent: 'green', mark: '대파' },
  { name: '감자', category: '식량작물', unit: '1kg', currentPrice: '2,380원', lastYearPrice: '2,920원', savingRate: 18, accent: 'sand', mark: '감자' },
  { name: '사과', category: '과일류', unit: '10개', currentPrice: '19,800원', lastYearPrice: '22,400원', savingRate: 12, accent: 'rose', mark: '사과' },
]

/** 공개 첫 화면입니다. 인증 화면과 분리하고 주요 기능 진입점을 한곳에 모았습니다. */
export default function LandingPage({ user, onLogout }) {
  const accountPage = user?.role === 'ADMIN' ? '/admin' : user?.role === 'MANAGER' ? '/manager' : '/home'
  const accountLabel = user?.role === 'ADMIN' ? '관리자 페이지' : user?.role === 'MANAGER' ? '시설 관리' : '내 대시보드'

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
              <Link className="header-dashboard-link" to={accountPage}>{accountLabel}</Link>
              <button className="header-login-button secondary" type="button" onClick={onLogout}>로그아웃</button>
            </>
          ) : (
            <Link className="header-login-button" to="/login">로그인</Link>
          )}
        </div>
      </header>


      {/*
        KAMIS 당일 가격 API가 연결될 위치를 미리 구성한 정적 화면입니다.
        현재 숫자는 디자인 확인용 예시이며 실제 시세로 사용하지 않습니다.
      */}
      <section className="market-section" id="market-prices">
        <div className="market-heading">
          <div>
            <p className="landing-kicker"><span /> DAILY MARKET PICKS</p>
            <h2>오늘 더 알뜰한<br />식재료를 확인하세요.</h2>
          </div>
          <div className="market-intro">
            <span className="market-source-badge">KAMIS 가격정보 기반</span>
            <p>전년도 같은 시기의 가격과 비교해 상대적으로 저렴한 품목을 먼저 보여드려요.</p>
            <small>2026.09.21 기준 · 현재는 화면 확인용 예시 데이터입니다.</small>
          </div>
        </div>

        <div className="market-content">
          <article className="market-summary-card">
            <div className="market-summary-top">
              <span>오늘의 장보기 힌트</span>
              <span className="market-live-dot"><i /> DAILY</span>
            </div>
            <div className="market-summary-copy">
              <strong>작년보다<br /><em>부담이 낮은</em> 품목</strong>
              <p>가격 비교 결과를 식단 편성 전에 확인하고 예산에 여유를 만들어 보세요.</p>
            </div>
            <div className="market-summary-number">
              <strong>{valueProduceItems.length}</strong>
              <span>개 품목</span>
            </div>
            <div className="market-summary-foot">
              <span>최대 절감률</span>
              <strong>30%↓</strong>
            </div>
          </article>

          <div className="produce-grid" aria-label="전년 대비 저렴한 농산물 예시">
            {valueProduceItems.map((item, index) => (
              <article className="produce-card" key={item.name}>
                <div className={`produce-visual ${item.accent}`} aria-hidden="true">
                  <span>{item.mark}</span>
                  <i>{String(index + 1).padStart(2, '0')}</i>
                </div>
                <div className="produce-card-body">
                  <div className="produce-card-head">
                    <div><small>{item.category}</small><h3>{item.name}</h3></div>
                    <span className="saving-badge">전년 대비 {item.savingRate}%↓</span>
                  </div>
                  <div className="produce-price-row">
                    <div><small>오늘 가격</small><strong>{item.currentPrice}</strong><span>/ {item.unit}</span></div>
                    <div><small>전년도 가격</small><del>{item.lastYearPrice}</del></div>
                  </div>
                  <div className="saving-meter" aria-label={`전년 대비 ${item.savingRate}% 저렴`}>
                    <i style={{ width: `${item.savingRate}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="market-note">
          <span>가격 비교 안내</span>
          <p>품목·등급·시장·단위에 따라 가격이 달라질 수 있습니다. 실제 서비스에서는 KAMIS API의 당일 데이터와 전년도 비교 기준을 함께 표시할 예정입니다.</p>
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
