import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../api/axios'
import './MenuListPage.css'

/** 메뉴 이름에 포함된 불필요한 큰따옴표를 제거해 화면 표시를 통일합니다. */
function displayMenuName(name) {
  return name?.replace(/"/g, '') || '이름 없는 메뉴'
}

/** 메뉴 검색, 페이지 이동, 식재료 상세 모달을 제공하는 메뉴 목록 화면입니다. */
export default function MenuListPage() {
  // 서버에서 받은 원본 목록과 사용자가 입력·적용한 검색어를 분리해 관리합니다.
  const [menus, setMenus] = useState([])
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMenu, setSelectedMenu] = useState(null)

  // 한 페이지에 표시할 최대 카드 수입니다.
  const pageSize = 40

  useEffect(() => {
    // Axios 공통 설정이 저장된 JWT를 요청 헤더에 자동으로 넣습니다.
    let cancelled = false
    api.get('/api/menus')
      .then((response) => {
        if (!cancelled) setMenus(response.data)
      })
      .catch(() => {
        if (!cancelled) setError('메뉴를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  /** 검색 버튼 또는 Enter 입력 시 현재 입력어를 실제 필터 조건으로 적용합니다. */
  const handleSearch = (event) => {
    event.preventDefault()
    setSearchKeyword(keyword)
    setPage(1)
  }

  /** 입력어와 적용된 검색어를 모두 지우고 첫 페이지로 돌아갑니다. */
  const handleReset = () => {
    setKeyword('')
    setSearchKeyword('')
    setPage(1)
  }

  // 메뉴명, 메뉴 코드, 대·소분류 중 하나라도 검색어를 포함하면 결과에 남깁니다.
  const normalizedKeyword = searchKeyword.trim().toLowerCase()
  const filteredMenus = menus.filter((menu) => [
    displayMenuName(menu.menuName),
    menu.menuCode,
    menu.mainCategory,
    menu.subCategory,
  ].some((value) => (value ?? '').toLowerCase().includes(normalizedKeyword)))

  // 필터 결과를 현재 페이지 구간만 잘라 카드 목록으로 사용합니다.
  const totalPages = Math.ceil(filteredMenus.length / pageSize)
  const startIndex = (page - 1) * pageSize
  const currentMenus = filteredMenus.slice(startIndex, startIndex + pageSize)

  return (
    <div className="menu-page">
      {/* 다른 MealFit 업무 화면으로 이동하는 공통 상단 메뉴입니다. */}
      <header className="menu-header">
        <Link to="/" className="menu-logo"><span className="menu-logo-leaf">◆</span>MEAL<span>FIT</span></Link>
        <nav className="menu-nav" aria-label="주요 메뉴">
          <Link to="/menus" className="menu-nav-active">메뉴 검색</Link>
          <Link to="/meal-plans">식단 관리</Link>
          <Link to="/prices">가격 예측</Link>
          <Link to="/budget">원가 · 예산</Link>
        </nav>
        <Link to="/" className="menu-home-link">메인으로 <span>↗</span></Link>
      </header>

      <main className="menu-content">
        <section className="menu-intro">
          <p className="menu-eyebrow">MEALFIT SERVICES · MENU SEARCH</p>
          <h1>오늘의 메뉴를 찾아보세요.</h1>
          <p className="menu-description">메뉴명과 분류를 검색하고 원하는 메뉴의 식재료 정보를 확인하세요.</p>
        </section>

        {/* 검색 버튼을 누르기 전까지 입력만으로 카드 목록이 계속 바뀌지 않도록 form 제출 방식으로 구성합니다. */}
        <section className="menu-search-panel" aria-label="메뉴 검색">
          <form onSubmit={handleSearch} className="menu-search-form">
            <div className="menu-input-wrap">
              <span className="menu-search-icon" aria-hidden="true">⌕</span>
              <input
                type="text"
                placeholder="메뉴명, 메뉴 코드, 분류를 검색하세요"
                value={keyword}
                onChange={(event) => {
                  const value = event.target.value
                  setKeyword(value)
                  // 검색어를 모두 지우면 별도 검색 버튼 없이 전체 목록으로 복원합니다.
                  if (!value.trim()) {
                    setSearchKeyword('')
                    setPage(1)
                  }
                }}
              />
              {keyword && <button type="button" className="menu-reset" onClick={handleReset} aria-label="검색어 지우기">×</button>}
            </div>
            <button type="submit" className="menu-search-button">검색 <span>→</span></button>
          </form>
        </section>

        {loading && <p className="menu-message" role="status">메뉴를 불러오고 있습니다.</p>}
        {!loading && error && <p className="menu-message menu-error" role="alert">{error}</p>}

        {!loading && !error && (
          <>
            <div className="menu-results-header">
              <div><p className="menu-section-label">MENU COLLECTION</p><h2>메뉴 목록</h2></div>
              <p className="menu-result-count">검색 결과 <strong>{filteredMenus.length}</strong>개</p>
            </div>

            {filteredMenus.length === 0 ? (
              <p className="menu-message">검색 결과가 없습니다.</p>
            ) : (
              <div className="menu-grid">
                {currentMenus.map((menu) => (
                  <article className="menu-card" key={menu.menuId ?? menu.menuCode}>
                    <div className="menu-card-top">
                      <span className="menu-category">{menu.mainCategory} / {menu.subCategory}</span>
                      <span className="menu-card-code">{menu.menuCode}</span>
                    </div>
                    <h3>{displayMenuName(menu.menuName)}</h3>
                    <p className="menu-card-weight">
                      식재료 <strong>{menu.foodCount ?? menu.ingredients?.length ?? 0}개</strong>
                      {menu.weight != null && <> · 기준 중량 <strong>{menu.weight}g</strong></>}
                    </p>
                    <button type="button" className="menu-detail-button" onClick={() => setSelectedMenu(menu)}>
                      상세 보기 <span>→</span>
                    </button>
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="menu-pagination">
                <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>← 이전</button>
                <span><strong>{page}</strong> / {totalPages} 페이지</span>
                <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>다음 →</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 선택된 메뉴가 있을 때만 화면 위에 상세 모달을 표시합니다. 배경 클릭이나 × 버튼으로 닫을 수 있습니다. */}
      {selectedMenu && (
        <div className="menu-modal-overlay" onClick={() => setSelectedMenu(null)}>
          <section className="menu-modal" role="dialog" aria-modal="true" aria-labelledby="menu-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="menu-modal-header">
              <div><p className="menu-section-label">MENU DETAILS</p><h2 id="menu-detail-title">메뉴 상세 정보</h2></div>
              <button type="button" className="menu-modal-close" onClick={() => setSelectedMenu(null)} aria-label="닫기">×</button>
            </div>

            <div className="menu-modal-info">
              <span className="menu-category">{selectedMenu.mainCategory} / {selectedMenu.subCategory}</span>
              <h3>{displayMenuName(selectedMenu.menuName)}</h3>
              <div className="menu-detail-row"><span>메뉴 코드</span><strong>{selectedMenu.menuCode}</strong></div>
              <div className="menu-detail-row"><span>식단 슬롯</span><strong>{selectedMenu.slot || '미분류'}</strong></div>
              <div className="menu-detail-row"><span>기준 중량</span><strong>{selectedMenu.weight != null ? `${selectedMenu.weight}g` : '정보 없음'}</strong></div>
            </div>

            {/* 식재료는 별도 정적 파일이 아니라 /api/menus 응답의 ingredients 배열을 사용합니다. */}
            <div className="menu-modal-section">
              <div className="menu-modal-section-heading"><h3>식재료 및 사용량</h3><span>총 {selectedMenu.ingredients?.length ?? 0}개</span></div>
              <div className="menu-ingredient-table-wrap">
                <table className="menu-ingredient-table">
                  <thead><tr><th scope="col">식재료명</th><th scope="col">사용량</th><th scope="col">기준 단가</th></tr></thead>
                  <tbody>
                    {selectedMenu.ingredients?.length ? selectedMenu.ingredients.map((ingredient) => (
                      <tr key={ingredient.ingredientId}>
                        <td>{ingredient.ingredientName}</td>
                        <td>{ingredient.quantity ?? '-'}</td>
                        <td>{ingredient.unitPrice != null ? `${Number(ingredient.unitPrice).toLocaleString()}원` : '-'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="menu-ingredient-empty">등록된 식재료가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button type="button" className="menu-modal-done" disabled title="식단 추가 기능 연결 후 사용할 수 있습니다.">선택한 식단에 추가</button>
          </section>
        </div>
      )}
    </div>
  )
}
