// Every progress photo across every logged workout, in one place, newest first — and a
// before/after comparison between any two of them.
//
// WorkoutMedia.jsx already lets a photo or video be attached to a finished workout, and that is
// still where one is added or removed; this view only reads what is already there (workoutMediaOf,
// the same list WorkoutMedia.jsx shows per workout) and lines every still up chronologically, plus
// a slider to compare two dates directly. Nothing new to store, sync or back up — one more way to
// look at data the media system already keeps, private to the account the same way everything
// else there is (DATA_DIR/uploads/<uid>/, api/media.js).
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import { workoutMediaOf } from '../lib/media-refs.js'
import { CustomThumb, MediaView, useMediaUrl } from '../components/CustomMedia.jsx'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

/**
 * Every still photo (no video — the comparison wants two stills, not two clips) across every
 * logged workout, newest first. Each entry carries the date and the workout it came from, so the
 * grid and the comparator can both say when a photo was taken without re-deriving it.
 */
export function progressPhotosOf(S) {
  const out = []
  for (const w of (S && S.workouts) || []) {
    for (const m of workoutMediaOf(w)) {
      if (m.kind === 'video') continue
      out.push({ d: w.d, start: w.start || 0, w, m })
    }
  }
  out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.start - a.start))
  return out
}

/** Runs an already-sorted progressPhotosOf() list into { d, items }[] groups of the same date. */
export function groupByDate(photos) {
  const out = []
  for (const p of photos) {
    const last = out[out.length - 1]
    if (last && last.d === p.d) last.items.push(p)
    else out.push({ d: p.d, items: [p] })
  }
  return out
}

/** Whole days between two ISO dates, always ≥ 0 regardless of which comes first. */
export function daysBetween(a, b) {
  const ms = new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')
  return Math.abs(Math.round(ms / 86400000))
}

function openPhotoView(p) {
  useUI.getState().openSheet(close => (
    <div className="mviewer" role="dialog" aria-modal="true" aria-label={t('Photo')}>
      <div className="mviewer-bar">
        <button type="button" className="iconbtn" aria-label={t('Close')} onClick={close}><Icon name="xmark" /></button>
        <span className="mviewer-count">{fmtDate(p.d, true, true)}</span>
        <span style={{ width: 36 }} />
      </div>
      <div className="mviewer-stage"><MediaView m={p.m} cls="exmedia viewer" /></div>
    </div>
  ), { kind: 'viewer' })
}

/** The before/after slider between two progress photos `a` (earlier) and `b` (later). */
function ProgressCompare({ a, b, close }) {
  const before = useMediaUrl(a.m)
  const after = useMediaUrl(b.m)
  const [pct, setPct] = useState(50)
  const stageRef = useRef(null)
  const dragging = useRef(false)

  const setFromClientX = x => {
    const el = stageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!rect.width) return
    setPct(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)))
  }
  const onPointerDown = e => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); setFromClientX(e.clientX) }
  const onPointerMove = e => { if (dragging.current) setFromClientX(e.clientX) }
  const endDrag = () => { dragging.current = false }

  const days = daysBetween(a.d, b.d)

  return <div className="mviewer" role="dialog" aria-modal="true" aria-label={t('Compare photos')}>
    <div className="mviewer-bar">
      <button type="button" className="iconbtn" aria-label={t('Close')} onClick={close}><Icon name="xmark" /></button>
      <span className="mviewer-count">{days > 0 ? t('{0} days apart', days) : t('Same day')}</span>
      <span style={{ width: 36 }} />
    </div>
    <div className="pp-compare" ref={stageRef} data-swipe-ignore
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      {after.url && <img className="pp-img" src={after.url} alt="" draggable={false} />}
      {before.url && <img className="pp-img" src={before.url} alt="" draggable={false}
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} />}
      <div className="pp-handle" style={{ insetInlineStart: pct + '%' }}><div className="pp-grip" /></div>
      <div className="pp-label pp-label-before">{fmtDate(a.d, true)}</div>
      <div className="pp-label pp-label-after">{fmtDate(b.d, true)}</div>
    </div>
  </div>
}

/** Opens the before/after slider between two progressPhotosOf() entries, in date order either way. */
export function openProgressCompare(x, y) {
  const [a, b] = x.d <= y.d ? [x, y] : [y, x]
  useUI.getState().openSheet(close => <ProgressCompare a={a} b={b} close={close} />, { kind: 'viewer' })
}

export default function ProgressPhotos() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const photos = useMemo(() => progressPhotosOf(S), [S.workouts])
  const groups = useMemo(() => groupByDate(photos), [photos])
  const [comparing, setComparing] = useState(false)
  const [picked, setPicked] = useState([])   // up to 2 hashes, in tap order

  const toggle = p => setPicked(cur => {
    if (cur.includes(p.m.hash)) return cur.filter(h => h !== p.m.hash)
    return cur.length >= 2 ? [cur[1], p.m.hash] : [...cur, p.m.hash]
  })
  const cancelCompare = () => { setComparing(false); setPicked([]) }
  const runCompare = () => {
    if (picked.length !== 2) return
    const [ha, hb] = picked
    const a = photos.find(p => p.m.hash === ha)
    const b = photos.find(p => p.m.hash === hb)
    cancelCompare()
    if (a && b) openProgressCompare(a, b)
  }

  return <>
    <div className="hdr"><button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Progress photos')}</h1>
        <div className="sub">{t('{0} photos', photos.length)}</div></div>
      {photos.length >= 2 && (comparing
        ? <Button size="sm" variant="ghost" onClick={cancelCompare}>{t('Cancel')}</Button>
        : <Button size="sm" variant="tinted" onClick={() => setComparing(true)}>{t('Compare')}</Button>)}
    </div>

    {comparing && <div className="small dim" style={{ margin: '0 0 12px' }}>
      {picked.length < 2 ? t('Pick two photos to compare.') : t('Ready — open the comparison.')}
    </div>}

    {!photos.length
      ? <div className="empty"><div className="ico"><Icon name="image" /></div>
          {t('No progress photos yet — add one from a workout’s finish screen, or from its entry in History.')}
        </div>
      : groups.map(g => (
        <div key={g.d} style={{ marginBottom: 18 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>{fmtDate(g.d, true, true)}</div>
          <div className="wmedia-grid">
            {g.items.map(p => {
              const selected = picked.includes(p.m.hash)
              return (
                <button key={p.m.hash} type="button" data-swipe-ignore
                  className={'wmedia-item' + (selected ? ' pp-selected' : '')}
                  aria-label={fmtDate(p.d, true)}
                  onClick={() => (comparing ? toggle(p) : openPhotoView(p))}>
                  <CustomThumb ex={{ custom: true, media: p.m }} />
                  {selected && <span className="pp-check"><Icon name="check" /></span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

    {comparing && picked.length === 2 && <div className="pp-cta">
      <Button variant="primary" onClick={runCompare}>{t('Compare')}</Button>
    </div>}
  </>
}
