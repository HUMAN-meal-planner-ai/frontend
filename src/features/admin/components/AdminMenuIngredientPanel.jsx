import { useCallback, useEffect, useState } from 'react'
import { getAdminMenuIngredients, searchAdminMenus } from '../api/adminApi'

const MAPPING_LABELS = {
  APPROVED: '가격 매핑 승인',
  PROPOSED: '검토 대기',
  REJECTED: '거절됨',
  UNMAPPED: '매핑 없음',
}

export default function AdminMenuIngredientPanel() {
  const [keyword, setKeyword] = useState('')
  const [menus, setMenus] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const loadMenus = useCallback(async (searchText) => {
    setListLoading(true)
    setError('')
    try {
      setMenus(await searchAdminMenus(searchText))
    } catch {
      setError('메뉴 목록을 불러오지 못했습니다.')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    searchAdminMenus('').then(setMenus).catch(() => setError('메뉴 목록을 불러오지 못했습니다.')).finally(() => setListLoading(false))
  }, [])

  const selectMenu = async (menuId) => {
    setSelected(menuId)
    setDetailLoading(true)
    setError('')
    try {
      setDetail(await getAdminMenuIngredients(menuId))
    } catch {
      setDetail(null)
      setError('메뉴 식재료를 불러오지 못했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const totalQuantity = (detail?.ingredients || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  return (
    <section className="price-mapping-section" aria-labelledby="menu-ingredient-title">
      <div className="price-section-title">
        <div><span>MENU INGREDIENTS</span><h3 id="menu-ingredient-title">메뉴-식재료 연결 조회</h3></div>
        <form className="menu-ingredient-search" onSubmit={(event) => { event.preventDefault(); loadMenus(keyword) }}>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="메뉴명 검색" />
          <button type="submit">검색</button>
        </form>
      </div>
      {error && <p className="admin-inline-error">{error}</p>}
      <div className="menu-ingredient-layout">
        <div className="price-source-table-wrap menu-ingredient-list">
          <table className="price-source-table">
            <thead><tr><th>메뉴</th><th>분류</th><th>식재료 수</th></tr></thead>
            <tbody>
              {listLoading && <tr><td colSpan="3" className="empty">불러오는 중입니다.</td></tr>}
              {!listLoading && menus.length === 0 && <tr><td colSpan="3" className="empty">검색 결과가 없습니다.</td></tr>}
              {!listLoading && menus.map((menu) => (
                <tr key={menu.menuId} className={menu.menuId === selected ? 'selected' : ''} onClick={() => selectMenu(menu.menuId)}>
                  <td><strong>{menu.menuName}</strong></td>
                  <td>{menu.category || '-'}</td>
                  <td>{menu.ingredientCount}개</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="price-source-table-wrap menu-ingredient-detail">
          {!selected && <p className="empty">왼쪽에서 메뉴를 선택하면 구성 식재료와 사용 중량이 표시됩니다.</p>}
          {selected && detailLoading && <p className="empty">불러오는 중입니다.</p>}
          {selected && !detailLoading && detail && (
            <table className="price-source-table">
              <caption>{detail.menuName} · 1인 기준</caption>
              <thead><tr><th>식재료</th><th>분류</th><th>사용 중량</th><th>가격 매핑</th></tr></thead>
              <tbody>
                {detail.ingredients.length === 0
                  ? <tr><td colSpan="4" className="empty">연결된 식재료가 없습니다.</td></tr>
                  : detail.ingredients.map((item) => (
                    <tr key={item.ingredientId}>
                      <td><strong>{item.ingredientName}</strong></td>
                      <td>{item.category || '-'}</td>
                      <td>{item.quantity == null ? '-' : `${Number(item.quantity).toLocaleString()}${item.standardUnit || 'g'}`}</td>
                      <td><span className={`menu-ingredient-mapping ${item.priceMappingStatus.toLowerCase()}`}>{MAPPING_LABELS[item.priceMappingStatus] || item.priceMappingStatus}</span></td>
                    </tr>
                  ))}
              </tbody>
              {detail.ingredients.length > 0 && (
                <tfoot><tr><td colSpan="2">합계 {detail.ingredients.length}개 품목</td><td colSpan="2">{totalQuantity.toLocaleString()}g</td></tr></tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </section>
  )
}