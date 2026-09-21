import { Link } from 'react-router-dom'

/** 라우트와 전체 화면 흐름을 먼저 검증할 수 있게 제공하는 준비 중 안내 화면입니다. */
export default function FeatureComingSoonPage({ eyebrow, title, description }) {
  return (
    <main className="coming-soon-page">
      <Link className="coming-soon-logo" to="/">MEAL<span>FIT</span></Link>
      <section>
        <p className="eyebrow">{eyebrow}</p>
        <span className="coming-soon-badge">화면 준비 중</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="coming-soon-actions">
          <Link to="/">서비스 홈</Link>
          <Link to="/home">내 대시보드</Link>
        </div>
      </section>
    </main>
  )
}
