import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllMenuCosts, getMenuCostDetail } from '../api/costApi';
import './BudgetAnalysisPage.css';

export default function BudgetAnalysisPage() {
  // 백엔드 CostController의 @RequestParam 대응 상태 (mealCount, targetCost)
  const [mealCount, setMealCount] = useState(100);
  const [targetCost, setTargetCost] = useState(2500);

  // 백엔드 응답 데이터 상태
  const [menuCosts, setMenuCosts] = useState([]); // GET /api/cost/menus 응답
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null); // GET /api/cost/menus/{menuId} 응답

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. [GET /api/cost/menus] 전체 메뉴 목록 및 원가 일괄 조회
  const fetchAllCosts = useCallback(async (count = mealCount, target = targetCost) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMenuCosts({ mealCount: count, targetCost: target });
      setMenuCosts(data || []);
      if (data && data.length > 0) {
        // 첫 진입 시 첫 번째 메뉴 또는 초과된 메뉴의 단건 상세 API 호출
        const initialMenu = data.find((m) => m.isExceeded) || data[0];
        setSelectedMenuId(initialMenu.menuId);
        fetchMenuDetail(initialMenu.menuId, count, target);
      } else {
        setSelectedMenuId(null);
        setSelectedMenuDetail(null);
      }
    } catch (err) {
      console.error('[GET /api/cost/menus] 호출 실패:', err);
      setError(
        err.response?.data?.message ||
        '원가 데이터를 불러오지 못했습니다. 백엔드 서버 상태를 확인해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  }, [mealCount, targetCost]);

  // 2. [GET /api/cost/menus/{menuId}] 메뉴별 원가 계산 결과 및 식재료 상세 단건 조회
  const fetchMenuDetail = useCallback(async (menuId, count = mealCount, target = targetCost) => {
    if (!menuId) return;
    setDetailLoading(true);
    try {
      const detailData = await getMenuCostDetail(menuId, { mealCount: count, targetCost: target });
      setSelectedMenuDetail(detailData);
    } catch (err) {
      console.error(`[GET /api/cost/menus/${menuId}] 호출 실패:`, err);
    } finally {
      setDetailLoading(false);
    }
  }, [mealCount, targetCost]);

  useEffect(() => {
    fetchAllCosts();
  }, []);

  // 메뉴 행 클릭 핸들러
  const handleSelectMenu = (menuId) => {
    setSelectedMenuId(menuId);
    fetchMenuDetail(menuId, mealCount, targetCost);
  };

  // '다시 계산' 버튼 또는 조건 변경 시 백엔드 재호출
  const handleRecalculate = () => {
    fetchAllCosts(mealCount, targetCost);
  };

  // 상단 요약 지표 계산
  const summary = useMemo(() => {
    if (!menuCosts || menuCosts.length === 0) {
      return { totalCurrentCost: 0, totalTargetCost: 0, totalExceeded: 0 };
    }

    const totalCurrentCost = menuCosts.reduce(
      (sum, m) => sum + (Number(m.totalMealCost) || 0),
      0
    );
    const totalTargetCost = menuCosts.reduce(
      (sum, m) => sum + (Number(m.targetCost || targetCost) * (m.mealCount || mealCount)),
      0
    );
    const totalExceeded = menuCosts.reduce(
      (sum, m) => sum + (Number(m.exceededAmount) || 0) * (m.mealCount || mealCount),
      0
    );

    return { totalCurrentCost, totalTargetCost, totalExceeded };
  }, [menuCosts, targetCost, mealCount]);

  // 금액 포맷터 (원 단위 / 만원 단위)
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0원';
    const num = Number(val);
    if (num >= 10000) {
      const man = Math.round(num / 10000);
      return `${man.toLocaleString()}만원`;
    }
    return `${Math.round(num).toLocaleString()}원`;
  };

  const formatWon = (val) => {
    if (val === undefined || val === null) return '0원';
    return `${Math.round(Number(val)).toLocaleString()}원`;
  };

  // 버튼 클릭 핸들러
  const handleEditMealPlan = () => {
    alert('식단 수정 화면으로 이동합니다.');
  };

  const handleAlternativeMenu = () => {
    if (selectedMenuDetail) {
      alert(`[${selectedMenuDetail.menuName}]에 대한 대체 추천 메뉴를 검색합니다.`);
    } else {
      alert('대체 메뉴 추천을 진행합니다.');
    }
  };

  const handleConfirmReview = () => {
    alert('예산 및 원가 분석 검토가 완료되었습니다.');
  };

  return (
    <div className="budget-page">
      {/* 1. 타이틀 & 조건 컨트롤 헤더 */}
      <section className="budget-header-section">
        <h2 className="title">예상 원가 및 예산 위험 분석</h2>
        <div className="header-meta-row">
          <div className="param-control-group">
            <label className="param-label">
              <span>식수 인원:</span>
              <input
                type="number"
                min="1"
                className="param-input"
                value={mealCount}
                onChange={(e) => setMealCount(Number(e.target.value) || 1)}
              />
              <span className="unit">명</span>
            </label>
            <label className="param-label">
              <span>1인 목표 단가:</span>
              <input
                type="number"
                min="0"
                step="100"
                className="param-input"
                value={targetCost}
                onChange={(e) => setTargetCost(Number(e.target.value) || 0)}
              />
              <span className="unit">원</span>
            </label>
            <button
              type="button"
              className="apply-param-btn"
              onClick={handleRecalculate}
            >
              조건 적용
            </button>
          </div>
          <p className="sub-info">
            분석 메뉴: 총 {menuCosts.length}개 / 회당 {mealCount}명 기준
          </p>
        </div>
      </section>

      {/* 로딩 & 에러 처리 */}
      {loading && (
        <div className="budget-loading-box">
          <div className="spinner" />
          <p>백엔드 API(/api/cost/menus)에서 원가 분석 데이터를 불러오는 중입니다...</p>
        </div>
      )}

      {error && !loading && (
        <div className="budget-error-box">
          <p className="error-text">⚠️ {error}</p>
          <button type="button" className="retry-btn" onClick={() => fetchAllCosts()}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 2. 지표 요약 카드 (3종) */}
          <section className="card-container">
            <div className="summary-card">
              <span className="card-label">현재가 총비용</span>
              <span className="card-value">
                {formatCurrency(summary.totalCurrentCost)}
              </span>
            </div>
            <div className="summary-card">
              <span className="card-label">목표/예측가 총비용</span>
              <span className="card-value">
                {formatCurrency(summary.totalTargetCost)}
              </span>
            </div>
            <div className={`summary-card alert ${summary.totalExceeded > 0 ? 'exceeded' : ''}`}>
              <span className="badge-v1">
                {summary.totalExceeded > 0 ? '초과 주의' : '안정'}
              </span>
              <span className="card-label">예산 초과액</span>
              <span className="card-value highlight">
                {summary.totalExceeded > 0
                  ? formatCurrency(summary.totalExceeded)
                  : '0원 (예산 내 운영)'}
              </span>
            </div>
          </section>

          {/* 3. 영향 메뉴 테이블 (GET /api/cost/menus 매핑) */}
          <section className="table-section">
            <div className="table-header-desc">
              <span className="section-subtitle">메뉴별 원가 분석 현황</span>
              <span className="section-hint">※ 메뉴를 클릭하면 해당 메뉴의 단건 상세 API(/api/cost/menus/{'{menuId}'})를 호출하여 세부 계산식을 표출합니다.</span>
            </div>
            <table className="impact-table">
              <thead>
                <tr>
                  <th>메뉴 ID</th>
                  <th>메뉴명</th>
                  <th>1인분 원가</th>
                  <th>총 예상 원가({mealCount}명)</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {menuCosts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row">
                      등록된 메뉴 및 원가 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  menuCosts.map((item) => {
                    const isSelected = selectedMenuId === item.menuId;
                    return (
                      <tr
                        key={item.menuId}
                        className={`clickable-row ${isSelected ? 'row-selected' : ''}`}
                        onClick={() => handleSelectMenu(item.menuId)}
                      >
                        <td>#{item.menuId}</td>
                        <td className="menu-name-cell">
                          <strong>{item.menuName}</strong>
                        </td>
                        <td>{formatWon(item.costPerPerson)}</td>
                        <td>{formatWon(item.totalMealCost)}</td>
                        <td
                          className={`status-cell ${
                            item.isExceeded ? 'danger' : 'success'
                          }`}
                        >
                          {item.isExceeded
                            ? `예산 초과 (+${formatWon(item.exceededAmount)})`
                            : '적정'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          {/* 4. 세부 단가 계산식 (GET /api/cost/menus/{menuId} 매핑) */}
          <section className="calculation-formula-section">
            <div className="formula-header">
              <strong>
                [세부 단가 계산식] {selectedMenuDetail ? `${selectedMenuDetail.menuName} (메뉴 #${selectedMenuDetail.menuId})` : '메뉴 선택'}
              </strong>
              {selectedMenuDetail && (
                <span className="formula-total">
                  1인분 원가 합계: <strong>{formatWon(selectedMenuDetail.costPerPerson)}</strong>
                  {selectedMenuDetail.isExceeded && (
                    <span className="exceeded-badge"> (목표 {formatWon(selectedMenuDetail.targetCost)} 초과)</span>
                  )}
                </span>
              )}
            </div>

            {detailLoading ? (
              <div className="detail-loading">상세 식재료 데이터를 불러오는 중...</div>
            ) : (
              <div className="formula-content-box">
                {selectedMenuDetail && selectedMenuDetail.details && selectedMenuDetail.details.length > 0 ? (
                  <div className="formula-list">
                    {selectedMenuDetail.details.map((detail, idx) => (
                      <div key={detail.ingredientId || idx} className="formula-item">
                        <span className="ingredient-name">{detail.ingredientName}</span>
                        <span className="formula-math">
                          {Number(detail.quantity).toLocaleString()}g × {Number(detail.standardUnitPrice).toLocaleString()}원/g
                        </span>
                        <span className="equals">=</span>
                        <span className="line-cost">{formatWon(detail.lineCost)}</span>
                        <span className="unit-label">/ 1인분</span>
                        {detail.priceDate && (
                          <span className="price-date">(기준일: {detail.priceDate})</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="formula-empty">
                    {selectedMenuDetail
                      ? '해당 메뉴에 등록된 식재료 구성 정보가 없습니다.'
                      : '메뉴를 선택해 주세요.'}
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* 5. 하단 액션 버튼 그룹 */}
      <section className="action-button-group">
        <button
          type="button"
          className="action-btn btn-outline"
          onClick={handleEditMealPlan}
        >
          식단 수정
        </button>
        <button
          type="button"
          className="action-btn btn-outline"
          onClick={handleRecalculate}
        >
          다시 계산
        </button>
        <button
          type="button"
          className="action-btn btn-outline"
          onClick={handleAlternativeMenu}
        >
          대체 메뉴
        </button>
        <button
          type="button"
          className="action-btn btn-primary"
          onClick={handleConfirmReview}
        >
          확정 검토
        </button>
      </section>
    </div>
  );
}