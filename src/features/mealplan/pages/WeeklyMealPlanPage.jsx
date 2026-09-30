import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMenus, getMyFacility, getWeeklyMealPlan, saveMealPlan } from '../api/mealPlanApi'
import { getMenuCostDetail } from '../../budget/api/costApi'
import { calculatePriceScore } from '../../budget/utils/budgetUtils'
import './WeeklyMealPlanPage.css'

const MEAL_TYPE_LABELS = {
  BREAKFAST: '조식',
  LUNCH: '중식',
  DINNER: '석식',
}

const FACILITY_TYPE_LABELS = {
  SCHOOL: '학교',
  COMPANY: '기업',
  HOSPITAL: '병원',
  ETC: '기타',
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER']

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getMonday(date = new Date()) {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day))
  return formatLocalDate(monday)
}

function addDays(dateString, amount) {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function normalizeMonday(dateString) {
  if (!dateString) return getMonday()
  const date = parseLocalDate(dateString)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return formatLocalDate(date)
}

function formatShortDate(dateString) {
  const date = parseLocalDate(dateString)
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return Number(value).toLocaleString()
}

function formatWeight(grams) {
  if (grams == null || Number.isNaN(Number(grams))) return '-'
  const g = Number(grams)
  if (g >= 1000) {
    return `${(g / 1000).toFixed(2)}kg`
  }
  return `${g.toFixed(1)}g`
}

function WeeklyMealPlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedWeekStart = normalizeMonday(searchParams.get('weekStartDate') || getMonday())

  const [plan, setPlan] = useState(null)
  const [facility, setFacility] = useState(null)
  const [facilityInfoError, setFacilityInfoError] = useState('')
  const [isFacilityInfoOpen, setIsFacilityInfoOpen] = useState(false)
  const [weeklyPriceSummary, setWeeklyPriceSummary] = useState(null)
  const [weeklyPriceLoading, setWeeklyPriceLoading] = useState(false)
  const [weeklyPriceError, setWeeklyPriceError] = useState('')
  const [allMenus, setAllMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // 식단 수정 사항 변경 추적 및 저장 로딩 상태
  const [hasChanges, setHasChanges] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // 식수 인원 (조/중/석식 공통)
  const [mealCount, setMealCount] = useState(100)

  // 선택된 메뉴 상태
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [ingredientDetails, setIngredientDetails] = useState(null)
  const [ingredientLoading, setIngredientLoading] = useState(false)
  const [ingredientError, setIngredientError] = useState('')
  const [weeklyIngredientUsage, setWeeklyIngredientUsage] = useState([])
  const [weeklyUsageLoading, setWeeklyUsageLoading] = useState(false)
  const [weeklyUsageError, setWeeklyUsageError] = useState('')
  const [isWeeklyUsageOpen, setIsWeeklyUsageOpen] = useState(false)
  const [expandedIngredientKey, setExpandedIngredientKey] = useState(null)

  // 메뉴 추천 모달 상태
  const [isRecommendOpen, setIsRecommendOpen] = useState(false)
  const [recommendedMenus, setRecommendedMenus] = useState([])
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [addMenuTarget, setAddMenuTarget] = useState(null)
  const [menuSearch, setMenuSearch] = useState('')
  const [menuLoadError, setMenuLoadError] = useState('')

  const highlightedIngredientMenuIds = useMemo(() => {
    if (!isWeeklyUsageOpen || expandedIngredientKey == null) return new Set()
    const ingredient = weeklyIngredientUsage.find((item) =>
      `${requestedWeekStart}:${item.ingredientId ?? item.ingredientName}` === expandedIngredientKey)
    return new Set((ingredient?.menuIds || []).map(String))
  }, [expandedIngredientKey, isWeeklyUsageOpen, requestedWeekStart, weeklyIngredientUsage])

  // 1. 전체 메뉴 목록 로드
  useEffect(() => {
    getMenus()
      .then(({ data }) => {
        setAllMenus(Array.isArray(data) ? data : [])
      })
      .catch((requestError) => {
        setMenuLoadError(requestError.response?.data?.message || 'DB 메뉴 목록을 불러오지 못했습니다.')
      })
  }, [])

  useEffect(() => {
    getMyFacility()
      .then(({ data }) => setFacility(data))
      .catch((requestError) => {
        setFacilityInfoError(requestError.response?.data?.message || '시설 가입 정보를 불러오지 못했습니다.')
      })
  }, [])

  // 메뉴 이름으로 메뉴 객체 찾기 맵
  const menuByName = useMemo(() => {
    return allMenus.reduce((acc, item) => {
      if (item.menuName) acc[item.menuName.trim()] = item
      return acc
    }, {})
  }, [allMenus])

  const menuById = useMemo(() => {
    return allMenus.reduce((acc, item) => {
      if (item.menuId != null) acc[item.menuId] = item
      return acc
    }, {})
  }, [allMenus])

  // 2. 주간 식단 데이터 로드
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setMessage('')
    setHasChanges(false)
    setSelectedMenu(null)
    setIngredientDetails(null)

    getWeeklyMealPlan(requestedWeekStart)
      .then(({ data }) => {
        if (!active) return
        setPlan(data)
        if (data?.mealCount) {
          setMealCount(data.mealCount)
        }
      })
      .catch((requestError) => {
        if (!active) return
        setPlan(null)
        setError(requestError.response?.data?.message || '해당 주의 식단을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [requestedWeekStart])

  // 일자별 끼니 그룹화
  const mealsByDate = useMemo(() => {
    return (plan?.meals || []).reduce((grouped, meal) => {
      if (!grouped[meal.mealDate]) grouped[meal.mealDate] = []
      grouped[meal.mealDate].push(meal)
      return grouped
    }, {})
  }, [plan])

  // 첫 번째 메뉴 자동 선택
  useEffect(() => {
    if (!selectedMenu && plan?.meals?.length) {
      for (const meal of plan.meals) {
        if (meal.menuItems?.length) {
          const first = meal.menuItems[0]
          handleSelectMenu({
            menuId: first.menuId,
            menuName: first.menuName,
            mealDate: meal.mealDate,
            mealType: meal.mealType,
          })
          break
        } else if (meal.menuName) {
          const firstMenuName = meal.menuName.split(',')[0].trim()
          handleSelectMenu({
            menuId: meal.menuId,
            menuName: firstMenuName,
            mealDate: meal.mealDate,
            mealType: meal.mealType,
          })
          break
        }
      }
    }
  }, [plan, allMenus])

  // 3. 선택된 메뉴의 식재료 및 중량 상세 조회
  const handleSelectMenu = (menuInfo) => {
    const targetName = menuInfo.menuName?.trim()
    const matched = (menuInfo.menuId && menuById[menuInfo.menuId]) ||
                    (targetName && menuByName[targetName]) ||
                    null

    const targetId = menuInfo.menuId || matched?.menuId

    setSelectedMenu({
      ...menuInfo,
      menuId: targetId,
      menuCode: matched?.menuCode,
      menuName: targetName || matched?.menuName || '선택된 메뉴',
      mainCategory: matched?.mainCategory || '일반',
      subCategory: matched?.subCategory || '',
      servingWeight: matched?.weight || matched?.servingWeight,
      energyKcal: matched?.energyKcal,
      proteinG: matched?.proteinG,
      fatG: matched?.fatG,
      carbohydrateG: matched?.carbohydrateG,
      sodiumMg: matched?.sodiumMg,
    })

    if (!targetId) {
      setIngredientDetails(null)
      setIngredientError('해당 메뉴의 상세 식재료 정보가 등록되어 있지 않습니다.')
      return
    }

    setIngredientLoading(true)
    setIngredientError('')
    getMenuCostDetail(targetId, { mealCount })
      .then((data) => {
        setIngredientDetails(data)
      })
      .catch((err) => {
        setIngredientDetails(null)
        setIngredientError(err.response?.data?.message || '식재료 구성 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        setIngredientLoading(false)
      })
  }

  // 식수인원 변경 시 식재료 비용/중량 재조회
  const handleMealCountChange = (newCount) => {
    const count = Math.max(1, Number(newCount) || 1)
    setMealCount(count)
    setHasChanges(true)
    if (selectedMenu?.menuId) {
      setIngredientLoading(true)
      getMenuCostDetail(selectedMenu.menuId, { mealCount: count })
        .then((data) => {
          setIngredientDetails(data)
        })
        .catch(() => {})
        .finally(() => {
          setIngredientLoading(false)
        })
    }
  }

  // 4. 메뉴 추천 기능
  const handleOpenRecommend = (excludedMenuIds = []) => {
    if (!allMenus.length) return
    const currentCategory = selectedMenu?.mainCategory || '부찬'
    const currentId = selectedMenu?.menuId
    const excludedIds = new Set(excludedMenuIds.map(String))
    const candidates = allMenus.filter((menu) => String(menu.menuId) !== String(currentId))
    const sameCategory = candidates.filter((menu) => menu.mainCategory === currentCategory)
    const preferredPool = sameCategory.length >= 3 ? sameCategory : candidates
    const unseenPreferred = preferredPool.filter((menu) => !excludedIds.has(String(menu.menuId)))
    const unseenOther = candidates.filter((menu) =>
      !excludedIds.has(String(menu.menuId)) && !unseenPreferred.includes(menu))
    const unseenMenus = [...unseenPreferred, ...unseenOther]
    const shuffled = (menus) => [...menus].sort(() => 0.5 - Math.random())
    const nextRecommendations = unseenMenus.length
      ? shuffled(unseenMenus).slice(0, 4)
      : shuffled(preferredPool).slice(0, 4)

    setRecommendedMenus(nextRecommendations)
    setIsRecommendOpen(true)
  }

  const handleOpenAddMenu = (mealDate, mealType) => {
    setAddMenuTarget({ mealDate, mealType })
    setMenuSearch('')
    setIsAddMenuOpen(true)
  }

  const handleAddMenu = (menu) => {
    if (!addMenuTarget || menu.menuId == null || !menu.menuName) return

    const targetMeal = plan?.meals?.find((meal) =>
      meal.mealDate === addMenuTarget.mealDate && meal.mealType === addMenuTarget.mealType)
    const existingItems = targetMeal?.menuItems?.length
      ? targetMeal.menuItems
      : (targetMeal?.menuName || '').split(',').filter(Boolean).map((menuName) => {
        const trimmedName = menuName.trim()
        return { menuId: menuByName[trimmedName]?.menuId, menuName: trimmedName }
      })
    if (existingItems.some((item) => String(item.menuId ?? menuByName[item.menuName?.trim()]?.menuId) === String(menu.menuId))) {
      setError('이미 해당 끼니에 추가된 메뉴입니다.')
      return
    }

    const menuItem = { menuId: Number(menu.menuId), menuName: menu.menuName }
    setPlan((previousPlan) => {
      const currentPlan = previousPlan || { weekStartDate: requestedWeekStart, meals: [] }
      let mealFound = false
      const meals = currentPlan.meals.map((meal) => {
        if (meal.mealDate !== addMenuTarget.mealDate || meal.mealType !== addMenuTarget.mealType) return meal
        mealFound = true
        const menuItems = [...(meal.menuItems || []), menuItem]
        return { ...meal, menuItems, menuName: menuItems.map((item) => item.menuName).join(', ') }
      })

      if (!mealFound) {
        meals.push({
          mealDate: addMenuTarget.mealDate,
          mealType: addMenuTarget.mealType,
          menuId: menuItem.menuId,
          menuName: menuItem.menuName,
          menuItems: [menuItem],
        })
      }
      return { ...currentPlan, meals }
    })

    setHasChanges(true)
    setError('')
    setMessage(`"${menu.menuName}" 메뉴를 추가했습니다. [식단 저장]을 누르면 DB에 반영됩니다.`)
    setIsAddMenuOpen(false)
    handleSelectMenu({
      menuId: menuItem.menuId,
      menuName: menuItem.menuName,
      mealDate: addMenuTarget.mealDate,
      mealType: addMenuTarget.mealType,
    })
  }

  // 추천 메뉴 선택 적용 (실제 plan state 내의 메뉴를 교체!)
  const handleApplyRecommendedMenu = (recMenu) => {
    if (!selectedMenu?.mealDate || !selectedMenu?.mealType) return

    const targetDate = selectedMenu.mealDate
    const targetType = selectedMenu.mealType
    const oldName = selectedMenu.menuName
    const targetMeal = plan?.meals?.find((meal) =>
      meal.mealDate === targetDate && meal.mealType === targetType)
    const currentItems = targetMeal?.menuItems?.length
      ? targetMeal.menuItems
      : (targetMeal?.menuName || '').split(',').filter(Boolean).map((menuName) => {
        const trimmedName = menuName.trim()
        return { menuId: menuByName[trimmedName]?.menuId, menuName: trimmedName }
      })
    const duplicatesExistingMenu = currentItems.some((item) => {
      const itemId = item.menuId ?? menuByName[item.menuName?.trim()]?.menuId
      const isSelectedItem = itemId != null && selectedMenu.menuId != null
        ? String(itemId) === String(selectedMenu.menuId)
        : item.menuName === oldName
      return !isSelectedItem && String(itemId) === String(recMenu.menuId)
    })
    if (duplicatesExistingMenu) {
      setError(`"${recMenu.menuName}" 메뉴가 이미 해당 끼니에 있습니다.`)
      return
    }

    setError('')
    setIsRecommendOpen(false)

    // plan.meals 복제 및 업데이트
    setPlan((prevPlan) => {
      if (!prevPlan?.meals) return prevPlan
      const updatedMeals = prevPlan.meals.map((meal) => {
        if (meal.mealDate === targetDate && meal.mealType === targetType) {
          // menuItems가 있는 경우
          let newMenuItems = []
          if (meal.menuItems?.length) {
            let replaced = false
            newMenuItems = meal.menuItems.map((item) => {
              if (!replaced && (item.menuName === oldName || item.menuId === selectedMenu.menuId)) {
                replaced = true
                return { menuId: recMenu.menuId, menuName: recMenu.menuName }
              }
              return item
            })
            if (!replaced) {
              newMenuItems = [{ menuId: recMenu.menuId, menuName: recMenu.menuName }]
            }
          } else {
            // menuName만 있는 경우
            const names = (meal.menuName || '').split(',').map((n) => n.trim())
            const newNames = names.map((n) => (n === oldName ? recMenu.menuName : n))
            newMenuItems = newNames.map((n) => ({
              menuName: n,
              menuId: n === recMenu.menuName ? recMenu.menuId : (menuByName[n]?.menuId || null),
            }))
          }

          const combinedNames = newMenuItems.map((i) => i.menuName).join(', ')

          return {
            ...meal,
            menuId: newMenuItems[0]?.menuId || recMenu.menuId,
            menuName: combinedNames,
            menuItems: newMenuItems,
          }
        }
        return meal
      })

      return {
        ...prevPlan,
        meals: updatedMeals,
      }
    })

    setHasChanges(true)
    setMessage(`"${oldName}" 메뉴가 "${recMenu.menuName}"(으)로 교체되었습니다. [식단 저장] 버튼을 누르면 DB에 영구 반영됩니다.`)

    // 교체된 메뉴로 선택 상태 업데이트
    handleSelectMenu({
      menuId: recMenu.menuId,
      menuName: recMenu.menuName,
      mealDate: targetDate,
      mealType: targetType,
    })
  }

  // 메뉴 ID 찾기 헬퍼 (ID 직결 -> 이름 매칭 -> 공백제거 매칭)
  const resolveMenuId = (name, fallbackId) => {
    if (fallbackId != null && !Number.isNaN(Number(fallbackId)) && menuById[Number(fallbackId)]) {
      return Number(fallbackId)
    }
    if (!name) return null
    const trimmed = String(name).trim()
    if (menuByName[trimmed]?.menuId != null) return Number(menuByName[trimmed].menuId)
    const clean = trimmed.replace(/\s+/g, '')
    const matched = allMenus.find((m) => (m.menuName || '').replace(/\s+/g, '') === clean)
    if (matched?.menuId != null) return Number(matched.menuId)
    return null
  }

  const weeklyMenuOccurrences = useMemo(() => {
    const occurrences = []
    for (const meal of plan?.meals || []) {
      const items = meal.menuItems?.length
        ? meal.menuItems
        : (meal.menuName ? meal.menuName.split(',').map((menuName) => ({ menuName: menuName.trim() })) : [])
      const seenMenuIds = new Set()

      items.forEach((item) => {
        const menuId = resolveMenuId(item.menuName, item.menuId ?? (items.length === 1 ? meal.menuId : null))
        if (menuId == null || seenMenuIds.has(menuId)) return
        seenMenuIds.add(menuId)
        occurrences.push({
          menuId,
          menuName: item.menuName || menuById[menuId]?.menuName || '',
          mealDate: meal.mealDate,
          mealType: MEAL_TYPES.includes(meal.mealType) ? meal.mealType : 'LUNCH',
        })
      })
    }
    return occurrences
  }, [plan, allMenus])

  useEffect(() => {
    let active = true
    const menuIds = [...new Set(weeklyMenuOccurrences.map((item) => item.menuId))]
    if (!menuIds.length) {
      setWeeklyPriceSummary(null)
      setWeeklyPriceError('')
      setWeeklyPriceLoading(false)
      return () => { active = false }
    }

    setWeeklyPriceLoading(true)
    setWeeklyPriceError('')
    Promise.allSettled(menuIds.map((menuId) => getMenuCostDetail(menuId, { mealCount: 1 })))
      .then((results) => {
        if (!active) return
        const costByMenuId = new Map()
        let failedCount = 0
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') {
            failedCount += 1
            return
          }
          const perPersonCostValue = result.value?.costPerPerson
          const perPersonCost = Number(perPersonCostValue)
          if (perPersonCostValue == null || !Number.isFinite(perPersonCost)) {
            failedCount += 1
            return
          }
          costByMenuId.set(menuIds[index], perPersonCost)
        })

        const mealSlotCount = new Set(weeklyMenuOccurrences.map((item) => `${item.mealDate}::${item.mealType}`)).size
        const attendeeCount = Math.max(1, Number(mealCount) || 1)
        const targetPerPerson = Number(facility?.targetFoodCost)
        const targetBudget = Number.isFinite(targetPerPerson) ? targetPerPerson * attendeeCount * mealSlotCount : null
        const actualCostPerPerson = weeklyMenuOccurrences.reduce(
          (sum, item) => sum + (costByMenuId.get(item.menuId) ?? 0),
          0
        )
        const actualCost = actualCostPerPerson * attendeeCount

        setWeeklyPriceSummary({
          actualCost,
          targetBudget,
          score: failedCount || targetBudget == null
            ? null
            : calculatePriceScore(actualCost, targetBudget),
          mealSlotCount,
          failedCount,
        })
        if (failedCount) {
          setWeeklyPriceError(`${failedCount}개 메뉴의 원가를 불러오지 못해 가격 점수를 계산할 수 없습니다.`)
        } else if (targetBudget == null) {
          setWeeklyPriceError('시설 가입 정보의 목표 식재료비가 없어 가격 점수를 계산할 수 없습니다.')
        }
      })
      .catch(() => {
        if (active) setWeeklyPriceError('주간 가격 점수를 계산하지 못했습니다.')
      })
      .finally(() => {
        if (active) setWeeklyPriceLoading(false)
      })

    return () => { active = false }
  }, [facility?.targetFoodCost, mealCount, weeklyMenuOccurrences])

  useEffect(() => {
    let active = true
    if (!isWeeklyUsageOpen) {
      return () => { active = false }
    }

    const menuIds = [...new Set(weeklyMenuOccurrences.map((item) => item.menuId))]
    if (!menuIds.length) {
      setWeeklyIngredientUsage([])
      setWeeklyUsageError('')
      setWeeklyUsageLoading(false)
      return () => { active = false }
    }

    setWeeklyIngredientUsage([])
    setWeeklyUsageError('')
    setWeeklyUsageLoading(true)

    Promise.allSettled(menuIds.map((menuId) => getMenuCostDetail(menuId, { mealCount: 1 })))
      .then((results) => {
        if (!active) return
        const detailsByMenuId = new Map()
        let failedCount = 0
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            detailsByMenuId.set(menuIds[index], result.value?.details || [])
          } else {
            failedCount += 1
          }
        })

        const usageByIngredient = new Map()
        weeklyMenuOccurrences.forEach(({ menuId, menuName, mealType }) => {
          const seenIngredients = new Set()
          for (const ingredient of detailsByMenuId.get(menuId) || []) {
            const key = ingredient.ingredientId ?? ingredient.ingredientName
            if (key == null || seenIngredients.has(key)) continue
            seenIngredients.add(key)

            if (!usageByIngredient.has(key)) {
              usageByIngredient.set(key, {
                ingredientId: ingredient.ingredientId,
                ingredientName: ingredient.ingredientName,
                ingredientCategory: ingredient.ingredientCategory,
                isPrimary: Boolean(ingredient.isPrimary),
                menuNames: new Set(),
                menuIds: new Set(),
                BREAKFAST: 0,
                LUNCH: 0,
                DINNER: 0,
                total: 0,
              })
            }
            const usage = usageByIngredient.get(key)
            usage.isPrimary = usage.isPrimary || Boolean(ingredient.isPrimary)
            if (menuName) usage.menuNames.add(menuName)
            usage.menuIds.add(menuId)
            usage[mealType] += 1
            usage.total += 1
          }
        })

        setWeeklyIngredientUsage([...usageByIngredient.values()]
          .map(({ menuNames, menuIds, ...ingredient }) => ({
            ...ingredient,
            menuNames: [...menuNames].sort((first, second) => first.localeCompare(second, 'ko')),
            menuIds: [...menuIds],
          }))
          .sort((first, second) =>
          second.total - first.total || first.ingredientName.localeCompare(second.ingredientName, 'ko')))
        if (failedCount) {
          setWeeklyUsageError(`${failedCount}개 메뉴의 식재료 정보를 불러오지 못해 해당 메뉴는 집계에서 제외했습니다.`)
        }
      })
      .catch(() => {
        if (active) setWeeklyUsageError('주간 식재료 사용 횟수를 계산하지 못했습니다.')
      })
      .finally(() => {
        if (active) setWeeklyUsageLoading(false)
      })

    return () => { active = false }
  }, [isWeeklyUsageOpen, weeklyMenuOccurrences])

  // 5. 주간 식단 변경사항 DB 저장
  const handleSaveWeeklyPlan = async () => {
    if (!plan?.meals?.length) {
      setError('저장할 식단 데이터가 없습니다.')
      return
    }

    setSaveLoading(true)
    setError('')
    setMessage('')

    try {
      // payload 구성
      const mealsPayload = []
      for (const meal of plan.meals) {
        const items = meal.menuItems?.length
          ? meal.menuItems
          : (meal.menuName ? meal.menuName.split(',').map((n) => ({ menuName: n.trim() })) : [])

        for (const item of items) {
          const menuId = resolveMenuId(item.menuName, item.menuId || meal.menuId)
          if (menuId == null) {
            throw new Error(`DB 메뉴 목록에서 "${item.menuName || '이름 없는 메뉴'}"를 찾을 수 없습니다.`)
          }
          mealsPayload.push({
            mealDate: meal.mealDate,
            mealType: meal.mealType || 'LUNCH',
            slot: 'OTHER',
            menuId,
          })
        }
      }

      const { data: savedPlan } = await saveMealPlan({
        weekStartDate: requestedWeekStart,
        mealCount: Number(mealCount),
        meals: mealsPayload,
      })

      if (savedPlan) {
        setPlan(savedPlan)
      } else {
        const { data: reloaded } = await getWeeklyMealPlan(requestedWeekStart)
        if (reloaded) setPlan(reloaded)
      }

      setHasChanges(false)
      setMessage('식단 변경사항이 DB에 성공적으로 저장되었습니다!')
    } catch (saveErr) {
      setError(saveErr.response?.data?.message || saveErr.message || '식단 저장에 실패했습니다.')
    } finally {
      setSaveLoading(false)
    }
  }

  const dates = Array.from({ length: 7 }, (_, index) => addDays(requestedWeekStart, index))

  // 총 합계 계산
  const totalIngredientWeight = useMemo(() => {
    if (!ingredientDetails?.details) return 0
    return ingredientDetails.details.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  }, [ingredientDetails])

  // 개별 메뉴 삭제 핸들러
  const handleDeleteMealItem = (mealDate, mealType, menuId, menuName) => {
    if (!window.confirm('이 메뉴를 해당 끼니에서 삭제하시겠습니까?')) return

    setPlan((previousPlan) => {
      if (!previousPlan?.meals) return previousPlan
      const meals = previousPlan.meals.map((meal) => {
        if (meal.mealDate !== mealDate || meal.mealType !== mealType) return meal
        const currentItems = meal.menuItems?.length
          ? meal.menuItems
          : (meal.menuName ? meal.menuName.split(',').map((name) => ({ menuName: name.trim() })) : [])
        const menuItems = currentItems.filter((item) => {
          if (menuId != null && item.menuId != null) return String(item.menuId) !== String(menuId)
          return item.menuName !== menuName
        })
        return {
          ...meal,
          menuId: menuItems[0]?.menuId || null,
          menuName: menuItems.map((item) => item.menuName).join(', '),
          menuItems,
        }
      })
      return { ...previousPlan, meals }
    })

    if (selectedMenu?.mealDate === mealDate && selectedMenu?.mealType === mealType &&
        (String(selectedMenu.menuId) === String(menuId) || selectedMenu.menuName === menuName)) {
      setSelectedMenu(null)
      setIngredientDetails(null)
      setIngredientError('')
    }
    setHasChanges(true)
    setError('')
    setMessage(`"${menuName}" 메뉴를 삭제했습니다. [식단 저장]을 누르면 DB에 반영됩니다.`)
  };

  return (
    <main className="weekly-meal-page">
      <header className="weekly-meal-header">
        <button type="button" className="text-button" onClick={() => navigate('/meal-plans')}>← 월간 식단</button>
        <strong>MEAL<span>FIT</span></strong>
        <span className="weekly-meal-label">WEEKLY MENU</span>
        <button type="button" className="text-button" onClick={() => navigate('/my-page')}>마이페이지</button>
      </header>

      <section className="weekly-meal-content">
        {/* 상단 헤더 및 주간 선택 컨트롤 */}
        <div className="weekly-meal-heading">
          <div>
            <p className="eyebrow">WEEKLY MENU</p>
            <h1>주간 메뉴 조회</h1>
            <p>{requestedWeekStart}부터 7일 동안 제공되는 끼니와 메뉴입니다.</p>
          </div>
          <div className="weekly-header-controls">
            <label className="weekly-meal-count-box">
              <span>식수 인원</span>
              <input
                type="number"
                min="1"
                value={mealCount}
                onChange={(e) => handleMealCountChange(e.target.value)}
                aria-label="공통 식수 인원"
              />
              <em>명</em>
            </label>
            <input
              aria-label="주 시작일"
              type="date"
              value={requestedWeekStart}
              onChange={(event) => navigate(`/meal-plans/weekly?weekStartDate=${event.target.value}`)}
            />
            <button
              type="button"
              className={`weekly-save-header-btn ${hasChanges ? 'has-changes' : ''}`}
              onClick={handleSaveWeeklyPlan}
              disabled={saveLoading || loading}
              title="식단 변경사항을 DB에 저장합니다"
            >
              {saveLoading ? '저장 중...' : (hasChanges ? '💾 식단 저장 (수정됨)' : '💾 식단 저장')}
            </button>
          </div>
        </div>

        {error && <div className="weekly-alert weekly-alert-error" role="alert"><p>{error}</p></div>}
        {menuLoadError && !allMenus.length && (
          <div className="weekly-alert weekly-alert-error" role="alert"><p>{menuLoadError}</p></div>
        )}
        {message && <div className="weekly-alert weekly-alert-success"><p>{message}</p></div>}
        {hasChanges && !message && (
          <div className="weekly-alert weekly-alert-warn">
            <p>💡 메뉴 또는 식수가 변경되었습니다. 변경 내용을 유지하려면 <strong>[식단 저장]</strong> 버튼을 눌러주세요.</p>
          </div>
        )}

        {loading && <p className="weekly-meal-state">주간 메뉴를 불러오는 중입니다.</p>}
        {!loading && error && !plan && (
          <div className="weekly-meal-state weekly-meal-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => navigate('/meal-plans')}>월간 식단으로 돌아가기</button>
          </div>
        )}

        {/* 주간 식단 그리드 보드 */}
        {!loading && (
          <>
            <section className="weekly-plan-insights" aria-label="주간 가격 점수 및 시설 정보">
              <div className="weekly-price-summary">
                <div className="weekly-price-score">
                  <span className="weekly-insight-label">주간 가격 점수</span>
                  <strong>
                    {weeklyPriceLoading ? '계산 중' : weeklyPriceSummary?.score == null ? '-' : `${weeklyPriceSummary.score.toFixed(1)}점`}
                  </strong>
                  <span className="weekly-score-caption">
                    {weeklyPriceSummary?.mealSlotCount
                      ? `${weeklyPriceSummary.mealSlotCount}개 끼니 · ${mealCount}명 기준`
                      : '주간 식단 메뉴 원가 기준'}
                  </span>
                </div>
                <div className="weekly-price-metrics">
                  <div>
                    <span>주간 예상 비용</span>
                    <strong>{weeklyPriceSummary ? `${formatNumber(weeklyPriceSummary.actualCost)}원` : '-'}</strong>
                  </div>
                  <div>
                    <span>주간 목표 예산</span>
                    <strong>{weeklyPriceSummary?.targetBudget == null ? '-' : `${formatNumber(weeklyPriceSummary.targetBudget)}원`}</strong>
                  </div>
                  <p>시설의 1인 목표 식재료비 × 식수 × 메뉴가 배정된 끼니 수를 기준으로 산출합니다.</p>
                </div>
              </div>
              {weeklyPriceError && <p className="weekly-price-error" role="status">{weeklyPriceError}</p>}

              <div className="weekly-facility-profile">
                <button
                  type="button"
                  className="weekly-facility-toggle"
                  aria-expanded={isFacilityInfoOpen}
                  aria-controls="weekly-facility-details"
                  onClick={() => setIsFacilityInfoOpen((isOpen) => !isOpen)}
                >
                  {isFacilityInfoOpen ? '시설 가입 정보 숨기기' : '시설 가입 정보 보기'}
                </button>
                {isFacilityInfoOpen && (
                  <div id="weekly-facility-details" className="weekly-facility-details">
                    {facilityInfoError ? (
                      <p className="weekly-price-error" role="alert">{facilityInfoError}</p>
                    ) : facility ? (
                      <>
                        <div><span>시설명</span><strong>{facility.name || '-'}</strong></div>
                        <div><span>시설 유형</span><strong>{FACILITY_TYPE_LABELS[facility.facilityType] || facility.facilityType || '-'}</strong></div>
                        <div><span>주소</span><strong>{facility.address || '-'}</strong></div>
                        <div><span>담당자</span><strong>{facility.contactName || '-'}</strong></div>
                        <div><span>기본 식수</span><strong>{facility.defaultMealCount ?? '-'}명</strong></div>
                        <div><span>조식 식수</span><strong>{facility.breakfastMealCount ?? '-'}명</strong></div>
                        <div><span>중식 식수</span><strong>{facility.lunchMealCount ?? '-'}명</strong></div>
                        <div><span>석식 식수</span><strong>{facility.dinnerMealCount ?? '-'}명</strong></div>
                        <div><span>1인 목표 식재료비</span><strong>{facility.targetFoodCost == null ? '-' : `${formatNumber(facility.targetFoodCost)}원`}</strong></div>
                      </>
                    ) : (
                      <p>시설 정보를 불러오는 중입니다.</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="weekly-meal-board" aria-label="주간 식단 목록">
              <div className="weekly-board-corner">구분</div>
              {dates.map((date) => (
                <div className="weekly-board-date" key={date}>
                  <strong>{formatShortDate(date)}</strong>
                  <span>{DAY_LABELS[parseLocalDate(date).getDay()]}요일</span>
                </div>
              ))}

              {MEAL_TYPES.map((mealType) => (
                <div className="weekly-board-row" key={mealType}>
                  <div className="weekly-board-meal-type">{MEAL_TYPE_LABELS[mealType]}</div>
                  {dates.map((date) => {
                    const dateMeals = mealsByDate && mealsByDate[date] ? mealsByDate[date] : [];
                    const meals = dateMeals.filter((meal) => meal && meal.mealType === mealType);
                    
                    return (
                      <div className="weekly-board-cell" key={`${mealType}-${date}`}>
                        {!meals.some((meal) => meal?.menuItems?.length || meal?.menuName) && (
                          <span className="weekly-empty-meal">-</span>
                        )}
                        {meals.map((meal, mealIdx) => {
                          const items = meal?.menuItems?.length
                            ? meal.menuItems
                            : (meal?.menuName ? meal.menuName.split(',').map((name) => ({ menuName: name.trim() })) : [])

                          return items.map((item, itemIdx) => {
                            const isSelected = selectedMenu &&
                              selectedMenu.mealDate === date &&
                              selectedMenu.mealType === mealType &&
                              selectedMenu.menuName === item?.menuName
                            const menuId = item?.menuId ?? menuByName[item?.menuName?.trim()]?.menuId
                            const isIngredientHighlighted = highlightedIngredientMenuIds.has(String(menuId))

                            return (
                              <div className="weekly-menu-chip-wrapper" key={`item-${date}-${mealIdx}-${itemIdx}`}>
                                <button
                                  type="button"
                                  className={`weekly-menu-chip ${isSelected ? 'selected' : ''} ${isIngredientHighlighted ? 'ingredient-highlighted' : ''}`}
                                  onClick={() => handleSelectMenu({
                                    menuId: item?.menuId,
                                    menuName: item?.menuName,
                                    mealDate: date,
                                    mealType,
                                  })}
                                  title={`${item?.menuName || ''} 식재료 및 중량 조회`}
                                >
                                  {item?.menuName}
                                </button>
                                <button
                                  type="button"
                                  className="weekly-menu-delete-btn"
                                  onClick={() => handleDeleteMealItem(date, mealType, item?.menuId, item?.menuName)}
                                  title={`${item?.menuName || '메뉴'} 삭제`}
                                  aria-label={`${item?.menuName || '메뉴'} 삭제`}
                                >
                                  ×
                                </button>
                              </div>
                            )
                          })
                        })}
                        <button
                          type="button"
                          className="weekly-add-menu-btn"
                          onClick={() => handleOpenAddMenu(date, mealType)}
                          disabled={!allMenus.length}
                          title="DB 메뉴 추가"
                          aria-label={`${date} ${MEAL_TYPE_LABELS[mealType]} 메뉴 추가`}
                        >
                          + 메뉴 추가
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>

            <div className="weekly-usage-toggle-row">
              <button
                type="button"
                className="weekly-usage-toggle-btn"
                aria-expanded={isWeeklyUsageOpen}
                aria-controls="weekly-ingredient-usage"
                onClick={() => setIsWeeklyUsageOpen((isOpen) => !isOpen)}
              >
                {isWeeklyUsageOpen ? '주간 식재료 사용 횟수 숨기기' : '주간 식재료 사용 횟수 보기'}
              </button>
            </div>

            {isWeeklyUsageOpen && (
            <section id="weekly-ingredient-usage" className="weekly-ingredient-usage" aria-label="주간 식재료 사용 횟수">
              <div className="weekly-usage-heading">
                <div>
                  <span className="ingredient-section-badge">MONDAY - SUNDAY</span>
                  <h2>주간 식재료 사용 횟수</h2>
                  <p>이번 주 식단 메뉴의 레시피에 포함된 횟수입니다. 한 끼에 여러 메뉴에서 사용되면 각각 집계합니다.</p>
                </div>
                {weeklyIngredientUsage.length > 0 && (
                  <span className="weekly-usage-total">식재료 {weeklyIngredientUsage.length}종</span>
                )}
              </div>

              {weeklyUsageLoading && (
                <p className="weekly-usage-state">주간 메뉴의 식재료 사용 횟수를 계산하고 있습니다.</p>
              )}
              {weeklyUsageError && <p className="weekly-usage-error" role="alert">{weeklyUsageError}</p>}
              {!weeklyUsageLoading && !weeklyIngredientUsage.length && !weeklyUsageError && (
                <p className="weekly-usage-state">집계할 주간 메뉴가 없습니다.</p>
              )}
              {weeklyIngredientUsage.length > 0 && (
                <div className="weekly-usage-table-wrap">
                  <table className="weekly-usage-table">
                    <thead>
                      <tr>
                        <th>식재료명</th>
                        <th>분류</th>
                        <th>조식</th>
                        <th>중식</th>
                        <th>석식</th>
                        <th>주간 합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyIngredientUsage.map((ingredient) => {
                        const ingredientKey = ingredient.ingredientId ?? ingredient.ingredientName
                        const expandedKey = `${requestedWeekStart}:${ingredientKey}`
                        const isExpanded = expandedIngredientKey === expandedKey
                        const toggleExpanded = () => setExpandedIngredientKey(isExpanded ? null : expandedKey)

                        return (
                          <Fragment key={ingredientKey}>
                            <tr
                              className={`weekly-usage-row${isExpanded ? ' expanded' : ''}`}
                              onClick={toggleExpanded}
                            >
                              <td>
                                <button
                                  type="button"
                                  className="weekly-usage-ingredient-toggle"
                                  aria-expanded={isExpanded}
                                  aria-controls={`weekly-usage-menus-${ingredientKey}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    toggleExpanded()
                                  }}
                                >
                                  <span>{isExpanded ? '−' : '+'}</span>
                                  <span className="ingredient-name-cell">
                                    <strong>{ingredient.ingredientName}</strong>
                                    {ingredient.isPrimary && <span className="primary-tag">주재료</span>}
                                  </span>
                                </button>
                              </td>
                              <td>{ingredient.ingredientCategory || '-'}</td>
                              <td>{ingredient.BREAKFAST || '-'}</td>
                              <td>{ingredient.LUNCH || '-'}</td>
                              <td>{ingredient.DINNER || '-'}</td>
                              <td><strong>{formatNumber(ingredient.total)}회</strong></td>
                            </tr>
                            {isExpanded && (
                              <tr className="weekly-usage-menu-row">
                                <td colSpan="6">
                                  <div id={`weekly-usage-menus-${ingredientKey}`}>
                                    <strong>{ingredient.ingredientName} 사용 메뉴</strong>
                                    {ingredient.menuNames.length ? (
                                      <ul>
                                        {ingredient.menuNames.map((menuName) => <li key={menuName}>{menuName}</li>)}
                                      </ul>
                                    ) : (
                                      <p>사용 메뉴명을 확인할 수 없습니다.</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            )}

            {/* 하단: 메뉴-식재료 연결·구성 중량 조회 영역 */}
            <section className="menu-ingredient-section" aria-label="메뉴 식재료 및 구성 중량 상세">
              <div className="ingredient-section-header">
                <div className="ingredient-title-area">
                  <div className="ingredient-badge-row">
                    <span className="ingredient-section-badge">식재료 구성 및 중량</span>
                    {selectedMenu?.mealDate && (
                      <span className="ingredient-date-badge">
                        {selectedMenu.mealDate} ({DAY_LABELS[parseLocalDate(selectedMenu.mealDate).getDay()]}) {MEAL_TYPE_LABELS[selectedMenu.mealType]}
                      </span>
                    )}
                  </div>
                  <h2>{selectedMenu ? selectedMenu.menuName : '메뉴를 클릭해 식재료와 중량을 확인하세요'}</h2>
                  <p className="ingredient-subtitle">
                    선택한 메뉴의 1인분 레시피 구성과 식수 인원({mealCount}명) 기준 총 소요 중량 정보입니다.
                  </p>
                </div>

                <div className="ingredient-actions">
                  <button
                    type="button"
                    className="action-recommend-btn"
                    onClick={() => handleOpenRecommend()}
                    disabled={!selectedMenu}
                  >
                    💡 메뉴 추천
                  </button>
                  <button
                    type="button"
                    className={`action-save-btn ${hasChanges ? 'has-changes' : ''}`}
                    onClick={handleSaveWeeklyPlan}
                    disabled={saveLoading}
                  >
                    {saveLoading ? '저장 중...' : '💾 식단 저장'}
                  </button>
                  <button
                    type="button"
                    className="action-search-btn"
                    onClick={() => navigate('/menus')}
                  >
                    🔍 메뉴 검색
                  </button>
                </div>
              </div>

              {/* 메뉴 요약 메트릭 카드 */}
              {selectedMenu && (
                <>
                  <div className="menu-spec-cards">
                    <div className="spec-card">
                      <span className="spec-label">메뉴 분류</span>
                      <strong className="spec-value">{selectedMenu.mainCategory || '일반'} {selectedMenu.subCategory ? `· ${selectedMenu.subCategory}` : ''}</strong>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">1인 표준 중량</span>
                      <strong className="spec-value">
                        {selectedMenu.servingWeight ? `${selectedMenu.servingWeight}g` : (totalIngredientWeight > 0 ? `${totalIngredientWeight.toFixed(1)}g` : '-')}
                      </strong>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">1인 예상 단가</span>
                      <strong className="spec-value text-emerald">
                        {ingredientDetails?.costPerPerson != null ? `${formatNumber(ingredientDetails.costPerPerson)}원` : '-'}
                      </strong>
                    </div>
                    <div className="spec-card highlight">
                      <span className="spec-label">총 소요 식재료비 ({mealCount}명)</span>
                      <strong className="spec-value text-emerald">
                        {ingredientDetails?.totalMealCost != null ? `${formatNumber(ingredientDetails.totalMealCost)}원` : '-'}
                      </strong>
                    </div>
                  </div>

                  {/* 영양 성분 정보 바 (DB 컬럼 매핑) */}
                  {(selectedMenu.energyKcal != null || selectedMenu.proteinG != null) && (
                    <div className="menu-nutrition-bar">
                      <span className="nutrition-label">1인 영양정보</span>
                      <div className="nutrition-chips">
                        {selectedMenu.energyKcal != null && (
                          <span className="nutrition-chip"><strong>열량</strong> {selectedMenu.energyKcal} kcal</span>
                        )}
                        {selectedMenu.carbohydrateG != null && (
                          <span className="nutrition-chip"><strong>탄수화물</strong> {selectedMenu.carbohydrateG}g</span>
                        )}
                        {selectedMenu.proteinG != null && (
                          <span className="nutrition-chip"><strong>단백질</strong> {selectedMenu.proteinG}g</span>
                        )}
                        {selectedMenu.fatG != null && (
                          <span className="nutrition-chip"><strong>지방</strong> {selectedMenu.fatG}g</span>
                        )}
                        {selectedMenu.sodiumMg != null && (
                          <span className="nutrition-chip"><strong>나트륨</strong> {selectedMenu.sodiumMg}mg</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 식재료 구성 테이블 */}
              {ingredientLoading && (
                <div className="ingredient-loading-box">
                  <div className="spinner" />
                  <p>식재료 구성 및 중량을 불러오는 중입니다...</p>
                </div>
              )}

              {!ingredientLoading && ingredientError && (
                <div className="ingredient-error-box">
                  <p>{ingredientError}</p>
                </div>
              )}

              {!ingredientLoading && !ingredientError && ingredientDetails?.details?.length > 0 && (
                <div className="ingredient-table-container">
                  <table className="ingredient-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>식재료명</th>
                        <th>식재료 분류</th>
                        <th>1인 기준 중량</th>
                        <th>총 필요 중량 ({mealCount}인)</th>
                        <th>기준 단가(1g당)</th>
                        <th>1인 소요액</th>
                        <th>총 예상 비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientDetails.details.map((ing, idx) => {
                        const singleQty = Number(ing.quantity || 0)
                        const totalQty = singleQty * mealCount
                        const unitPrice = Number(ing.standardUnitPrice || 0)
                        const singleCost = Number(ing.lineCost || singleQty * unitPrice)
                        const totalCost = singleCost * mealCount

                        return (
                          <tr key={ing.ingredientId || idx} className={ing.isPrimary ? 'primary-ingredient-row' : ''}>
                            <td className="col-center">{idx + 1}</td>
                            <td className="col-name">
                              <div className="ingredient-name-cell">
                                <strong>{ing.ingredientName}</strong>
                                {ing.isPrimary && <span className="primary-tag">주재료</span>}
                              </div>
                            </td>
                            <td className="col-center">
                              <span className="ing-cat-badge">{ing.ingredientCategory || '일반'}</span>
                            </td>
                            <td className="col-right">{formatWeight(singleQty)}</td>
                            <td className="col-right highlight-weight">{formatWeight(totalQty)}</td>
                            <td className="col-right">{unitPrice > 0 ? `${unitPrice.toFixed(2)}원/g` : '-'}</td>
                            <td className="col-right">{formatNumber(singleCost)}원</td>
                            <td className="col-right col-cost">{formatNumber(totalCost)}원</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className="col-total-label">합계 ({ingredientDetails.details.length}개 품목)</td>
                        <td className="col-right font-bold">{formatWeight(totalIngredientWeight)}</td>
                        <td className="col-right font-bold highlight-weight">{formatWeight(totalIngredientWeight * mealCount)}</td>
                        <td className="col-center">-</td>
                        <td className="col-right font-bold">{formatNumber(ingredientDetails.costPerPerson)}원</td>
                        <td className="col-right col-cost font-bold">{formatNumber(ingredientDetails.totalMealCost)}원</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {!ingredientLoading && !ingredientError && (!ingredientDetails || !ingredientDetails.details?.length) && selectedMenu && (
                <div className="ingredient-empty-box">
                  <p>등록된 식재료 정보가 없습니다.</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* 메뉴 추천 모달 팝업 */}
        {isRecommendOpen && (
          <div className="recommend-modal-backdrop" onClick={() => setIsRecommendOpen(false)}>
            <div className="recommend-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="recommend-modal-header">
                <div>
                  <span className="recommend-badge">AI ALTERNATIVE</span>
                  <h3>💡 메뉴 추천</h3>
                  <p className="recommend-desc">
                    현재 선택된 <strong>{selectedMenu?.menuName}</strong> 대신 사용할 수 있는 추천 메뉴입니다.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsRecommendOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="recommend-grid">
                {recommendedMenus.map((rec) => (
                  <div className="recommend-item-card" key={rec.menuId || rec.menuCode}>
                    <div className="recommend-item-top">
                      <span className="recommend-cat-badge">{rec.mainCategory || '일반'}</span>
                      {rec.weight && <span className="recommend-weight-badge">{rec.weight}g</span>}
                    </div>
                    <h4>{rec.menuName}</h4>
                    <p className="recommend-subtext">{rec.subCategory || '균형 잡힌 식단 추천 메뉴'}</p>
                    <button
                      type="button"
                      className="recommend-apply-btn"
                      onClick={() => handleApplyRecommendedMenu(rec)}
                    >
                      이 메뉴로 조회 및 교체
                    </button>
                  </div>
                ))}
              </div>
              {error && <p className="recommend-inline-error" role="alert">{error}</p>}
              {!recommendedMenus.length && (
                <p className="recommend-empty">추천할 수 있는 다른 메뉴가 없습니다.</p>
              )}

              <div className="recommend-modal-footer">
                <p>추천된 메뉴가 마음에 들지 않으신가요?</p>
                <div className="recommend-modal-actions">
                  <button
                    type="button"
                    className="search-nav-btn"
                    onClick={() => handleOpenRecommend(recommendedMenus.map((menu) => menu.menuId))}
                  >
                    다른 메뉴 추천
                  </button>
                  <button
                    type="button"
                    className="search-nav-btn"
                    onClick={() => {
                      setIsRecommendOpen(false)
                      navigate('/menus')
                    }}
                  >
                    전체 메뉴 검색
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddMenuOpen && (
          <div className="recommend-modal-backdrop" onClick={() => setIsAddMenuOpen(false)}>
            <section
              className="recommend-modal-card add-menu-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-menu-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="recommend-modal-header">
                <div>
                  <span className="recommend-badge">DB MENU</span>
                  <h3 id="add-menu-title">메뉴 추가</h3>
                  <p className="recommend-desc">
                    {addMenuTarget?.mealDate} {MEAL_TYPE_LABELS[addMenuTarget?.mealType]}에 추가할 메뉴를 선택하세요.
                  </p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setIsAddMenuOpen(false)} aria-label="닫기">
                  ✕
                </button>
              </div>

              <label className="add-menu-search-label">
                <span>메뉴 검색</span>
                <input
                  type="search"
                  value={menuSearch}
                  onChange={(event) => setMenuSearch(event.target.value)}
                  placeholder="메뉴명 또는 분류 검색"
                  autoFocus
                />
              </label>

              {menuLoadError ? (
                <p className="add-menu-empty" role="alert">{menuLoadError}</p>
              ) : (
                <div className="add-menu-list" aria-label="DB 메뉴 목록">
                  {allMenus
                    .filter((menu) => {
                      const query = menuSearch.trim().toLocaleLowerCase()
                      return !query || [menu.menuName, menu.mainCategory, menu.subCategory, menu.menuCode]
                        .some((value) => String(value || '').toLocaleLowerCase().includes(query))
                    })
                    .map((menu) => (
                      <button
                        type="button"
                        className="add-menu-option"
                        key={menu.menuId}
                        onClick={() => handleAddMenu(menu)}
                      >
                        <span>
                          <strong>{menu.menuName}</strong>
                          <small>{[menu.mainCategory, menu.subCategory].filter(Boolean).join(' · ') || '분류 없음'}</small>
                        </span>
                        <span className="add-menu-option-action">추가</span>
                      </button>
                    ))}
                  {!allMenus.length && <p className="add-menu-empty">DB에 등록된 메뉴가 없습니다.</p>}
                  {allMenus.length > 0 && !allMenus.some((menu) => {
                    const query = menuSearch.trim().toLocaleLowerCase()
                    return !query || [menu.menuName, menu.mainCategory, menu.subCategory, menu.menuCode]
                      .some((value) => String(value || '').toLocaleLowerCase().includes(query))
                  }) && <p className="add-menu-empty">검색 결과가 없습니다.</p>}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default WeeklyMealPlanPage

