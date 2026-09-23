import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../api/axios'
import './MenuListPage.css'

function displayMenuName(name) {
  return name?.replace(/"/g, '') || '이름 없는 메뉴'
}

export default function MenuListPage() {
  const [menus, setMenus] = useState([])

  const [query, setQuery] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMenu, setSelectedMenu] = useState(null)

  const pageSize = 40

  useEffect(() => {
    let cancelled = false

    api.get('/api/menus')
      .then((response) => {
        if (!cancelled) {
          setMenus(response.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('메뉴를 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleReset = () => {
    setQuery('')
    setSearchKeyword('')
    setPage(1)
  }

  const handleSearch = (event) => {
    event.preventDefault()

    setSearchKeyword(query)
    setPage(1)
  }

  const normalizedKeyword =
    searchKeyword.trim().toLowerCase()

  const filteredMenus = menus.filter((menu) =>
    [
      displayMenuName(menu.menuName),
      menu.menuCode,
      menu.mainCategory,
      menu.subCategory,
    ].some((value) =>
      (value ?? '')
        .toLowerCase()
        .includes(normalizedKeyword)
    )
  )

  const totalPages =
    Math.ceil(filteredMenus.length / pageSize)

  const startIndex =
    (page - 1) * pageSize

  const currentMenus =
    filteredMenus.slice(
      startIndex,
      startIndex + pageSize
    )

  return (
    <div className="menu-page">

      {/* HEADER */}

      <header className="menu-header">

        <Link
          to="/"
          className="menu-logo"
        >
          <span className="menu-logo-leaf">
            ◆
          </span>

          MEAL<span>FIT</span>
        </Link>

        <nav
          className="menu-nav"
          aria-label="주요 메뉴"
        >
          <Link
            to="/menus"
            className="menu-nav-active"
          >
            메뉴 검색
          </Link>

          <Link to="/meal-plans">
            식단 관리
          </Link>

          <Link to="/prices">
            가격 예측
          </Link>

          <Link to="/budget">
            원가 · 예산
          </Link>
        </nav>

      </header>


      <main className="menu-content">

        {/* INTRO */}

        <section className="menu-intro">

          <p className="menu-eyebrow">
            MEALFIT SERVICES · MENU SEARCH
          </p>

          <h1>
            급식 메뉴 구성을 더 간편하게.
          </h1>

          <p className="menu-description">
            메뉴명, 메뉴 코드, 분류를 기준으로
            원하는 급식 메뉴를 검색해 보세요.
          </p>

        </section>


        {/* 일반 검색 */}

        <section
          className="menu-search-panel"
          aria-label="메뉴 검색"
        >

          <p
            className="menu-description"
            style={{
              marginBottom: '12px',
            }}
          >
            메뉴명, 메뉴 코드, 분류로 검색할 수 있어요.
          </p>


          <form
            onSubmit={handleSearch}
            className="menu-search-form"
          >

            <div className="menu-input-wrap">

              <span
                className="menu-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>


              <input
                type="text"
                aria-label="일반 메뉴 검색어"
                placeholder="메뉴명, 메뉴 코드, 분류를 검색하세요"
                value={query}

                onChange={(event) => {
                  const value = event.target.value

                  setQuery(value)

                  if (!value.trim()) {
                    setSearchKeyword('')
                    setPage(1)
                  }
                }}
              />


              {query && (
                <button
                  type="button"
                  className="menu-reset"
                  onClick={handleReset}
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}

            </div>


            <button
              type="submit"
              className="menu-search-button"
            >
              검색 <span>→</span>
            </button>

          </form>

        </section>


        {/* =======================================
            MEALFIT AI 챗봇 이동 배너
        ======================================= */}

        <Link
          to="/menus/chat"
          className="menu-ai-banner"
        >

          <div className="menu-ai-banner-icon">
            ✦
          </div>


          <div className="menu-ai-banner-content">

            <p className="menu-ai-banner-label">
              MEALFIT AI
            </p>

            <h2>
              급식 메뉴 구성이 고민되시나요?
            </h2>

            <p>
              식재료와 조건을 입력하면
              AI가 단체급식에 적합한 메뉴를 추천해드려요.
            </p>

          </div>


          <div className="menu-ai-banner-action">

            <span>
              AI에게 질문하기
            </span>

            <strong>
              →
            </strong>

          </div>

        </Link>


        {/* 로딩 */}

        {loading && (
          <p
            className="menu-message"
            role="status"
          >
            메뉴를 불러오고 있습니다.
          </p>
        )}


        {/* 오류 */}

        {!loading && error && (
          <p
            className="menu-message menu-error"
            role="alert"
          >
            {error}
          </p>
        )}


        {/* 검색 결과 */}

        {!loading && !error && (
          <>

            <div className="menu-results-header">

              <div>

                <p className="menu-section-label">
                  MENU COLLECTION
                </p>

                <h2>
                  메뉴 목록
                </h2>

              </div>


              <p className="menu-result-count">

                검색 결과{' '}

                <strong>
                  {filteredMenus.length}
                </strong>

                개

              </p>

            </div>


            {filteredMenus.length === 0
              ? (
                <p className="menu-message">
                  검색 결과가 없습니다.
                </p>
              )
              : (
                <div className="menu-grid">

                  {currentMenus.map((menu) => (

                    <article
                      className="menu-card"
                      key={
                        menu.menuId ??
                        menu.menuCode
                      }
                    >

                      <div className="menu-card-top">

                        <span className="menu-category">

                          {menu.mainCategory}
                          {' / '}
                          {menu.subCategory}

                        </span>


                        <span className="menu-card-code">
                          {menu.menuCode}
                        </span>

                      </div>


                      <h3>
                        {displayMenuName(
                          menu.menuName
                        )}
                      </h3>


                      <p className="menu-card-weight">

                        식재료{' '}

                        <strong>
                          {
                            menu.foodCount ??
                            menu.ingredients?.length ??
                            0
                          }
                          개
                        </strong>


                        {menu.weight != null && (
                          <>
                            {' '}· 기준 중량{' '}

                            <strong>
                              {menu.weight}g
                            </strong>
                          </>
                        )}

                      </p>


                      <button
                        type="button"
                        className="menu-detail-button"
                        onClick={() =>
                          setSelectedMenu(menu)
                        }
                      >
                        상세 보기{' '}
                        <span>→</span>
                      </button>

                    </article>

                  ))}

                </div>
              )}


            {totalPages > 1 && (

              <div className="menu-pagination">

                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (current) => current - 1
                    )
                  }
                  disabled={page === 1}
                >
                  ← 이전
                </button>


                <span>

                  <strong>
                    {page}
                  </strong>

                  {' / '}

                  {totalPages}

                  {' 페이지'}

                </span>


                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (current) => current + 1
                    )
                  }
                  disabled={
                    page === totalPages
                  }
                >
                  다음 →
                </button>

              </div>

            )}

          </>
        )}

      </main>


      {/* 메뉴 상세 모달 */}

      {selectedMenu && (

        <div
          className="menu-modal-overlay"
          onClick={() =>
            setSelectedMenu(null)
          }
        >

          <section
            className="menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-detail-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="menu-modal-header">

              <div>

                <p className="menu-section-label">
                  MENU DETAILS
                </p>

                <h2 id="menu-detail-title">
                  메뉴 상세 정보
                </h2>

              </div>


              <button
                type="button"
                className="menu-modal-close"
                onClick={() =>
                  setSelectedMenu(null)
                }
                aria-label="닫기"
              >
                ×
              </button>

            </div>


            <div className="menu-modal-info">

              <span className="menu-category">

                {selectedMenu.mainCategory}
                {' / '}
                {selectedMenu.subCategory}

              </span>


              <h3>
                {displayMenuName(
                  selectedMenu.menuName
                )}
              </h3>


              <div className="menu-detail-row">

                <span>
                  메뉴 코드
                </span>

                <strong>
                  {selectedMenu.menuCode}
                </strong>

              </div>


              <div className="menu-detail-row">

                <span>
                  식단 슬롯
                </span>

                <strong>
                  {selectedMenu.slot || '미분류'}
                </strong>

              </div>


              <div className="menu-detail-row">

                <span>
                  기준 중량
                </span>

                <strong>
                  {selectedMenu.weight != null
                    ? `${selectedMenu.weight}g`
                    : '정보 없음'}
                </strong>

              </div>

            </div>


            <div className="menu-modal-section">

              <div className="menu-modal-section-heading">

                <h3>
                  식재료 및 사용량
                </h3>

                <span>
                  총{' '}
                  {
                    selectedMenu
                      .ingredients
                      ?.length ?? 0
                  }
                  개
                </span>

              </div>


              <div className="menu-ingredient-table-wrap">

                <table className="menu-ingredient-table">

                  <thead>
                    <tr>
                      <th scope="col">
                        식재료명
                      </th>

                      <th scope="col">
                        사용량
                      </th>

                      <th scope="col">
                        기준 단가
                      </th>
                    </tr>
                  </thead>


                  <tbody>

                    {selectedMenu
                      .ingredients
                      ?.length
                      ? (

                        selectedMenu
                          .ingredients
                          .map((ingredient) => (

                            <tr
                              key={
                                ingredient.ingredientId
                              }
                            >

                              <td>
                                {
                                  ingredient
                                    .ingredientName
                                }
                              </td>

                              <td>
                                {
                                  ingredient
                                    .quantity ??
                                  '-'
                                }
                              </td>

                              <td>
                                {
                                  ingredient
                                    .unitPrice != null
                                    ? `${Number(
                                        ingredient.unitPrice
                                      ).toLocaleString()}원`
                                    : '-'
                                }
                              </td>

                            </tr>

                          ))

                      )
                      : (

                        <tr>

                          <td
                            colSpan={3}
                            className="menu-ingredient-empty"
                          >
                            등록된 식재료가 없습니다.
                          </td>

                        </tr>

                      )}

                  </tbody>

                </table>

              </div>

            </div>


            <button
              type="button"
              className="menu-modal-done"
              disabled
              title="식단 추가 기능 연결 후 사용할 수 있습니다."
            >
              선택한 식단에 추가
            </button>

          </section>

        </div>

      )}

    </div>
  )
}