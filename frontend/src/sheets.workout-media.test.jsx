// @vitest-environment happy-dom
// A logged workout's photos and videos in its detail sheet and the history row: a picked file
// goes through the same ingest as an exercise's picture (mocked here — lib/media-ingest.js has its
// own tests), lands in the local store as pending and on the saved record, stamped; the grid shows
// posters and opens the full-screen viewer, where one can be removed; a seventh is refused.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'

const h = vi.hoisted(() => ({ ingest: null }))
vi.mock('./lib/media-ingest.js', () => ({ ingestMediaFile: (...a) => h.ingest(...a) }))

import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { _setLangState } from './lib/i18n-core.js'
import { bindUI } from './components/ui.jsx'
import { createMediaStore, memoryBackend, _setMediaStore } from './lib/media-store.js'
import { workoutDetailSheet, WorkoutRow } from './sheets.jsx'
import WorkoutMediaSection from './components/WorkoutMedia.jsx'
import { WORKOUT_MEDIA_MAX } from './lib/media-refs.js'

bindUI(useUI)

const mounted = []
const S = () => useStore.getState().S
const hex = n => n.toString(16).padStart(2, '0').repeat(32)
const refOf = (n, kind = 'image') => kind === 'video'
  ? { kind: 'video', hash: hex(n), mime: 'video/mp4', size: 400000, width: 1280, height: 720, dur: 6, codec: 'avc1', poster: { hash: hex(n + 100), mime: 'image/webp', size: 2000, width: 480, height: 270 }, at: 1727000000000 }
  : { kind: 'image', hash: hex(n), mime: 'image/webp', size: 200000, width: 1600, height: 1200, poster: { hash: hex(n + 100), mime: 'image/webp', size: 2000, width: 480, height: 360 }, at: 1727000000000 }

function render(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(el))
  return host
}
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  return Object.assign(render(sheet.render(() => useUI.getState().closeSheet(sheet.id))), { sheet })
}
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function pick(host, count = 1) {
  const input = host.querySelector('.wmedia input[type="file"]')
  const files = Array.from({ length: count }, (_, i) => new File(['x' + i], `IMG_00${i}.HEIC`, { type: 'image/heic' }))
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  const before = h.ingest.mock.calls.length
  act(() => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  const end = Date.now() + 4000
  while ((h.ingest.mock.calls.length < before + count || host.textContent.includes('Loading…')) && Date.now() < end) {
    await act(async () => { await new Promise(r => setTimeout(r, 10)) })
  }
  await settle()
}
const workout = extra => ({ id: 'w1', d: '2026-09-15', start: Date.UTC(2026, 8, 15, 17), end: Date.UTC(2026, 8, 15, 18), name: 'Push', vol: 0, prs: [], routineIds: [], entries: [], _ts: 5, ...extra })

let media, next
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  useStore.setState({ S: { ...structuredClone(DEF), workouts: [workout()] }, user: null, config: null })
  _setLangState('en', null, null, null)
  document.body.innerHTML = ''
  media = createMediaStore({ ...memoryBackend(), persistent: true, name: 'test' }, { objectURL: { createObjectURL: () => 'blob:t/1', revokeObjectURL() {} } })
  _setMediaStore(media)
  next = 1
  h.ingest = vi.fn(async () => {
    const n = next++
    const kind = n % 2 ? 'image' : 'video'
    const r = refOf(n, kind)
    return { media: r, blobs: [{ hash: r.hash, blob: new Blob(['main' + n]), mime: r.mime }, { hash: r.poster.hash, blob: new Blob(['poster' + n]), mime: 'image/webp' }], warnings: [] }
  })
})
afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
  _setMediaStore(null)
})

describe('a workout\'s photos and videos', () => {
  it('asks for images and videos, several at once', () => {
    workoutDetailSheet(S().workouts[0])
    const input = renderTop().querySelector('.wmedia input[type="file"]')
    expect(input.getAttribute('accept')).toBe('image/*,video/*')
    expect(input.multiple).toBe(true)
  })

  it('a picked photo and video land on the saved record, stamped, with their files pending — never the file name', async () => {
    workoutDetailSheet(S().workouts[0])
    const host = renderTop()
    await pick(host, 2)
    const w = S().workouts[0]
    expect(w.media).toEqual([refOf(1), refOf(2, 'video')])
    expect(w._ts).toBeGreaterThan(5)
    expect([...media.pendingNow()].sort()).toEqual([hex(1), hex(101), hex(2), hex(102)].sort())
    expect(host.querySelectorAll('.wmedia-item')).toHaveLength(2)
    expect(host.querySelectorAll('.wmedia-kind')).toHaveLength(1)   // the play badge on the video
    expect(JSON.stringify(S())).not.toContain('IMG_00')
  })

  it('shows posters in the grid, and opens the viewer on the one tapped', async () => {
    useStore.setState(s => ({ S: { ...s.S, workouts: [workout({ media: [refOf(1), refOf(2, 'video')] })] } }))
    await media.put(hex(101), new Blob(['p']), { mime: 'image/webp' })
    workoutDetailSheet(S().workouts[0])
    const host = renderTop()
    await settle()
    expect(host.querySelector('.wmedia-item img.thumb')?.getAttribute('src')).toBe('blob:t/1')
    act(() => host.querySelectorAll('.wmedia-item')[1].click())
    const top = useUI.getState().sheets.at(-1)
    expect(top.kind).toBe('viewer')
    const viewer = renderTop()
    expect(viewer.querySelector('.mviewer-count').textContent).toBe('2 / 2')
    expect(viewer.querySelector('.exmedia.viewer')).toBeTruthy()
    act(() => viewer.querySelector('button[aria-label="Previous"]').click())
    expect(viewer.querySelector('.mviewer-count').textContent).toBe('1 / 2')
  })

  it('Remove in the viewer asks, then takes it off the record and stamps it', async () => {
    useStore.setState(s => ({ S: { ...s.S, workouts: [workout({ media: [refOf(1), refOf(3)] })] } }))
    workoutDetailSheet(S().workouts[0])
    const detail = renderTop()
    act(() => detail.querySelectorAll('.wmedia-item')[0].click())
    const viewer = renderTop()
    act(() => viewer.querySelector('button[aria-label="Remove"]').click())
    expect(viewer.textContent).toContain('Remove this photo or video?')
    expect(S().workouts[0].media).toHaveLength(2)
    act(() => [...viewer.querySelectorAll('.mviewer-ask button')].find(b => b.textContent.trim() === 'Remove').click())
    expect(S().workouts[0].media.map(m => m.hash)).toEqual([hex(3)])
    expect(S().workouts[0]._ts).toBeGreaterThan(5)
    expect(viewer.querySelector('.mviewer-count').textContent).toBe('1 / 1')
  })

  it('a full workout offers no Add and says how many fit; a seventh picked in a batch is refused', async () => {
    workoutDetailSheet(S().workouts[0])
    const host = renderTop()
    await pick(host, WORKOUT_MEDIA_MAX + 1)
    expect(S().workouts[0].media).toHaveLength(WORKOUT_MEDIA_MAX)
    expect(useUI.getState().toastMsg).toBe(`Up to ${WORKOUT_MEDIA_MAX} photos or videos per workout.`)
    expect(host.querySelector('.wmedia-add')).toBeNull()
    expect(host.textContent).toContain(`Up to ${WORKOUT_MEDIA_MAX} photos or videos per workout.`)
  })

  it('a server without media storage gets no Add button, and says why', () => {
    useStore.setState({ user: { id: 'u1', name: 'One' }, config: { passkeys: true } })
    workoutDetailSheet(S().workouts[0])
    const host = renderTop()
    expect(host.querySelector('.wmedia-add')).toBeNull()
    expect(host.textContent).toContain('Your server does not store photos and videos yet.')
  })

  it('signed out, the finish screen\'s section explains itself and says the files stay here', () => {
    const host = render(<WorkoutMediaSection w={S().workouts[0]} hint />)
    expect(host.textContent).toContain('A progress photo or a form-check video, kept with this workout.')
    expect(host.textContent).toContain('Kept on this device only')
  })

  it('Delete workout in the detail sheet says its photos and videos go with it', () => {
    useStore.setState(s => ({ S: { ...s.S, workouts: [workout({ media: [refOf(1)] })] } }))
    workoutDetailSheet(S().workouts[0])
    const host = renderTop()
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Delete workout').click())
    expect(renderTop().textContent).toContain('This removes it from your history for good. Its photo or video is deleted with it.')
  })

  it('Delete workout without any says nothing about them', () => {
    workoutDetailSheet(S().workouts[0])
    const host = renderTop()
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Delete workout').click())
    expect(renderTop().textContent).not.toContain('deleted with it')
  })

  it('the history row shows how many a workout has', () => {
    const plain = render(<WorkoutRow w={workout()} onClick={() => {}} />)
    expect(plain.querySelector('.wrow-media')).toBeNull()
    const row = render(<WorkoutRow w={workout({ media: [refOf(1), refOf(2, 'video'), { hash: 'bad' }] })} onClick={() => {}} />)
    expect(row.querySelector('.wrow-media').textContent).toBe('2')
    expect(row.querySelector('.wrow-media').getAttribute('aria-label')).toBe('2 photos or videos')
  })
})
