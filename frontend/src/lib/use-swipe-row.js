import { useCallback, useEffect, useRef, useState } from 'react'
import { vibrate } from './sound.js'

// Swipe on sets (v1.3.11): the gesture core behind components/SwipeRow.jsx. A set row swiped
// toward the start of the line (left in a left-to-right language, right in Arabic) deletes, toward
// the end copies. A short swipe leaves the row open on a button; a long one, or a flick, acts on
// release. Everything below is in that logical sense: a negative offset is toward the start and
// is turned into pixels only when painted, the way SwipeToDelete and SwipeCards do it.
//
// The row is almost all controls (the set number, the steppers, the value fields, the tick), so a
// swipe may start on any of them, and a tap must still be a tap. Nothing is captured until the
// touch has gone 8 px and clearly sideways (1.5 times more x than y, the same lock SwipeCards
// uses); a touch that goes vertical first is the page's scroll for the rest of its life. Once
// locked, the pointer is captured, the next click is swallowed, so the ± or tick under the finger
// does not fire after the swipe, and a field that took focus on the way in lets it go again.
//
// Touches that start within 24 px of either screen edge are left alone: that is iOS Safari's back
// swipe and Android's gesture navigation. The page gutter and the card's padding are wider than
// that, so the zone costs almost no row.
//
// Mouse drags are not swipes: a desktop has the set-number menu and the keyboard.

export const EDGE = 24
export const SLOP = 8
export const RATIO = 1.5
export const REVEAL = 76
export const OPEN_MIN = 40
export const DELETE_AT = 0.6
export const DELETE_FLING_AT = 0.4
export const COPY_AT = 0.4
export const COPY_FLING_AT = 0.25
export const FLING = 0.5
export const RESIST = 0.35
const PEEK = 32

/** +1 in a left-to-right page, -1 in a right-to-left one: logical offset × this = pixels. */
export const lineDir = () => (typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? -1 : 1)

/** Whether a touch at clientX starts in the screen's edge zone (back gestures live there). */
export const inEdgeZone = (x, width) => x < EDGE || x > width - EDGE

/** The axis a move has settled on: null while under the slop, 'x' once clearly sideways, else 'y'. */
export function axisOf(dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return null
  return Math.abs(dx) > RATIO * Math.abs(dy) ? 'x' : 'y'
}

/** Where the row sits for a raw logical drag `raw` on a row `w` wide: with the finger up to the
 *  commit point, then at a third of the pace beyond it, never past the row's own width. */
export function shapeOffset(raw, w) {
  const at = (raw < 0 ? DELETE_AT : COPY_AT) * w
  const d = Math.abs(raw)
  const out = d <= at ? d : at + (d - at) * RESIST
  return Math.sign(raw) * Math.min(w, out)
}

/** Whether an offset is past the commit point, i.e. letting go now acts. */
export function armedFor(o, w) {
  if (o < 0) return -o >= DELETE_AT * w - 0.5 ? 'delete' : null
  if (o > 0) return o >= COPY_AT * w - 0.5 ? 'copy' : null
  return null
}

/** What letting go does, for a row resting at logical offset `o` on a row `w` wide, released at
 *  logical velocity `v` (px/ms): 'delete' | 'copy' act; 'open-delete' | 'open-copy' leave the row
 *  open on its button; 'close' snaps it shut. A flick back the other way always closes. */
export function commitFor(o, w, v = 0) {
  if (o < 0) {
    const d = -o
    if (d >= DELETE_AT * w || (d >= DELETE_FLING_AT * w && -v > FLING)) return 'delete'
    if (v > FLING) return 'close'
    return d >= OPEN_MIN ? 'open-delete' : 'close'
  }
  if (o > 0) {
    if (o >= COPY_AT * w || (o >= COPY_FLING_AT * w && v > FLING)) return 'copy'
    if (-v > FLING) return 'close'
    return o >= OPEN_MIN ? 'open-copy' : 'close'
  }
  return 'close'
}

/** Logical velocity over the last 100 ms of [time, offset] samples. */
export function velocityOf(samples) {
  if (samples.length < 2) return 0
  const a = samples[0], b = samples[samples.length - 1]
  const dt = b[0] - a[0]
  return dt > 0 ? (b[1] - a[1]) / dt : 0
}

export const reducedMotion = () => {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// One open row at a time, and the click a swipe leaves behind. Shared by every row on the page.
const shared = { open: null, swallow: false, swallowTm: null, installed: false }
const swallowNextClick = () => {
  shared.swallow = true
  clearTimeout(shared.swallowTm)
  shared.swallowTm = setTimeout(() => { shared.swallow = false }, 600)
}
/** Closes whichever row is resting open, if any. */
export function closeOpenRow(instant = false) {
  const o = shared.open
  shared.open = null
  o?.close(instant)
}
function install() {
  if (shared.installed || typeof document === 'undefined') return
  shared.installed = true
  // Any touch elsewhere closes the open row. A tap that lands on another set only closes, so a
  // tick meant as "close that" does not tick (iOS Mail does the same).
  document.addEventListener('pointerdown', e => {
    shared.swallow = false
    const o = shared.open
    if (o && !o.el.contains(e.target)) {
      closeOpenRow()
      if (e.target.closest?.('.swrow')) swallowNextClick()
    }
  }, true)
  document.addEventListener('click', e => {
    if (shared.swallow) {
      shared.swallow = false
      e.stopPropagation(); e.preventDefault()
      return
    }
    // A tap on the open row itself (not its button) shuts it and does nothing else.
    const o = shared.open
    if (o && o.el.contains(e.target) && !e.target.closest?.('.swpane')) {
      e.stopPropagation(); e.preventDefault()
      closeOpenRow()
    }
  }, true)
  window.addEventListener('scroll', () => { if (shared.open && !shared.open.dragging()) closeOpenRow() }, { passive: true, capture: true })
}

/**
 * The gesture for one row. `onCommit('delete' | 'copy')` acts; `canDelete` false greys the delete
 * side and turns a delete into a rubber band and `onBlocked()`. `closeKey` closes the row whenever
 * it changes (the entry's rows were added or removed, a tick, a timer start: the row under the
 * finger may no longer be the set it was). `onStart` runs when a swipe locks (the hint chip goes).
 */
export function useSwipeRow({ canDelete = true, onCommit, onBlocked, onStart, closeKey }) {
  const outerRef = useRef(null)
  const frontRef = useRef(null)
  const delRef = useRef(null)
  const cpRef = useRef(null)
  const g = useRef(null)          // the gesture in progress
  const o = useRef(0)             // current logical offset
  const busy = useRef(false)      // an act or a peek is animating
  const timers = useRef([])
  const anim = useRef(null)
  const [openSide, setOpenSide] = useState(null)
  const props = useRef({})
  props.current = { canDelete, onCommit, onBlocked, onStart }

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const paint = useCallback((off, ms = 0) => {
    const outer = outerRef.current, front = frontRef.current
    if (!outer || !front) return
    const w = outer.clientWidth || 1
    const prevArmed = armedFor(o.current, w)
    o.current = off
    const tr = ms && !reducedMotion() ? `${ms}ms cubic-bezier(.32,.72,0,1)` : ''
    front.style.transition = tr ? `transform ${tr}` : 'none'
    front.style.transform = off ? `translateX(${off * lineDir()}px)` : ''
    const del = delRef.current, cp = cpRef.current
    for (const [pane, width] of [[del, Math.max(0, -off)], [cp, Math.max(0, off)]]) {
      if (!pane) continue
      pane.style.transition = tr ? `width ${tr}` : 'none'
      pane.style.width = width + 'px'
    }
    const armed = armedFor(off, w)
    del?.classList.toggle('armed', armed === 'delete')
    cp?.classList.toggle('armed', armed === 'copy')
    outer.classList.toggle('go-del', off < 0)
    outer.classList.toggle('go-cp', off > 0)
    // A tiny buzz crossing the commit point, either way (Android; Safari has no vibrate).
    if (!ms && armed !== prevArmed && g.current?.lock) {
      const deleting = armed === 'delete' || prevArmed === 'delete'
      if (!(deleting && props.current.canDelete === false)) vibrate(8)
    }
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    anim.current?.cancel?.()
    anim.current = null
    busy.current = false
    g.current = null
    if (outerRef.current) outerRef.current.classList.remove('dragging', 'flash-red')
    paint(0)
    setOpenSide(null)
    if (shared.open?.el === outerRef.current) shared.open = null
  }, [paint])

  const close = useCallback((instant = false) => {
    if (shared.open?.el === outerRef.current) shared.open = null
    setOpenSide(null)
    paint(0, instant ? 0 : 260)
  }, [paint])

  const openTo = side => {
    if (shared.open && shared.open.el !== outerRef.current) closeOpenRow()
    paint(side === 'delete' ? -REVEAL : REVEAL, 260)
    setOpenSide(side)
    shared.open = { el: outerRef.current, close, dragging: () => !!g.current?.lock }
  }

  const doDelete = () => {
    const outer = outerRef.current
    if (!outer) return
    if (shared.open?.el === outer) shared.open = null
    setOpenSide(null)
    if (props.current.canDelete === false) {
      paint(0, 380)
      outer.classList.remove('flash-red'); void outer.offsetWidth; outer.classList.add('flash-red')
      later(() => outer.classList.remove('flash-red'), 520)
      props.current.onBlocked?.()
      return
    }
    vibrate(15)
    if (reducedMotion()) { paint(0); props.current.onCommit?.('delete'); return }
    busy.current = true
    paint(-(outer.clientWidth || 300), 170)
    later(() => {
      const h = outer.offsetHeight
      outer.style.overflow = 'hidden'
      const done = () => {
        busy.current = false
        props.current.onCommit?.('delete')
        // The row at this index now shows the next set (rows are keyed by index); the closeKey
        // effect puts it back. If nothing changed after all, this does.
        later(() => { if (anim.current) reset() }, 300)
      }
      if (typeof outer.animate === 'function') {
        anim.current = outer.animate([{ height: h + 'px' }, { height: '0px' }], { duration: 180, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' })
        anim.current.onfinish = done
      } else done()
    }, 170)
  }

  const doCopy = () => {
    if (shared.open?.el === outerRef.current) shared.open = null
    setOpenSide(null)
    vibrate(15)
    if (reducedMotion()) { paint(0); props.current.onCommit?.('copy'); return }
    busy.current = true
    paint(0, 220)
    later(() => { busy.current = false; props.current.onCommit?.('copy') }, 200)
  }

  const release = v => {
    const outer = outerRef.current
    if (!outer) return
    const act = commitFor(o.current, outer.clientWidth || 1, v)
    if (act === 'delete') doDelete()
    else if (act === 'copy') doCopy()
    else if (act === 'open-delete') openTo('delete')
    else if (act === 'open-copy') openTo('copy')
    else close()
  }

  // Any change the row's owner names closes it at once and drops a gesture mid-way.
  useEffect(() => { reset() }, [closeKey, reset])
  useEffect(() => () => { clearTimers(); anim.current?.cancel?.(); if (shared.open?.el === outerRef.current) shared.open = null }, [])

  // touchmove is attached by hand and not passive, so a locked sideways swipe can keep the page
  // from scrolling under it on browsers that do not honour touch-action on the row (see the
  // comment block in SwipeToDelete.jsx). Before the lock it does nothing.
  useEffect(() => {
    install()
    const el = outerRef.current
    if (!el) return
    const onTouchMove = e => { if (g.current?.lock === 'x' && e.cancelable) e.preventDefault() }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const onPointerDown = e => {
    if (busy.current || g.current) return
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
    if (e.target.closest?.('.subrow,.swpane')) return
    const width = typeof window !== 'undefined' ? window.innerWidth : 0
    if (width && inEdgeZone(e.clientX, width)) return
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, o0: o.current, lock: null, samples: [] }
  }
  const onPointerMove = e => {
    const d = g.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0
    if (!d.lock) {
      const axis = axisOf(dx, dy)
      if (!axis) return
      if (axis === 'y') { g.current = null; return }
      d.lock = 'x'
      try { outerRef.current?.setPointerCapture?.(e.pointerId) } catch { /* the gesture still tracks */ }
      swallowNextClick()
      const a = typeof document !== 'undefined' ? document.activeElement : null
      if (a && a !== document.body && outerRef.current?.contains(a)) a.blur?.()
      if (shared.open && shared.open.el !== outerRef.current) closeOpenRow()
      outerRef.current?.classList.add('dragging')
      props.current.onStart?.()
    }
    const logical = dx * lineDir()
    const now = e.timeStamp || Date.now()
    d.samples.push([now, logical])
    while (d.samples.length > 2 && now - d.samples[0][0] > 100) d.samples.shift()
    const w = outerRef.current?.clientWidth || 1
    paint(Math.max(-w, Math.min(w, shapeOffset(d.o0 + logical, w))))
  }
  const end = (e, cancelled) => {
    const d = g.current
    if (!d || d.id !== e.pointerId) return
    g.current = null
    if (!d.lock) return
    outerRef.current?.classList.remove('dragging')
    release(cancelled ? 0 : velocityOf(d.samples))
  }

  // The first-use hint: a nudge toward the start (red shows), back, toward the end, back.
  const peek = useCallback(() => {
    if (reducedMotion() || busy.current || g.current) return
    busy.current = true
    const steps = [[-PEEK, 250], [0, 250], [PEEK, 250], [0, 250]]
    let k = 0
    const step = () => {
      if (k >= steps.length) { busy.current = false; return }
      const [off, ms] = steps[k++]
      paint(off, ms)
      later(step, ms + 50)
    }
    step()
  }, [paint])

  return {
    outerRef, frontRef, delRef, cpRef, openSide, peek,
    pressDelete: doDelete, pressCopy: doCopy,
    handlers: {
      onPointerDown, onPointerMove,
      onPointerUp: e => end(e, false),
      onPointerCancel: e => end(e, true),
    },
  }
}
