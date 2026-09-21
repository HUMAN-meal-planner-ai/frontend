
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import './MenuListPage.css';

// 식재료 데이터는 한 번만 가져오고, 오류가 나면 다음 상세 보기에서 재시도합니다.
let ingredientDataPromise;

function loadIngredientData() {
  if (!ingredientDataPromise) {
    ingredientDataPromise = fetch('/menu-ingredients.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`식재료 조회 실패: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        ingredientDataPromise = undefined;
        throw error;
      });
  }

  return ingredientDataPromise;
}

export default function MenuListPage() {
  // 메뉴 목록 및 검색 상태
  const [menus, setMenus] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [selectedMenu, setSelectedMenu] = useState(null);

  // 식재료 조회 상태
  const [ingredientState, setIngredientState] = useState({
    status: 'idle',
    rows: [],
  });

  // 한 페이지에 표시할 메뉴 수
  const pageSize = 40;

  // 메뉴 목록 조회
  useEffect(() => {
    api
      .get('/api/menus')
      .then((response) => setMenus(response.data))
      .catch(() => setError('메뉴를 불러오지 못했습니다.'));
  }, []);

  // 선택한 메뉴의 식재료 조회
  useEffect(() => {
    const menuCode = selectedMenu?.menuCode;

    if (!menuCode) return;

    let active = true;

    setIngredientState({
      status: 'loading',
      rows: [],
    });

    loadIngredientData()
      .then((byMenuCode) => {
        if (!active) return;

        const rows = byMenuCode[menuCode];

        setIngredientState({
          status: 'success',
          rows: Array.isArray(rows) ? rows : [],
        });
      })
      .catch(() => {
        if (active) {
          setIngredientState({
            status: 'error',
            rows: [],
          });
        }
      });

    return () => {
      active = false;
    };
  }, [selectedMenu?.menuCode]);

  // 검색 버튼 또는 Enter 입력 시 검색
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchKeyword(keyword);
    setPage(1);
  };

  // 메뉴명, 메뉴 코드, 분류 검색
  const filteredMenus = menus.filter((menu) =>
    [
      menu.menuName?.replace(/"/g, ''),
      menu.menuCode,
      menu.mainCategory,
      menu.subCategory,
    ].some((value) =>
      (value ?? '')
        .toLowerCase()
        .includes(searchKeyword.trim().toLowerCase())
    )
  );

  // 페이지 계산
  const totalPages = Math.ceil(filteredMenus.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentMenus = filteredMenus.slice(
    startIndex,
    startIndex + pageSize
  );

  // 검색어 초기화
  const handleReset = () => {
    setKeyword('');
    setSearchKeyword('');
    setPage(1);
  };

  // 상세 보기 열기
  const handleOpenDetail = (menu) => {
    setIngredientState({
      status: 'loading',
      rows: [],
    });

    setSelectedMenu(menu);
  };

  return (
    <div className="menu-page">
      <header className="menu-header">
        <Link to="/" className="menu-logo">
          <span className="menu-logo-leaf">◆</span>
          MEAL<span>FIT</span>
        </Link>

        <nav className="menu-nav" aria-label="주요 메뉴">
          <Link to="/menus" className="menu-nav-active">
            메뉴 검색
          </Link>
          <Link to="/meal-plans">식단 관리</Link>
          <Link to="/prices">가격 예측</Link>
          <Link to="/budget">원가 · 예산</Link>
        </nav>

        <Link to="/" className="menu-home-link">
          메인으로 <span>↗</span>
        </Link>
      </header>

      <main className="menu-content">
        <section className="menu-intro">
          <p className="menu-eyebrow">
            MEALFIT SERVICES · MENU SEARCH
          </p>

          <h1>오늘의 메뉴를 찾아보세요.</h1>

          <p className="menu-description">
            메뉴명과 분류를 검색하고 원하는 메뉴의 상세 정보를 확인하세요.
          </p>
        </section>

        <section
          className="menu-search-panel"
          aria-label="메뉴 검색"
        >
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
                placeholder="메뉴명, 메뉴 코드, 분류를 검색하세요"
                value={keyword}
                onChange={(e) => {
                  const value = e.target.value;

                  setKeyword(value);

                  // 검색어를 모두 지우면 전체 메뉴 표시
                  if (!value.trim()) {
                    setSearchKeyword('');
                    setPage(1);
                  }
                }}
              />

              {keyword && (
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

        {error && (
          <p className="menu-message menu-error">
            {error}
          </p>
        )}

        {!error && (
          <>
            <div className="menu-results-header">
              <div>
                <p className="menu-section-label">
                  MENU COLLECTION
                </p>

                <h2>메뉴 목록</h2>
              </div>

              <p className="menu-result-count">
                검색 결과{' '}
                <strong>{filteredMenus.length}</strong>개
              </p>
            </div>

            {filteredMenus.length === 0 && (
              <p className="menu-message">
                검색 결과가 없습니다.
              </p>
            )}

            <div className="menu-grid">
              {currentMenus.map((menu) => (
                <article
                  className="menu-card"
                  key={menu.menuCode}
                >
                  <div className="menu-card-top">
                    <span className="menu-category">
                      {menu.mainCategory} / {menu.subCategory}
                    </span>

                    <span className="menu-card-code">
                      {menu.menuCode}
                    </span>
                  </div>

                  <h3>
                    {menu.menuName?.replace(/"/g, '')}
                  </h3>

                  <p className="menu-card-weight">
                    기준 중량{' '}
                    <strong>
                      {menu.weight ?? '-'}g
                    </strong>
                  </p>

                  <button
                    type="button"
                    className="menu-detail-button"
                    onClick={() => handleOpenDetail(menu)}
                  >
                    상세 보기 <span>→</span>
                  </button>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="menu-pagination">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                  disabled={page === 1}
                >
                  ← 이전
                </button>

                <span>
                  <strong>{page}</strong> / {totalPages} 페이지
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                  disabled={page === totalPages}
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedMenu && (
        <div
          className="menu-modal-overlay"
          onClick={() => setSelectedMenu(null)}
        >
          <section
            className="menu-modal"
            role="dialog"
            aria-modal="true"
            aria-label="메뉴 상세 정보"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-modal-header">
              <div>
                <p className="menu-section-label">
                  MENU DETAILS
                </p>

                <h2>메뉴 상세 정보</h2>
              </div>

              <button
                type="button"
                className="menu-modal-close"
                onClick={() => setSelectedMenu(null)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="menu-modal-info">
              <span className="menu-category">
                {selectedMenu.mainCategory} /{' '}
                {selectedMenu.subCategory}
              </span>

              <h3>
                {selectedMenu.menuName?.replace(/"/g, '')}
              </h3>

              <div className="menu-detail-row">
                <span>메뉴 코드</span>

                <strong>
                  {selectedMenu.menuCode}
                </strong>
              </div>

              <div className="menu-detail-row">
                <span>기준 중량</span>

                <strong>
                  {selectedMenu.weight != null
                    ? `${selectedMenu.weight}g`
                    : '정보 없음'}
                </strong>
              </div>
            </div>

            <div className="menu-modal-section">
              <div className="menu-modal-section-heading">
                <h3>식재료 및 사용량</h3>
                <span>중량 단위 확인 전</span>
              </div>

              <div className="menu-ingredient-table-wrap">
                <table className="menu-ingredient-table">
                  <thead>
                    <tr>
                      <th scope="col">식재료명</th>
                      <th scope="col">
                        사용량 (단위 확인 전)
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {ingredientState.status === 'loading' && (
                      <tr>
                        <td
                          colSpan={2}
                          className="menu-ingredient-empty"
                        >
                          불러오는 중
                        </td>
                      </tr>
                    )}

                    {ingredientState.status === 'error' && (
                      <tr>
                        <td
                          colSpan={2}
                          className="menu-ingredient-empty"
                          role="alert"
                        >
                          식재료 정보를 불러오지 못했습니다
                        </td>
                      </tr>
                    )}

                    {ingredientState.status === 'success' &&
                      ingredientState.rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="menu-ingredient-empty"
                          >
                            등록된 식재료가 없습니다
                          </td>
                        </tr>
                      )}

                    {ingredientState.status === 'success' &&
                      ingredientState.rows.map(
                        (ingredient, index) => (
                          <tr
                            key={`${ingredient.ingredient_food_Code}-${index}`}
                          >
                            <td>
                              {ingredient.ingredient_food_Nm}
                            </td>

                            <td>
                              {ingredient.ingredient_food_Wgh}
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="menu-total-price">
              <div>
                <p className="menu-total-label">
                  1인분 총 예상 원가
                </p>
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
  );
}