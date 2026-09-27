import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import api, { clearAuth, getStoredUser, saveAuth } from './api/axios'
import BudgetAnalysisPage from './features/budget/pages/BudgetAnalysisPage'
import AdminPage from './features/admin/pages/AdminPage'
import ManagerPage from './features/manager/pages/ManagerPage'
import MealPlanPage from './features/mealplan/pages/MealPlanPage'
import MenuListPage from './features/menu/pages/MenuListPage'
import LandingPage from './features/landing/pages/LandingPage'
import FeatureComingSoonPage from './components/common/FeatureComingSoonPage'
import './App.css'

/** 서버의 공통 오류 응답을 사용자용 문장으로 변환합니다. 네트워크 단절도 구분해 안내합니다. */
function getErrorMessage(error, fallback) {
  return error.response?.data?.message ||
    (error.request ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' : fallback)
}

/** 관리자 계정은 시설 등록 여부와 관계없이 관리자 화면으로 이동합니다. */
function getDefaultRoute(user) {
  if (user?.role === 'ADMIN') return '/admin'
  if (user?.role === 'MANAGER' && user?.facilityId != null) return '/manager'
  return user?.facilityId == null ? '/setup' : '/home'
}

/** 로그인과 회원가입 화면 왼쪽에 공통으로 표시하는 MealFit 소개 영역입니다. */
function BrandPanel() {
  return (
    <section className="brand-panel" aria-label="MealFit 서비스 소개">
      <div className="brand-logo"><i /><i />MEAL<span>FIT</span></div>
      <div className="brand-copy">
        <p className="eyebrow">SMART MEAL PLANNING</p>
        <h1>가격을 예측하고,<br />더 나은 식단을 준비하세요.</h1>
        <p>식재료 가격 변화부터 예산 위험까지 한눈에 확인하고,<br />안정적인 급식 운영을 시작해 보세요.</p>
      </div>
      <div className="forecast-visual" aria-hidden="true">
        <div className="visual-glow" />
        <div className="visual-card visual-card-main">
          <span>이번 주 예상 식재료비</span><strong>2,600,000원</strong><em>예산 위험 미리 확인</em>
        </div>
        <div className="visual-card visual-card-small"><span>가격 상승 품목</span><strong>3</strong></div>
        <svg className="visual-chart" viewBox="0 0 420 190">
          <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#89d6a8" stopOpacity=".42" /><stop offset="100%" stopColor="#89d6a8" stopOpacity="0" /></linearGradient></defs>
          <path d="M15 150 C75 145 91 112 142 124 C205 139 225 59 282 86 C335 111 351 31 405 45 L405 180 L15 180 Z" fill="url(#chartFill)" />
          <path d="M15 150 C75 145 91 112 142 124 C205 139 225 59 282 86 C335 111 351 31 405 45" fill="none" stroke="#2f9b64" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="brand-footnote">MealFit · 데이터 기반 급식 운영</p>
    </section>
  )
}

/** 인증 화면들이 동일한 2단 레이아웃을 사용하게 하는 공통 틀입니다. */
function AuthLayout({ children }) {
  return <main className="auth-layout"><BrandPanel /><section className="form-panel">{children}</section></main>
}

/**
 * PDF의 S01 첫 화면을 실제 인증 API에 연결합니다.
 * 성공 시 토큰을 저장하고 시설 설정 유무에 따라 설정 화면 또는 사용자 홈으로 이동합니다.
 */
function LoginPage({ onAuthenticated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      // 응답의 accessToken은 이후 보호 API 요청의 Bearer 인증에 사용됩니다.
      const { data } = await api.post('/api/auth/login', form)
      saveAuth(data.accessToken, data.user)
      onAuthenticated(data.user)
      navigate(getDefaultRoute(data.user), { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '로그인에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="form-card">
        <div className="mobile-logo">MEAL<span>FIT</span></div>
        <p className="eyebrow form-eyebrow">WELCOME BACK</p>
        <h2>MealFit에 로그인</h2>
        <p className="form-intro">등록한 이메일과 비밀번호를 입력해 주세요.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">이메일</label>
          <div className="input-wrap"><span className="input-icon">@</span><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" value={form.email} onChange={updateField} required /></div>
          <div className="label-row"><label htmlFor="password">비밀번호</label><span>8자 이상</span></div>
          <div className="input-wrap"><span className="input-icon lock-icon">●</span><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="비밀번호를 입력하세요" value={form.password} onChange={updateField} minLength="8" required /><button className="visibility-button" type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? '숨김' : '보기'}</button></div>
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
        </form>
        <p className="switch-page">아직 계정이 없으신가요?<button type="button" onClick={() => navigate('/signup')}>회원가입</button></p>
        <p className="security-note"><span>✓</span> 비밀번호는 암호화되어 안전하게 보호됩니다.</p>
      </div>
    </AuthLayout>
  )
}

/** 이메일 중복 확인과 회원가입 API를 연결한 가입 화면입니다. */
function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [emailStatus, setEmailStatus] = useState({ checked: false, available: false, message: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'email') setEmailStatus({ checked: false, available: false, message: '' })
    setError('')
  }

  const checkEmail = async () => {
    if (!form.email) return setEmailStatus({ checked: false, available: false, message: '이메일을 먼저 입력해 주세요.' })
    try {
      const { data } = await api.get('/api/auth/email-check', { params: { email: form.email } })
      setEmailStatus({ checked: true, available: data.available, message: data.available ? '사용할 수 있는 이메일입니다.' : '이미 가입된 이메일입니다.' })
    } catch (requestError) {
      setEmailStatus({ checked: false, available: false, message: getErrorMessage(requestError, '중복 확인에 실패했습니다.') })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.passwordConfirm) return setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
    if (!emailStatus.checked || !emailStatus.available) return setError('사용 가능한 이메일인지 중복 확인해 주세요.')
    setLoading(true)
    try {
      await api.post('/api/auth/signup', { name: form.name, email: form.email, password: form.password })
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '회원가입에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="form-card signup-card">
        <p className="eyebrow form-eyebrow">CREATE ACCOUNT</p><h2>MealFit 시작하기</h2><p className="form-intro">급식 운영에 사용할 계정을 만들어 주세요.</p>
        <form onSubmit={handleSubmit} className="auth-form compact-form">
          <label htmlFor="name">이름</label><div className="input-wrap"><input id="name" name="name" value={form.name} onChange={updateField} placeholder="홍길동" maxLength="50" required /></div>
          <label htmlFor="signup-email">이메일</label><div className="inline-input"><div className="input-wrap"><input id="signup-email" name="email" type="email" value={form.email} onChange={updateField} placeholder="name@example.com" maxLength="150" required /></div><button type="button" className="secondary-button" onClick={checkEmail}>중복 확인</button></div>
          {emailStatus.message && <p className={`field-message ${emailStatus.available ? 'success-message' : 'error-text'}`}>{emailStatus.message}</p>}
          <label htmlFor="signup-password">비밀번호</label><div className="input-wrap"><input id="signup-password" name="password" type="password" value={form.password} onChange={updateField} placeholder="8자 이상 입력" minLength="8" maxLength="72" required /></div>
          <label htmlFor="password-confirm">비밀번호 확인</label><div className="input-wrap"><input id="password-confirm" name="passwordConfirm" type="password" value={form.passwordConfirm} onChange={updateField} placeholder="비밀번호 다시 입력" minLength="8" maxLength="72" required /></div>
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? '가입 중...' : '가입하기'}</button>
        </form>
        <p className="switch-page">이미 계정이 있으신가요?<button type="button" onClick={() => navigate('/login')}>로그인</button></p>
      </div>
    </AuthLayout>
  )
}

/** 신규 사용자가 대시보드 계산 기준이 될 시설 정보를 저장하는 최초 설정 화면입니다. */
function FacilitySetupPage({ user, onAuthenticated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', facilityType: 'SCHOOL', address: '', contactName: user?.name || '', defaultMealCount: 100, breakfastMealCount: 0, lunchMealCount: 100, dinnerMealCount: 0, targetFoodCost: 5000 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const updateField = ({ target: { name, value, type } }) => setForm((current) => ({ ...current, [name]: type === 'number' ? Number(value) : value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data: facility } = await api.post('/api/facilities', form)
      const nextUser = { ...user, facilityId: facility.facilityId }
      // 시설 생성 직후 로컬 사용자 정보도 갱신해 새로고침 시 경로 분기가 달라지지 않게 합니다.
      saveAuth(localStorage.getItem('mealfit_access_token'), nextUser)
      onAuthenticated(nextUser)
      navigate(getDefaultRoute(nextUser), { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, '시설 정보를 저장하지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return <main className="setup-page"><section className="setup-card"><div className="step-badge">최초 1회 설정</div><h2>운영 시설을 알려주세요</h2><p>입력한 인원과 목표 금액은 원가 및 예산 계산의 기준으로 사용됩니다.</p><form className="setup-form" onSubmit={handleSubmit}><label>시설명<input name="name" value={form.name} onChange={updateField} placeholder="예: 한빛초등학교" maxLength="100" required /></label><label>시설 유형<select name="facilityType" value={form.facilityType} onChange={updateField}><option value="SCHOOL">학교</option><option value="COMPANY">기업</option><option value="HOSPITAL">병원</option><option value="ETC">기타</option></select></label><label>기본 식수 인원<input name="defaultMealCount" type="number" min="0" value={form.defaultMealCount} onChange={updateField} required /></label><label>1인 목표 식재료비<input name="targetFoodCost" type="number" min="0" value={form.targetFoodCost} onChange={updateField} required /></label>{error && <p className="form-message error-message" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading ? '저장 중...' : '저장하고 시작'}</button></form></section></main>
}

/** 인증과 시설 설정 완료를 확인하는 최소 홈입니다. 실제 대시보드 API가 준비되면 카드만 교체할 수 있습니다. */
function HomePage({ user, onLogout }) {
  return <main className="home-page"><header className="home-header"><strong>MEAL<span>FIT</span></strong><button onClick={onLogout}>로그아웃</button></header><section className="home-content"><p className="eyebrow">OPERATIONS HOME</p><h1>{user?.name}님, 좋은 하루예요.</h1><p>로그인과 시설 연결이 완료되었습니다. 대시보드 데이터가 준비되면 이곳에서 확인할 수 있습니다.</p><div className="home-grid"><article><span>예상 식재료비</span><strong>데이터 준비 중</strong></article><article><span>가격 상승 영향</span><strong>데이터 준비 중</strong></article></div></section></main>
}

/** 토큰 사용자 정보가 없을 때 보호 화면 주소에 직접 접근하지 못하게 합니다. */
function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />
}

/** 화면 주소를 직접 입력해도 ADMIN 권한이 아닌 사용자는 관리자 페이지에 들어갈 수 없게 합니다. */
function AdminRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'ADMIN' ? children : <Navigate to="/home" replace />
}

/** 시설 운영 화면은 MANAGER 역할을 가진 계정만 접근할 수 있습니다. */
function ManagerRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'MANAGER' ? children : <Navigate to={getDefaultRoute(user)} replace />
}

function AppRoutes() {
  const navigate = useNavigate()
  // 브라우저에 저장된 사용자 정보가 있으면 새로고침 후에도 로그인 상태를 복원합니다.
  const [user, setUser] = useState(() => getStoredUser())
  // 로그아웃하면 저장된 JWT와 사용자 정보를 제거하고 공개 첫 화면으로 이동합니다.
  const logout = () => { clearAuth(); setUser(null); navigate('/', { replace: true }) }
  return (
    <Routes>
      {/* 공개 화면: 로그인하지 않은 사용자도 접근할 수 있습니다. */}
      <Route path="/" element={<LandingPage user={user} onLogout={logout} />} />
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute(user)} replace /> : <LoginPage onAuthenticated={setUser} />} />
      <Route path="/signup" element={user ? <Navigate to={getDefaultRoute(user)} replace /> : <SignupPage />} />

      {/* 보호 화면: 사용자 정보가 없으면 ProtectedRoute가 로그인 화면으로 이동시킵니다. */}
      <Route path="/setup" element={<ProtectedRoute user={user}><FacilitySetupPage user={user} onAuthenticated={setUser} /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute user={user}><HomePage user={user} onLogout={logout} /></ProtectedRoute>} />
      <Route path="/menus" element={<ProtectedRoute user={user}><MenuListPage /></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute user={user}><BudgetAnalysisPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute user={user}><AdminPage user={user} onLogout={logout} /></AdminRoute>} />
      <Route path="/manager" element={<ManagerRoute user={user}><ManagerPage user={user} onLogout={logout} /></ManagerRoute>} />
      {/* 새로 추가된 주간 식단 화면을 실제 식단 API와 연결합니다. */}
      <Route path="/meal-plans" element={<ProtectedRoute user={user}><MealPlanPage onLogout={logout} /></ProtectedRoute>} />

      {/* 아직 실제 기능 화면이 없는 주소는 공통 준비 중 화면을 사용합니다. */}
      <Route path="/prices" element={<ProtectedRoute user={user}><FeatureComingSoonPage eyebrow="PRICE FORECAST" title="식재료 가격 예측" description="가격 수집과 예측 API 연결 후 품목별 7일 전망을 확인할 수 있습니다." /></ProtectedRoute>} />

      {/* 정의되지 않은 주소로 접근하면 공개 첫 화면으로 되돌립니다. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}

export default App
