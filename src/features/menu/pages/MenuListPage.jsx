
import { useEffect, useState } from 'react';
import api from '../../../api/axios';

export default function MenuListPage() {
  // 메뉴 목록, 검색어, 페이지, 오류 상태 관리
  const [menus, setMenus] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [selectedMenu, setSelectedMenu] = useState(null);

  // 한 페이지에 표시할 메뉴 수
  const pageSize = 40;

  // 메뉴 목록 조회
  useEffect(() => {
    api.get('/api/menus')
      .then((response) => setMenus(response.data))
      .catch(() => setError('메뉴를 불러오지 못했습니다.'));
  }, []);

  // 검색 버튼 또는 Enter 입력 시 검색 적용
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
      (value ?? '').toLowerCase().includes(searchKeyword.trim().toLowerCase())
    )
  );

  // 전체 페이지 수와 현재 페이지 메뉴
  const totalPages = Math.ceil(filteredMenus.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentMenus = filteredMenus.slice(startIndex, startIndex + pageSize);

  // 검색어 초기화
  const handleReset = () => {
    setKeyword('');
    setSearchKeyword('');
    setPage(1);
  };

  return (
    <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>메뉴 검색 및 상세 선택</h1>

      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: '8px', margin: '24px 0' }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
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
            style={{
              width: '100%',
              padding: '12px 36px 12px 12px',
              boxSizing: 'border-box',
            }}
          />

          {keyword && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="검색어 지우기"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ×
            </button>
          )}
        </div>

        <button type="submit" style={{ padding: '12px 20px' }}>
          검색
        </button>
      </form>

      {error && <p>{error}</p>}

      {!error && (
        <>
          <p>검색 결과: {filteredMenus.length}개</p>

          {filteredMenus.length === 0 && (
            <p>검색 결과가 없습니다.</p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
              marginTop: '20px',
            }}
          >
            {currentMenus.map((menu) => (
              <article
                key={menu.menuCode}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3>{menu.menuName?.replace(/"/g, '')}</h3>
                <p>{menu.mainCategory} / {menu.subCategory}</p>
                <p>중량: {menu.weight ?? '-'}g</p>

                <button
                  type="button"
                  onClick={() => setSelectedMenu(menu)}
                >
                  상세 보기
                </button>
              </article>
            ))}
          </div>

          {selectedMenu && (
            <section
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '24px',
              }}
            >
              <h2>메뉴 상세 정보</h2>
              <p>메뉴명: {selectedMenu.menuName?.replace(/"/g, '')}</p>
              <p>메뉴 코드: {selectedMenu.menuCode}</p>
              <p>분류: {selectedMenu.mainCategory} / {selectedMenu.subCategory}</p>
              <p>중량: {selectedMenu.weight ?? '-'}g</p>

              <button
                type="button"
                onClick={() => setSelectedMenu(null)}
              >
                닫기
              </button>
            </section>
          )}

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginTop: '32px',
              }}
            >
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page === 1}
              >
                이전
              </button>

              <span>{page} / {totalPages} 페이지</span>

              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page === totalPages}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}