import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWeeklyReconstruction,
  exceedsWeeklyLimits,
  findMenusNeedingChange,
  rankMenusForRecommendation as rankForLimits,
  aggregatePriceInputs,
  buildMenuProfiles,
  calculateDiversityDetail,
  calculateNutritionScore,
  calculatePreferenceScore,
  calculatePriceFitScore,
  calculateRecommendationScore,
  calculateSlotFitScore,
  detectCookingMethod,
  rankMenusForRecommendation,
} from './menuRecommendation.js'

test('RECO-001 가격 점수: 목표 이내·낮은 상승률·낮은 위험도면 높다', () => {
  const good = calculatePriceFitScore({ costPerPerson: 800, futureCostPerPerson: 800, increaseRate: 0, riskScore: 0, targetCost: 1000 })
  const bad = calculatePriceFitScore({ costPerPerson: 800, futureCostPerPerson: 1500, increaseRate: 20, riskScore: 90, targetCost: 1000 })
  assert.ok(good > bad)
  assert.ok(good >= 90)
})

test('RECO-001 상승률과 위험도가 점수에 반영된다', () => {
  const base = { costPerPerson: 800, targetCost: 1000 }
  const calm = calculatePriceFitScore({ ...base, increaseRate: 0, riskScore: 0 })
  assert.ok(calm > calculatePriceFitScore({ ...base, increaseRate: 10, riskScore: 0 }))
  assert.ok(calm > calculatePriceFitScore({ ...base, increaseRate: 0, riskScore: 60 }))
})

test('RECO-001 데이터가 없으면 null, 일부만 있으면 있는 항목으로 계산', () => {
  assert.equal(calculatePriceFitScore({ targetCost: 1000 }), null)
  assert.equal(calculatePriceFitScore({ increaseRate: 0, riskScore: 0 }), 100)
})

test('RECO-004 동일 메뉴·주재료·조리법 반복이 감점된다', () => {
  const menus = [
    { menuId: 1, menuName: '소고기볶음' },
    { menuId: 2, menuName: '돼지볶음' },
    { menuId: 3, menuName: '두부조림' },
  ]
  const costs = [
    { menuId: 1, details: [{ ingredientId: 10, isPrimary: true }] },
    { menuId: 2, details: [{ ingredientId: 11, isPrimary: true }] },
    { menuId: 3, details: [{ ingredientId: 12, isPrimary: true }] },
  ]
  const profiles = buildMenuProfiles(menus, costs)
  const week = [{ menuId: 1 }, { menuId: 1 }]
  const same = calculateDiversityDetail(menus[0], week, profiles)
  const sameCooking = calculateDiversityDetail(menus[1], week, profiles)
  const different = calculateDiversityDetail(menus[2], week, profiles)
  assert.equal(same.menuCount, 2)
  assert.equal(same.ingredientCount, 2)
  assert.equal(sameCooking.menuCount, 0)
  assert.equal(sameCooking.cookingCount, 2)
  assert.equal(different.score, 100)
  assert.ok(same.score < sameCooking.score && sameCooking.score < different.score)
})

test('조리법 판별과 주재료 폴백', () => {
  assert.equal(detectCookingMethod('김치찌개'), '국·탕')
  assert.equal(detectCookingMethod('제육볶음'), '볶음')
  assert.equal(detectCookingMethod('???'), null)
  const profiles = buildMenuProfiles([{ menuId: 1, menuName: 'a' }], [
    { menuId: 1, details: [{ ingredientId: 1, lineCost: 10 }, { ingredientId: 2, lineCost: 90 }] },
  ])
  assert.deepEqual(profiles['1'].primaryIngredients, ['2'])
})

test('영양·적합성·선호도 점수', () => {
  const ref = { energyKcal: 200, proteinG: 10, fatG: 5, carbohydrateG: 30, sodiumMg: 300, mainCategory: 'A', subCategory: 'x', slot: 's' }
  assert.equal(calculateNutritionScore({ ...ref }, ref), 100)
  assert.ok(calculateNutritionScore({ ...ref, energyKcal: 400 }, ref) < 100)
  assert.equal(calculateNutritionScore(ref, null), null)
  assert.equal(calculateSlotFitScore(ref, ref), 100)
  assert.equal(calculateSlotFitScore({ ...ref, subCategory: 'y' }, ref), 80)
  assert.equal(calculateSlotFitScore({ mainCategory: 'B', slot: 's' }, ref), 60)
  assert.equal(calculateSlotFitScore({ mainCategory: 'B', slot: 't' }, ref), 20)
  assert.equal(calculatePreferenceScore(1, {}), 50)
  assert.equal(calculatePreferenceScore(1, { 1: { accepted: 2, rejected: 0 } }), 80)
  assert.equal(calculatePreferenceScore(1, { 1: { accepted: 0, rejected: 9 } }), 0)
})

test('RECO-006 종합 점수는 가중합이며 없는 항목은 재정규화', () => {
  assert.equal(calculateRecommendationScore({ price: 100, nutrition: 100, fit: 100, diversity: 100, preference: 100 }), 100)
  assert.equal(calculateRecommendationScore({ price: 100, nutrition: 0, fit: 0, diversity: 0, preference: 0 }), 30)
  assert.equal(calculateRecommendationScore({ price: null, nutrition: null, fit: null, diversity: 80, preference: 80 }), 80)
  assert.equal(calculateRecommendationScore({}), null)
})

test('종합 점수로 후보를 정렬한다', () => {
  const ref = { menuId: 0, mainCategory: 'A', subCategory: 'x', slot: 's', energyKcal: 200 }
  const menus = [
    { menuId: 1, menuName: '가', mainCategory: 'A', subCategory: 'x', slot: 's', energyKcal: 200 },
    { menuId: 2, menuName: '나', mainCategory: 'B', subCategory: 'y', slot: 't', energyKcal: 900 },
  ]
  const ranked = rankMenusForRecommendation(menus, [{ menuId: 1 }], [
    { menuId: 1, costPerPerson: 900 }, { menuId: 2, costPerPerson: 900 },
  ], 1000, {
    menuRisks: [{ menuId: 1, riskScore: 0, increaseRate: 0 }, { menuId: 2, riskScore: 80, increaseRate: 15 }],
    replacedMenu: ref,
    preferences: { 2: { accepted: 0, rejected: 3 } },
  })
  assert.equal(ranked.length, 2)
  ranked.forEach((m) => assert.ok(Number.isInteger(m.recommendationScore)))
  assert.equal(ranked[0].menuId, 1)
  assert.ok(ranked[0].recommendationScore > ranked[1].recommendationScore)
  assert.equal(ranked[1].riskLevel, null)
})

test('RECO-001 원가가 목표의 절반 미만이면 비용 점수를 낮춘다(신뢰도)', () => {
  const normal = calculatePriceFitScore({ costPerPerson: 800, targetCost: 1000 })
  const low = calculatePriceFitScore({ costPerPerson: 100, targetCost: 1000 })
  assert.equal(normal, 100)
  assert.ok(low < 70)
})

test('가격 입력 집계: 원가 합·상승률·원가가중 위험도', () => {
  const agg = aggregatePriceInputs([
    { costPerPerson: 100, futureCostPerPerson: 120, riskScore: 20 },
    { costPerPerson: 300, riskScore: 60 },
    { costPerPerson: null },
  ])
  assert.equal(agg.costPerPerson, 400)
  assert.equal(agg.futureCostPerPerson, 420)
  assert.equal(Math.round(agg.increaseRate * 10) / 10, 5)
  assert.equal(agg.riskScore, 50)
  assert.equal(aggregatePriceInputs([]), null)
})


const limitProfiles = {
  1: { primaryIngredients: ['pork'], primaryNames: { pork: '돼지고기' } },
  2: { primaryIngredients: ['pork'], primaryNames: { pork: '돼지고기' } },
  3: { primaryIngredients: ['egg'], primaryNames: { egg: '계란' } },
}

test('동일 메뉴가 주 2회에 도달하면 추가를 제한한다', () => {
  const occ = [{ menuId: 3 }, { menuId: 3 }]
  assert.equal(exceedsWeeklyLimits({ menuId: 3 }, occ, limitProfiles), true)
  assert.equal(exceedsWeeklyLimits({ menuId: 1 }, occ, limitProfiles), false)
})

test('주재료가 주 4회에 도달하면 같은 주재료 메뉴 추가를 제한한다', () => {
  const occ = [{ menuId: 1 }, { menuId: 1 }, { menuId: 2 }, { menuId: 2 }]
  assert.equal(exceedsWeeklyLimits({ menuId: 1 }, occ, limitProfiles), true)
  assert.equal(exceedsWeeklyLimits({ menuId: 3 }, occ, limitProfiles), false)
})

test('추천 후보에서 반복 상한을 넘는 메뉴를 제외한다', () => {
  const occ = [{ menuId: 3 }, { menuId: 3 }]
  const ranked = rankForLimits([{ menuId: 3, menuName: 'a' }, { menuId: 1, menuName: 'b' }], occ, [], null, { menuProfiles: limitProfiles })
  assert.deepEqual(ranked.map((menu) => menu.menuId), [1])
})

test('변경 필요 메뉴를 사유와 함께 찾는다', () => {
  const occ = [
    { menuId: 3, mealDate: 'd1', mealType: 'LUNCH', menuName: 'a' },
    { menuId: 3, mealDate: 'd2', mealType: 'LUNCH', menuName: 'a' },
    { menuId: 3, mealDate: 'd3', mealType: 'LUNCH', menuName: 'a' },
    { menuId: 1, mealDate: 'd4', mealType: 'LUNCH', menuName: 'b' },
  ]
  const result = findMenusNeedingChange(occ, limitProfiles, { 1: { riskLevel: 'WARNING' } })
  assert.equal(result.length, 4)
  assert.ok(result[0].reasons[0].includes('동일 메뉴 주 3회'))
  assert.deepEqual(result[3].reasons, ['가격 위험'])
})

test('주간 재구성: 위험·반복 초과 메뉴만 교체하고 이른 편성은 유지한다', () => {
  const occ = [
    { menuId: 3, mealDate: '2026-10-05', mealType: 'LUNCH', menuName: 'a' },
    { menuId: 3, mealDate: '2026-10-06', mealType: 'LUNCH', menuName: 'a' },
    { menuId: 3, mealDate: '2026-10-07', mealType: 'LUNCH', menuName: 'a' },
    { menuId: 9, mealDate: '2026-10-08', mealType: 'LUNCH', menuName: 'risky' },
    { menuId: 4, mealDate: '2026-10-09', mealType: 'LUNCH', menuName: 'ok' },
  ]
  const menus = [
    { menuId: 3, menuName: 'a' }, { menuId: 9, menuName: 'risky' }, { menuId: 4, menuName: 'ok' },
    { menuId: 5, menuName: 'new1' }, { menuId: 6, menuName: 'new2' },
  ]
  const profiles = { 3: { primaryIngredients: ['egg'] }, 9: { primaryIngredients: ['x'] }, 4: { primaryIngredients: ['y'] },
    5: { primaryIngredients: ['z'] }, 6: { primaryIngredients: ['w'] } }
  const result = buildWeeklyReconstruction(occ, menus, [], null, {
    menuRisks: { 9: { menuId: 9, riskLevel: 'WARNING' } },
    menuProfiles: profiles,
  })
  assert.equal(result.changes.length, 2)
  assert.equal(result.keeps, 3)
  assert.deepEqual(result.changes.map((change) => change.from.menuId), [3, 9])
  assert.ok(result.changes.every((change) => [5, 6].includes(change.to.menuId)))
})
