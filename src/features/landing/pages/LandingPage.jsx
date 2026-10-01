import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { getYearOverYearBargains } from '../api/landingApi'

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

const produceAccents = ['leaf', 'green', 'sand', 'rose']
const formatPrice = (value) => `${new Intl.NumberFormat('ko-KR').format(Number(value))}원`
const formatDate = (value) => value ? value.replaceAll('-', '.') : '-'

/** 공개 첫 화면입니다. 인증 화면과 분리하고 주요 기능 진입점을 한곳에 모았습니다. */
export default function LandingPage({ user, onLogout }) {
  const accountPage = user?.role === 'ADMIN' ? '/admin' : user?.role === 'MANAGER' ? '/manager' : '/my-page'
  const accountLabel = user?.role === 'ADMIN' ? '관리자 페이지' : user?.role === 'MANAGER' ? '시설 관리' : '마이페이지'
  const [marketData, setMarketData] = useState({ asOfDate: null, comparisonDate: null, items: [] })
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketError, setMarketError] = useState('')

  useEffect(() => {
    let active = true
    getYearOverYearBargains()
      .then((data) => {
        if (active) setMarketData(data)
      })
      .catch(() => {
        if (active) setMarketError('가격 비교 데이터를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setMarketLoading(false)
      })
    return () => { active = false }
  }, [])

  const valueProduceItems = useMemo(() => marketData.items || [], [marketData.items])
  const maximumSavingRate = useMemo(
    () => valueProduceItems.reduce((maximum, item) => Math.max(maximum, Number(item.savingRatePercent)), 0),
    [valueProduceItems],
  )

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
          {/* 로그인 상태에서는 계정 페이지/로그아웃, 비로그인 상태에서는 로그인 버튼을 표시합니다. */}
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


      <section className="market-section" id="market-prices">
        <div className="market-heading">
          <div>
            <p className="landing-kicker"><span /> DAILY MARKET PICKS</p>
            <h2>오늘 더 알뜰한<br />식재료를 확인하세요.</h2>
          </div>
          <div className="market-intro">
            <span className="market-source-badge">KAMIS 가격정보 기반</span>
            <p>전년도 같은 시기의 가격과 비교해 상대적으로 저렴한 품목을 먼저 보여드려요.</p>
            <small>{formatDate(marketData.asOfDate)} 기준 · 전년 비교일 {formatDate(marketData.comparisonDate)}</small>
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
              <strong>{maximumSavingRate}%↓</strong>
            </div>
          </article>

          <div className="produce-grid" aria-label="전년 대비 저렴한 농산물">
            {marketLoading && <p className="form-message" role="status">가격 비교 데이터를 불러오고 있습니다.</p>}
            {!marketLoading && marketError && <p className="form-message error-message" role="alert">{marketError}</p>}
            {!marketLoading && !marketError && valueProduceItems.length === 0 && (
              <p className="form-message">전년과 비교할 수 있는 가격 데이터가 아직 없습니다.</p>
            )}
            {valueProduceItems.map((item, index) => (
              <article className="produce-card" key={item.seriesId}>
                <div className={`produce-visual ${produceAccents[index % produceAccents.length]}`} aria-hidden="true">
                  <span>{item.ingredientName}</span>
                  <i>{String(index + 1).padStart(2, '0')}</i>
                </div>
                <div className="produce-card-body">
                  <div className="produce-card-head">
                    <div><small>{item.category}</small><h3>{item.ingredientName}</h3></div>
                    <span className="saving-badge">전년 대비 {item.savingRatePercent}%↓</span>
                  </div>
                  <div className="produce-price-row">
                    <div><small>최근 가격</small><strong>{formatPrice(item.currentPrice)}</strong><span>/ {item.unit}</span></div>
                    <div><small>전년도 가격</small><del>{formatPrice(item.previousYearPrice)}</del></div>
                  </div>
                  <div className="saving-meter" aria-label={`전년 대비 ${item.savingRatePercent}% 저렴`}>
                    <i style={{ width: `${Math.min(Number(item.savingRatePercent), 100)}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="market-note">
          <span>가격 비교 안내</span>
          <p>DB에 저장된 KAMIS 가격 중 가장 최근 기준일과 전년도 비교일의 동일 품목·품종·등급·시장 가격을 비교합니다.</p>
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
