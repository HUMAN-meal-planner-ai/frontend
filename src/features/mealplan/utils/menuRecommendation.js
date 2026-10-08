import { calculatePriceScore } from '../../budget/utils/budgetUtils.js'

// RECO-006 종합 추천 점수 가중치 (값이 없는 항목은 제외하고 나머지 가중치를 재정규화한다)
export const RECOMMENDATION_WEIGHTS = {
  price: 0.3,
  nutrition: 0.15,
  fit: 0.15,
  diversity: 0.3,
  preference: 0.1,
}

// RECO-001 가격 적합 점수 구성 가중치
const PRICE_WEIGHTS = { cost: 0.5, rise: 0.25, risk: 0.25 }

// RECO-004 주간 다양성 점수 구성 가중치와 반복 1회당 감점
const DIVERSITY_WEIGHTS = { menu: 0.5, ingredient: 0.3, cooking: 0.2 }
const DIVERSITY_PENALTY = { menu: 25, ingredient: 10, cooking: 10 }

// 상승률 1%p당 감점. 20% 이상 오르면 상승률 점수는 0점이다.
const RISE_PENALTY_PER_PERCENT = 5

const COOKING_METHOD_PATTERNS = [
  ['볶음', /볶음|볶이|잡채/],
  ['조림', /조림/],
  ['구이', /구이|불고기|스테이크/],
  ['튀김', /튀김|까스|가스|커틀릿|강정|너겟|탕수/],
  ['찜', /찜/],
  ['국·탕', /(국|탕|찌개|전골)$/],
  ['무침', /무침|나물|겉절이|샐러드/],
  ['전·부침', /전$|부침|지짐/],
  ['면', /면|국수|우동|파스타/],
  ['김치·절임', /김치|깍두기|장아찌|피클/],
  ['밥·죽', /밥|죽/],
]

// 목표의 절반에도 못 미치는 원가는 단가 누락 가능성이 커서 신뢰하기 어렵다.
export const LOW_COST_RATIO = 0.5

export function isLowCostReliability(cost, target) {
  return isFiniteNumber(cost) && isFiniteNumber(target) && Number(target) > 0 &&
    Number(cost) / Number(target) < LOW_COST_RATIO
}

// 주간 식단 재구성 시 동일 메뉴·주재료 반복 상한
export const MAX_MENU_REPEAT_PER_WEEK = 2
export const MAX_PRIMARY_INGREDIENT_USES_PER_WEEK = 4

const clampScore = (value) => Math.max(0, Math.min(100, value))
const isFiniteNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value))

function weightedAverage(entries) {
  let weightSum = 0
  let total = 0
  entries.forEach(([score, weight]) => {
    if (score == null) return
    weightSum += weight
    total += score * weight
  })
  return weightSum === 0 ? null : total / weightSum
}

const roundOrNull = (value) => (value == null ? null : Math.round(value))

export function detectCookingMethod(menuName) {
  const name = (menuName || '').trim()
  const matched = COOKING_METHOD_PATTERNS.find(([, pattern]) => pattern.test(name))
  return matched ? matched[0] : null
}

/**
 * 메뉴별 주재료와 조리법 프로필을 만든다.
 * 주재료는 원가 상세에서 isPrimary로 표시된 식재료이며, 표시가 없으면 원가가 가장 큰 식재료를 사용한다.
 */
export function buildMenuProfiles(menus, menuCosts) {
  const detailsByMenuId = new Map(
    (menuCosts || []).map((cost) => [String(cost.menuId), cost.details || []]),
  )
  const profiles = {}

  ;(menus || []).forEach((menu) => {
    const details = detailsByMenuId.get(String(menu.menuId)) || []
    let primary = details.filter((detail) => detail.isPrimary)
    if (!primary.length && details.length) {
      primary = [details.reduce((top, detail) =>
        Number(detail.lineCost || 0) > Number(top.lineCost || 0) ? detail : top)]
    }
    const primaryNames = {}
    primary.forEach((detail) => {
      primaryNames[String(detail.ingredientId ?? detail.ingredientName)] = detail.ingredientName
    })
    profiles[String(menu.menuId)] = {
      primaryNames,
      primaryIngredients: primary
        .map((detail) => String(detail.ingredientId ?? detail.ingredientName))
        .filter((key) => key !== 'undefined'),
      cookingMethod: detectCookingMethod(menu.menuName),
    }
  })

  return profiles
}

// RECO-001: 예상 단가·상승률·위험도로 가격 적합 점수(0~100)를 계산한다.
export function calculatePriceFitScore({
  costPerPerson,
  futureCostPerPerson,
  increaseRate,
  riskScore,
  targetCost,
}) {
  const expectedCost = isFiniteNumber(futureCostPerPerson) && Number(futureCostPerPerson) > 0
    ? Number(futureCostPerPerson)
    : costPerPerson
  const hasTarget = isFiniteNumber(targetCost) && Number(targetCost) > 0
  const hasCost = isFiniteNumber(expectedCost) && Number(expectedCost) > 0

  let costScore = hasTarget && hasCost
    ? calculatePriceScore(Number(expectedCost), Number(targetCost))
    : null
  if (costScore != null && isLowCostReliability(expectedCost, targetCost)) {
    costScore = 50 + (Number(expectedCost) / Number(targetCost) / LOW_COST_RATIO) * 50
  }
  const riseScore = isFiniteNumber(increaseRate)
    ? clampScore(100 - Math.max(0, Number(increaseRate)) * RISE_PENALTY_PER_PERCENT)
    : null
  const riskComponent = isFiniteNumber(riskScore)
    ? clampScore(100 - Number(riskScore))
    : null

  return weightedAverage([
    [costScore, PRICE_WEIGHTS.cost],
    [riseScore, PRICE_WEIGHTS.rise],
    [riskComponent, PRICE_WEIGHTS.risk],
  ])
}

// 여러 메뉴(한 끼·한 주)의 원가·예상 원가·위험도를 하나의 가격 입력값으로 합친다.
export function aggregatePriceInputs(items) {
  const known = items.filter((item) => isFiniteNumber(item.costPerPerson))
  if (!known.length) return null
  const costPerPerson = known.reduce((sum, item) => sum + Number(item.costPerPerson), 0)
  const futureCostPerPerson = known.reduce((sum, item) =>
    sum + (isFiniteNumber(item.futureCostPerPerson) && Number(item.futureCostPerPerson) > 0
      ? Number(item.futureCostPerPerson) : Number(item.costPerPerson)), 0)
  const risked = known.filter((item) => isFiniteNumber(item.riskScore))
  const riskWeight = risked.reduce((sum, item) => sum + Number(item.costPerPerson), 0)
  return {
    costPerPerson,
    futureCostPerPerson,
    increaseRate: costPerPerson > 0 ? ((futureCostPerPerson - costPerPerson) / costPerPerson) * 100 : null,
    riskScore: risked.length && riskWeight > 0
      ? risked.reduce((sum, item) => sum + Number(item.riskScore) * Number(item.costPerPerson), 0) / riskWeight
      : null,
  }
}

function countOccurrences(occurrences, predicate) {
  return occurrences.reduce((count, occurrence) => (predicate(occurrence) ? count + 1 : count), 0)
}

// RECO-004: 동일 메뉴·주재료·조리법의 주간 반복 정도로 다양성 점수(0~100)를 계산한다.
export function calculateDiversityDetail(menu, weeklyMenuOccurrences, menuProfiles = {}) {
  const occurrences = weeklyMenuOccurrences || []
  const profile = menuProfiles[String(menu.menuId)]

  const menuCount = countOccurrences(occurrences, ({ menuId }) => String(menuId) === String(menu.menuId))
  const menuScore = clampScore(100 - menuCount * DIVERSITY_PENALTY.menu)

  let ingredientScore = null
  let ingredientCount = 0
  if (profile?.primaryIngredients?.length) {
    ingredientCount = Math.max(...profile.primaryIngredients.map((ingredient) =>
      countOccurrences(occurrences, ({ menuId }) =>
        (menuProfiles[String(menuId)]?.primaryIngredients || []).includes(ingredient))))
    ingredientScore = clampScore(100 - ingredientCount * DIVERSITY_PENALTY.ingredient)
  }

  let cookingScore = null
  let cookingCount = 0
  if (profile?.cookingMethod) {
    cookingCount = countOccurrences(occurrences, ({ menuId }) =>
      menuProfiles[String(menuId)]?.cookingMethod === profile.cookingMethod)
    cookingScore = clampScore(100 - cookingCount * DIVERSITY_PENALTY.cooking)
  }

  return {
    score: weightedAverage([
      [menuScore, DIVERSITY_WEIGHTS.menu],
      [ingredientScore, DIVERSITY_WEIGHTS.ingredient],
      [cookingScore, DIVERSITY_WEIGHTS.cooking],
    ]),
    menuCount,
    ingredientCount,
    cookingCount,
  }
}

const NUTRIENT_FIELDS = ['energyKcal', 'proteinG', 'fatG', 'carbohydrateG']

// 교체 대상 메뉴와 영양 구성이 비슷할수록 높다. 나트륨은 기준보다 높을 때만 감점한다.
export function calculateNutritionScore(menu, referenceMenu) {
  if (!referenceMenu) return null
  const deviations = []

  NUTRIENT_FIELDS.forEach((field) => {
    if (!isFiniteNumber(menu[field]) || !isFiniteNumber(referenceMenu[field]) || Number(referenceMenu[field]) <= 0) return
    deviations.push(Math.abs(Number(menu[field]) - Number(referenceMenu[field])) / Number(referenceMenu[field]))
  })
  if (isFiniteNumber(menu.sodiumMg) && isFiniteNumber(referenceMenu.sodiumMg) && Number(referenceMenu.sodiumMg) > 0) {
    deviations.push(Math.max(0, Number(menu.sodiumMg) - Number(referenceMenu.sodiumMg)) / Number(referenceMenu.sodiumMg))
  }
  if (!deviations.length) return null

  const averageDeviation = deviations.reduce((sum, value) => sum + value, 0) / deviations.length
  return clampScore(100 - averageDeviation * 100)
}

// 교체 대상 메뉴와 같은 슬롯·분류일수록 해당 자리에 적합하다고 본다.
export function calculateSlotFitScore(menu, referenceMenu) {
  if (!referenceMenu) return null
  const sameMain = menu.mainCategory && menu.mainCategory === referenceMenu.mainCategory
  const sameSub = menu.subCategory && menu.subCategory === referenceMenu.subCategory
  const sameSlot = menu.slot && menu.slot === referenceMenu.slot

  if (sameMain && sameSub) return 100
  if (sameMain) return 80
  if (sameSlot) return 60
  return 20
}

// 사용자가 수락·거절한 이력으로 선호도를 계산한다. 이력이 없으면 중립(50점)이다.
export function calculatePreferenceScore(menuId, preferences = {}) {
  const history = preferences[String(menuId)] || {}
  return clampScore(50 + (history.accepted || 0) * 15 - (history.rejected || 0) * 10)
}

// RECO-006: 가격·영양·적합성·다양성·선호도 점수를 가중합해 최종 점수를 계산한다.
export function calculateRecommendationScore(scores, weights = RECOMMENDATION_WEIGHTS) {
  return roundOrNull(weightedAverage([
    [scores.price, weights.price],
    [scores.nutrition, weights.nutrition],
    [scores.fit, weights.fit],
    [scores.diversity, weights.diversity],
    [scores.preference, weights.preference],
  ]))
}

// 주재료별 주간 사용 횟수(메뉴 편성 횟수 기준)를 센다.
export function countPrimaryIngredientUses(occurrences, menuProfiles = {}) {
  const uses = new Map()
  ;(occurrences || []).forEach(({ menuId }) => {
    const profile = menuProfiles[String(menuId)]
    ;(profile?.primaryIngredients || []).forEach((key) => {
      const entry = uses.get(key) || { count: 0, name: profile.primaryNames?.[key] || key }
      entry.count += 1
      uses.set(key, entry)
    })
  })
  return uses
}

// 후보 메뉴를 추가하면 주간 반복 상한을 넘는지 확인한다.
export function exceedsWeeklyLimits(menu, occurrences, menuProfiles = {}) {
  const menuCount = countOccurrences(occurrences || [], ({ menuId }) => String(menuId) === String(menu.menuId))
  if (menuCount >= MAX_MENU_REPEAT_PER_WEEK) return true
  const primaries = menuProfiles[String(menu.menuId)]?.primaryIngredients || []
  if (!primaries.length) return false
  const uses = countPrimaryIngredientUses(occurrences, menuProfiles)
  return primaries.some((key) => (uses.get(key)?.count || 0) >= MAX_PRIMARY_INGREDIENT_USES_PER_WEEK)
}

// 주 단위로 변경이 필요한 메뉴(가격 위험·동일 메뉴 반복·주재료 과다 사용)를 찾는다.
export function findMenusNeedingChange(occurrences, menuProfiles = {}, menuRisks = {}) {
  const list = occurrences || []
  const menuCounts = new Map()
  list.forEach(({ menuId }) => menuCounts.set(String(menuId), (menuCounts.get(String(menuId)) || 0) + 1))
  const ingredientUses = countPrimaryIngredientUses(list, menuProfiles)

  return list
    .map((occurrence) => {
      const reasons = []
      const types = new Set()
      const risk = menuRisks[occurrence.menuId] || menuRisks[String(occurrence.menuId)]
      if (risk?.riskLevel === 'WARNING') { reasons.push('가격 위험'); types.add('risk') }
      else if (risk?.riskLevel === 'CAUTION') { reasons.push('가격 주의'); types.add('risk') }

      const repeat = menuCounts.get(String(occurrence.menuId)) || 0
      if (repeat > MAX_MENU_REPEAT_PER_WEEK) {
        reasons.push(`동일 메뉴 주 ${repeat}회 (최대 ${MAX_MENU_REPEAT_PER_WEEK}회)`)
        types.add('menuRepeat')
      }

      const profile = menuProfiles[String(occurrence.menuId)]
      ;(profile?.primaryIngredients || []).forEach((key) => {
        const entry = ingredientUses.get(key)
        if (entry && entry.count > MAX_PRIMARY_INGREDIENT_USES_PER_WEEK) {
          reasons.push(`${entry.name} 주 ${entry.count}회 (최대 ${MAX_PRIMARY_INGREDIENT_USES_PER_WEEK}회)`)
          types.add('ingredientRepeat')
        }
      })
      return { ...occurrence, reasons, types: [...types] }
    })
    .filter((item) => item.reasons.length)
}

export function rankMenusByDuplicationAvoidance(menus, weeklyMenuOccurrences, menuProfiles = {}) {
  return menus
    .map((menu) => {
      const detail = calculateDiversityDetail(menu, weeklyMenuOccurrences, menuProfiles)
      return {
        ...menu,
        weeklyOccurrenceCount: detail.menuCount,
        weeklyIngredientCount: detail.ingredientCount,
        weeklyCookingCount: detail.cookingCount,
        duplicationAvoidanceScore: Math.round(detail.score),
      }
    })
    .sort((first, second) =>
      second.duplicationAvoidanceScore - first.duplicationAvoidanceScore ||
      first.weeklyOccurrenceCount - second.weeklyOccurrenceCount ||
      (first.menuName || '').localeCompare(second.menuName || '', 'ko'))
}

/**
 * options
 * - menuRisks: 메뉴별 위험도 응답(riskScore, increaseRate, futureCostPerPerson)
 * - menuProfiles: buildMenuProfiles 결과. 주간 식단에 편성된 메뉴의 프로필도 포함해야 한다.
 * - replacedMenu: 교체 대상 메뉴(영양·적합성 비교 기준)
 * - preferences: 메뉴 선호 이력
 */
export function rankMenusForRecommendation(menus, weeklyMenuOccurrences, menuCosts, targetCost, options = {}) {
  const { menuRisks, menuProfiles, replacedMenu, preferences } = options
  const withinLimits = (menus || []).filter((menu) =>
    !exceedsWeeklyLimits(menu, weeklyMenuOccurrences, menuProfiles))
  const frequencyRanked = rankMenusByDuplicationAvoidance(
    withinLimits.length ? withinLimits : menus,
    weeklyMenuOccurrences,
    menuProfiles,
  )
  const costByMenuId = new Map(
    (menuCosts || []).map((item) => [String(item.menuId), Number(item.costPerPerson)]),
  )
  const riskByMenuId = new Map((menuRisks || []).map((item) => [String(item.menuId), item]))

  return frequencyRanked
    .map((menu) => {
      const costPerPerson = costByMenuId.get(String(menu.menuId))
      const hasCost = Number.isFinite(costPerPerson) && costPerPerson > 0
      const risk = riskByMenuId.get(String(menu.menuId))

      const priceScore = roundOrNull(calculatePriceFitScore({
        costPerPerson: hasCost ? costPerPerson : null,
        futureCostPerPerson: risk?.futureCostPerPerson,
        increaseRate: risk?.increaseRate,
        riskScore: risk?.riskScore,
        targetCost,
      }))
      const nutritionScore = roundOrNull(calculateNutritionScore(menu, replacedMenu))
      const fitScore = roundOrNull(calculateSlotFitScore(menu, replacedMenu))
      const preferenceScore = calculatePreferenceScore(menu.menuId, preferences)

      return {
        ...menu,
        costPerPerson: hasCost ? costPerPerson : null,
        riskLevel: risk?.riskLevel ?? null,
        increaseRate: isFiniteNumber(risk?.increaseRate) ? Number(risk.increaseRate) : null,
        priceScore,
        nutritionScore,
        fitScore,
        preferenceScore,
        recommendationScore: calculateRecommendationScore({
          price: priceScore,
          nutrition: nutritionScore,
          fit: fitScore,
          diversity: menu.duplicationAvoidanceScore,
          preference: preferenceScore,
        }),
      }
    })
    .sort((first, second) =>
      second.recommendationScore - first.recommendationScore ||
      second.duplicationAvoidanceScore - first.duplicationAvoidanceScore ||
      first.weeklyOccurrenceCount - second.weeklyOccurrenceCount ||
      (first.menuName || '').localeCompare(second.menuName || '', 'ko'))
}




const MEAL_ORDER = { BREAKFAST: 0, LUNCH: 1, DINNER: 2 }
const occurrenceOrder = (a, b) =>
  String(a.mealDate).localeCompare(String(b.mealDate)) || (MEAL_ORDER[a.mealType] ?? 9) - (MEAL_ORDER[b.mealType] ?? 9)

/**
 * 주간 식단 재구성: 변경이 필요한 메뉴(가격 위험·반복 초과)만 교체하고 나머지는 유지한다.
 * 반복 초과는 가장 이른 편성을 유지하고 뒤쪽 편성부터 교체한다.
 * options: menuRisks(맵), menuProfiles, menuById, preferences
 * 반환: { changes, keeps, unresolved }
 */
export function buildWeeklyReconstruction(occurrences, menus, menuCosts, targetCost, options = {}) {
  const { menuRisks = {}, menuProfiles = {}, menuById = {}, preferences } = options
  const riskyIds = new Set(
    Object.values(menuRisks)
      .filter((risk) => risk?.riskLevel === 'WARNING' || risk?.riskLevel === 'CAUTION')
      .map((risk) => String(risk.menuId)),
  )
  const working = [...(occurrences || [])].sort(occurrenceOrder)
  const flagged = findMenusNeedingChange(working, menuProfiles, menuRisks).sort(occurrenceOrder)
  const changes = []
  const unresolved = []

  for (let i = flagged.length - 1; i >= 0; i -= 1) {
    const target = flagged[i]
    const index = working.findIndex((item) =>
      item.menuId === target.menuId && item.mealDate === target.mealDate && item.mealType === target.mealType)
    if (index < 0) continue

    const stillFlagged = findMenusNeedingChange(working, menuProfiles, menuRisks).find((item) =>
      item.menuId === target.menuId && item.mealDate === target.mealDate && item.mealType === target.mealType)
    if (!stillFlagged) continue

    const remaining = working.filter((_, idx) => idx !== index)
    const sameSlotIds = new Set(remaining
      .filter((item) => item.mealDate === target.mealDate && item.mealType === target.mealType)
      .map((item) => String(item.menuId)))
    const original = menuById[target.menuId] || { menuId: target.menuId, menuName: target.menuName }
    const pool = (menus || []).filter((menu) =>
      String(menu.menuId) !== String(target.menuId) && !sameSlotIds.has(String(menu.menuId)) && !riskyIds.has(String(menu.menuId)))
    const sameCategory = pool.filter((menu) => original.mainCategory && menu.mainCategory === original.mainCategory)

    const ranked = rankMenusForRecommendation(
      sameCategory.length ? sameCategory : pool,
      remaining,
      menuCosts,
      targetCost,
      { menuRisks: Object.values(menuRisks), menuProfiles, replacedMenu: original, preferences },
    )
    const candidates = ranked.filter((menu) => !exceedsWeeklyLimits(menu, remaining, menuProfiles))
    const best = candidates[0]
    if (!best) {
      unresolved.push(stillFlagged)
      continue
    }

    working[index] = { ...target, menuId: best.menuId, menuName: best.menuName }
    changes.push({
      mealDate: target.mealDate,
      mealType: target.mealType,
      from: { menuId: target.menuId, menuName: target.menuName },
      to: best,
      alternatives: candidates.slice(0, 5),
      reasons: stillFlagged.reasons,
    })
  }

  changes.sort(occurrenceOrder)
  return { changes, keeps: (occurrences || []).length - changes.length, unresolved }
}
