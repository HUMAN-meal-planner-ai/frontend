import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../api/axios'
import { getMenuCostDetail } from '../../budget/api/costApi'
import MealFitHeader from '../../../layouts/MealFitHeader'
import { getMyFacility, getWeeklyMealPlan, saveMealPlan } from '../../mealplan/api/mealPlanApi'
import './MenuListPage.css'

function displayMenuName(name) {
  return name?.replace(/"/g, '') || '이름 없는 메뉴'
}

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekStartDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return formatLocalDate(date)
}

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: '조식', mealCountField: 'breakfastMealCount' },
  { value: 'LUNCH', label: '중식', mealCountField: 'lunchMealCount' },
  { value: 'DINNER', label: '석식', mealCountField: 'dinnerMealCount' },
]

const MENU_SLOT_FILTERS = [
  { value: 'ALL', label: '전체 메뉴' },
  { value: 'RICE', label: '밥' },
  { value: 'SOUP', label: '국' },
  { value: 'MAIN', label: '메인 반찬' },
  { value: 'SIDE', label: '서브 반찬' },
  { value: 'KIMCHI', label: '김치' },
  { value: 'OTHER', label: '기타' },
]

export default function MenuListPage() {
  const [menus, setMenus] = useState([])

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('ALL')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [menuDetailState, setMenuDetailState] = useState({ menuId: null, loading: false, error: '' })
  const [basket, setBasket] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()))
  const [selectedMealType, setSelectedMealType] = useState('LUNCH')
  const [facility, setFacility] = useState(null)
  const [mealPreview, setMealPreview] = useState({ key: '', menus: [], error: '' })
  const [mealPreviewRefresh, setMealPreviewRefresh] = useState(0)
  const [basketMessage, setBasketMessage] = useState('')
  const [basketError, setBasketError] = useState('')
  const [savingBasket, setSavingBasket] = useState(false)

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

  useEffect(() => {
    getMyFacility()
      .then(({ data }) => setFacility(data))
      .catch(() => {})
  }, [])

  const openMenuDetails = async (menu) => {
    setSelectedMenu({ ...menu, ingredients: [] })
    setMenuDetailState({ menuId: menu.menuId, loading: true, error: '' })

    try {
      const detail = await getMenuCostDetail(menu.menuId, { mealCount: 1 })
      const ingredients = (detail.details || []).map((ingredient) => ({
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.ingredientName,
        quantity: ingredient.quantity,
        unitPrice: ingredient.standardUnitPrice,
      }))

      setSelectedMenu((current) => (
        current?.menuId === menu.menuId ? { ...current, ingredients } : current
      ))
    } catch (detailError) {
      const message = detailError.response?.data?.message || ''
      if (message.includes('해당 메뉴에 등록된 식재료 구성 정보가 없습니다')) {
        setSelectedMenu((current) => (
          current?.menuId === menu.menuId ? { ...current, ingredients: [] } : current
        ))
      } else {
        setMenuDetailState((current) => (
          current.menuId === menu.menuId
            ? { ...current, error: '식재료 구성을 불러오지 못했습니다.' }
            : current
        ))
      }
    } finally {
      setMenuDetailState((current) => (
        current.menuId === menu.menuId ? { ...current, loading: false } : current
      ))
    }
  }

  useEffect(() => {
    if (!selectedDate) return undefined

    let active = true
    const previewKey = `${selectedDate}:${selectedMealType}:${mealPreviewRefresh}`

    getWeeklyMealPlan(getWeekStartDate(selectedDate))
      .then(({ data }) => {
        if (!active) return

        const existingMeal = data?.meals?.find((meal) => (
          meal.mealDate === selectedDate
          && (meal.mealType || '').toUpperCase() === selectedMealType
        ))
        const menuItems = existingMeal?.menuItems?.length
          ? existingMeal.menuItems
          : (existingMeal?.menuName ? existingMeal.menuName.split(',').map((menuName) => ({ menuName: menuName.trim() })) : [])

        setMealPreview({ key: previewKey, menus: menuItems.filter((item) => item.menuName), error: '' })
      })
      .catch((loadError) => {
        if (!active) return

        const message = loadError.response?.data?.message || ''
        if (message.includes('저장된 주간 식단이 없습니다')) {
          setMealPreview({ key: previewKey, menus: [], error: '' })
          return
        }

        setMealPreview({ key: previewKey, menus: [], error: '기존 식단 정보를 불러오지 못했습니다.' })
      })

    return () => {
      active = false
    }
  }, [selectedDate, selectedMealType, mealPreviewRefresh])

  const mealPreviewKey = `${selectedDate}:${selectedMealType}:${mealPreviewRefresh}`
  const loadingExistingMeal = mealPreview.key !== mealPreviewKey
  const existingMealMenus = loadingExistingMeal ? [] : mealPreview.menus
  const existingMealError = loadingExistingMeal ? '' : mealPreview.error

  const addSelectedMenu = () => {
    if (selectedMenu.menuId == null) {
      setBasketError('메뉴 코드가 없어 식단에 저장할 수 없습니다.')
      return
    }

    if (basket.some((menu) => menu.menuId === selectedMenu.menuId)) {
      setBasketError('이미 장바구니에 담긴 메뉴입니다.')
      return
    }

    if (basket.length >= 7) {
      setBasketError('한 끼니에는 메뉴를 최대 7개까지 담을 수 있습니다.')
      return
    }

    setBasket((current) => [...current, selectedMenu])
    setBasketError('')
    setBasketMessage(`${displayMenuName(selectedMenu.menuName)} 메뉴를 담았습니다.`)
    setSelectedMenu(null)
  }

  const removeBasketMenu = (menuId) => {
    setBasket((current) => current.filter((menu) => menu.menuId !== menuId))
    setBasketError('')
    setBasketMessage('장바구니에서 메뉴를 제거했습니다.')
  }

  const saveBasket = async () => {
    if (basket.length === 0 || !selectedDate) return

    setSavingBasket(true)
    setBasketError('')
    setBasketMessage('')

    const weekStartDate = getWeekStartDate(selectedDate)
    const mealCountField = MEAL_TYPES.find((meal) => meal.value === selectedMealType)?.mealCountField
    const mealCount = Number(facility?.[mealCountField] || facility?.defaultMealCount || 1)

    try {
      let existingPlan = null
      try {
        const { data } = await getWeeklyMealPlan(weekStartDate)
        existingPlan = data
      } catch (loadError) {
        const message = loadError.response?.data?.message || ''
        if (!message.includes('저장된 주간 식단이 없습니다')) throw loadError
      }

      const existingMeals = (existingPlan?.meals || []).flatMap((meal) => {
        const menuItems = meal.menuItems?.length
          ? meal.menuItems
          : (meal.menuId != null ? [{ menuId: meal.menuId }] : [])

        return menuItems
          .filter((item) => item.menuId != null)
          .map((item) => ({
            mealDate: meal.mealDate,
            mealType: meal.mealType || 'LUNCH',
            slot: meal.slot || 'OTHER',
            menuId: item.menuId,
          }))
      })

      const meals = [
        ...existingMeals,
        ...basket.map((menu) => ({
          mealDate: selectedDate,
          mealType: selectedMealType,
          slot: 'OTHER',
          menuId: menu.menuId,
        })),
      ]

      await saveMealPlan({ weekStartDate, mealCount, meals })
      setBasket([])
      setMealPreviewRefresh((current) => current + 1)
      setBasketMessage(`${selectedDate} ${MEAL_TYPES.find((meal) => meal.value === selectedMealType)?.label} 식단을 저장했습니다.`)
    } catch (saveError) {
      setBasketError(saveError.response?.data?.message || '식단 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSavingBasket(false)
    }
  }

  const handleReset = () => {
    setQuery('')
    setSearchResults(null)
    setPage(1)
  }

  const handleSearch = async (event) => {
    event.preventDefault()

    const keyword = query.trim()

    if (!keyword) {
      setSearchResults(null)
      setPage(1)
      return
    }

    try {
      const response = await api.get('/api/menus/search', {
        params: {
          keyword,
        },
      })

      setSearchResults(response.data)
      setPage(1)
    } catch {
      setError('메뉴 검색에 실패했습니다.')
    }
  }

  const filteredMenus = (searchResults ?? menus).filter((menu) => {
    if (selectedSlot === 'ALL') return true
    if (selectedSlot === 'SIDE') return menu.slot === 'SIDE'
    return menu.slot === selectedSlot
  })

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
      <MealFitHeader />


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
                placeholder="메뉴명, 식재료, 메뉴 코드, 분류를 검색하세요"
                value={query}

                onChange={(event) => {
                  const value = event.target.value

                  setQuery(value)

                  if (!value.trim()) {
                    setSearchResults(null)
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


        <div className="menu-planning-layout">
          <div className="menu-results-column">
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

            <div className="menu-slot-filters" role="group" aria-label="메뉴 분류 필터">
              {MENU_SLOT_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.value}
                  className={selectedSlot === filter.value ? 'menu-slot-filter-active' : ''}
                  aria-pressed={selectedSlot === filter.value}
                  onClick={() => {
                    setSelectedSlot(filter.value)
                    setPage(1)
                  }}
                >
                  {filter.label}
                </button>
              ))}
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
                        onClick={() => openMenuDetails(menu)}
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

          </div>

          <div className="menu-sidebar" aria-label="급식 메뉴 도구">
            <Link to="/menus/chat" className="menu-ai-banner">
              <div className="menu-ai-banner-icon" aria-hidden="true">✦</div>
              <div className="menu-ai-banner-content">
                <p className="menu-ai-banner-label">MEALFIT AI</p>
                <h2>급식 메뉴 구성이 고민되시나요?</h2>
                <p>식재료와 조건을 입력하면 AI가 단체급식에 적합한 메뉴를 추천해드려요.</p>
              </div>
              <div className="menu-ai-banner-action">
                <span>AI에게 질문하기</span>
                <strong aria-hidden="true">→</strong>
              </div>
            </Link>

          <aside className="menu-basket" aria-labelledby="menu-basket-title">
            <div className="menu-basket-heading">
              <div>
                <p className="menu-section-label">MEAL BASKET</p>
                <h2 id="menu-basket-title">한 끼니 장바구니</h2>
              </div>
              <span className="menu-basket-count">{basket.length}<small> / 7</small></span>
            </div>

            <div className="menu-basket-items" aria-live="polite">
              {basket.length === 0 ? (
                <p className="menu-basket-empty">상세 보기에서 메뉴를 담아주세요.</p>
              ) : basket.map((menu) => (
                <div className="menu-basket-item" key={menu.menuId}>
                  <div>
                    <strong>{displayMenuName(menu.menuName)}</strong>
                    <span>{menu.mainCategory || '분류 없음'} · {menu.menuCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBasketMenu(menu.menuId)}
                    aria-label={`${displayMenuName(menu.menuName)} 삭제`}
                    title="장바구니에서 제거"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="menu-basket-fields">
              <label>
                날짜
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  required
                />
              </label>
              <label>
                끼니
                <select value={selectedMealType} onChange={(event) => setSelectedMealType(event.target.value)}>
                  {MEAL_TYPES.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}
                </select>
              </label>
            </div>

            <section className="menu-basket-preview" aria-labelledby="existing-meal-title" aria-live="polite">
              <div className="menu-basket-preview-heading">
                <h3 id="existing-meal-title">현재 저장된 메뉴</h3>
                {!loadingExistingMeal && !existingMealError && (
                  <span>{existingMealMenus.length}개</span>
                )}
              </div>
              {loadingExistingMeal ? (
                <p className="menu-basket-preview-message">기존 식단을 확인하고 있습니다.</p>
              ) : existingMealError ? (
                <p className="menu-basket-preview-message menu-basket-error" role="alert">{existingMealError}</p>
              ) : existingMealMenus.length > 0 ? (
                <ul className="menu-basket-existing-list">
                  {existingMealMenus.map((menu, index) => (
                    <li key={menu.menuId ?? `${menu.menuName}-${index}`}>{displayMenuName(menu.menuName)}</li>
                  ))}
                </ul>
              ) : (
                <p className="menu-basket-preview-message">선택한 날짜와 끼니에 저장된 메뉴가 없습니다.</p>
              )}
            </section>

            {basketError && <p className="menu-basket-feedback menu-basket-error" role="alert">{basketError}</p>}
            {basketMessage && <p className="menu-basket-feedback" role="status">{basketMessage}</p>}

            <button
              type="button"
              className="menu-basket-save"
              onClick={saveBasket}
              disabled={basket.length === 0 || !selectedDate || savingBasket}
            >
              {savingBasket ? '저장 중...' : '선택한 식단 저장'}
            </button>
          </aside>
          </div>
        </div>

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
                  {menuDetailState.loading && menuDetailState.menuId === selectedMenu.menuId
                    ? '불러오는 중'
                    : `총 ${selectedMenu.ingredients?.length ?? 0}개`}
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

                    {menuDetailState.loading && menuDetailState.menuId === selectedMenu.menuId ? (
                      <tr>
                        <td colSpan={3} className="menu-ingredient-empty">
                          식재료 구성을 불러오고 있습니다.
                        </td>
                      </tr>
                    ) : menuDetailState.error && menuDetailState.menuId === selectedMenu.menuId ? (
                      <tr>
                        <td colSpan={3} className="menu-ingredient-empty" role="alert">
                          {menuDetailState.error}
                        </td>
                      </tr>
                    ) : selectedMenu
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
              onClick={addSelectedMenu}
              disabled={basket.some((menu) => menu.menuId === selectedMenu.menuId) || basket.length >= 7}
            >
              {basket.some((menu) => menu.menuId === selectedMenu.menuId)
                ? '장바구니에 담김'
                : basket.length >= 7
                  ? '장바구니가 가득 찼습니다'
                  : '선택한 식단에 추가'}
            </button>

          </section>

        </div>

      )}

    </div>
  )
}