const STORAGE_KEY = 'mealfit.menuPreference'

const getStorage = (storage) => storage ?? (typeof localStorage === 'undefined' ? null : localStorage)

export function loadMenuPreferences(storage) {
  try {
    const raw = getStorage(storage)?.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function update(preferences, menuIds, field, storage) {
  const next = { ...preferences }
  menuIds.forEach((menuId) => {
    const key = String(menuId)
    next[key] = { accepted: 0, rejected: 0, ...next[key], }
    next[key][field] += 1
  })
  try {
    getStorage(storage)?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 저장소를 쓸 수 없어도 추천 기능은 계속 동작한다.
  }
  return next
}

export const recordMenuAccepted = (preferences, menuId, storage) =>
  update(preferences, [menuId], 'accepted', storage)

export const recordMenusRejected = (preferences, menuIds, storage) =>
  update(preferences, menuIds, 'rejected', storage)
