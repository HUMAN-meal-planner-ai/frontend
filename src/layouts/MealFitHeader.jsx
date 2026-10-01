import { Link, NavLink } from 'react-router-dom'

const navigationItems = [
  { label: '메뉴 검색', to: '/menus' },
  { label: '식단 관리', to: '/meal-plans' },
  { label: '가격 예측', to: '/prices' },
  { label: '원가 · 예산', to: '/budget' },
]

export default function MealFitHeader() {
  return (
    <header className="landing-header mealfit-header">
      <Link className="landing-logo" to="/" aria-label="MealFit 홈">
        <span className="logo-leaf" aria-hidden="true">◆</span>
        MEAL<span>FIT</span>
      </Link>

      <nav className="landing-nav" aria-label="주요 화면">
        {navigationItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="landing-auth-actions">
        <Link className="header-dashboard-link" to="/my-page">
          마이페이지
        </Link>
      </div>
    </header>
  )
}