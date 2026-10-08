import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMenuPreferences, recordMenuAccepted, recordMenusRejected } from './menuPreference.js'

const fakeStorage = () => {
  const data = {}
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v } }
}

test('수락·거절 이력이 저장되고 다시 로드된다', () => {
  const storage = fakeStorage()
  let prefs = loadMenuPreferences(storage)
  assert.deepEqual(prefs, {})
  prefs = recordMenuAccepted(prefs, 1, storage)
  prefs = recordMenusRejected(prefs, [1, 2], storage)
  assert.deepEqual(loadMenuPreferences(storage), { 1: { accepted: 1, rejected: 1 }, 2: { accepted: 0, rejected: 1 } })
})

test('손상된 저장값은 빈 객체로 처리', () => {
  const storage = { getItem: () => '{bad', setItem() {} }
  assert.deepEqual(loadMenuPreferences(storage), {})
})
