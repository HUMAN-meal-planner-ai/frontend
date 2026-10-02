import { calculatePriceScore } from '../../budget/utils/budgetUtils.js'

export function rankMenusByDuplicationAvoidance(menus, weeklyMenuOccurrences) {
  const occurrenceCounts = new Map()

  weeklyMenuOccurrences.forEach(({ menuId }) => {
    const key = String(menuId)
    occurrenceCounts.set(key, (occurrenceCounts.get(key) || 0) + 1)
  })

  return menus
    .map((menu) => {
      const weeklyOccurrenceCount = occurrenceCounts.get(String(menu.menuId)) || 0
      return {
        ...menu,
        weeklyOccurrenceCount,
        duplicationAvoidanceScore: Math.max(0, 100 - weeklyOccurrenceCount * 10),
      }
    })
    .sort((first, second) =>
      second.duplicationAvoidanceScore - first.duplicationAvoidanceScore ||
      first.weeklyOccurrenceCount - second.weeklyOccurrenceCount ||
      (first.menuName || '').localeCompare(second.menuName || '', 'ko'))
}

export function rankMenusForRecommendation(menus, weeklyMenuOccurrences, menuCosts, targetCost) {
  const frequencyRanked = rankMenusByDuplicationAvoidance(menus, weeklyMenuOccurrences)
  const hasTargetCost = Number.isFinite(Number(targetCost)) && Number(targetCost) > 0
  const costByMenuId = new Map(
    (menuCosts || []).map((item) => [String(item.menuId), Number(item.costPerPerson)]),
  )

  return frequencyRanked
    .map((menu) => {
      const costPerPerson = costByMenuId.get(String(menu.menuId))
      const hasCost = Number.isFinite(costPerPerson) && costPerPerson > 0
      const budgetFitScore = hasTargetCost
        ? hasCost ? calculatePriceScore(costPerPerson, Number(targetCost)) : 0
        : null
      const recommendationScore = budgetFitScore == null
        ? menu.duplicationAvoidanceScore
        : Math.round((menu.duplicationAvoidanceScore + budgetFitScore) / 2)

      return {
        ...menu,
        costPerPerson: hasCost ? costPerPerson : null,
        budgetFitScore,
        recommendationScore,
      }
    })
    .sort((first, second) =>
      second.recommendationScore - first.recommendationScore ||
      second.duplicationAvoidanceScore - first.duplicationAvoidanceScore ||
      first.weeklyOccurrenceCount - second.weeklyOccurrenceCount ||
      (first.menuName || '').localeCompare(second.menuName || '', 'ko'))
}