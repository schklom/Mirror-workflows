import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, weekOrder, weekStartOf, uid, exCount, routineCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, dayAddRoutineSheet, starterPlanSheet, planToolsSheet, confirmSheet, menuSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import SwipeToDelete from '../components/SwipeToDelete.jsx'
import { deleteRoutine } from '../lib/routines.js'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { coachAvailable } from '../lib/coach.js'
import { queueOf } from '../lib/queue.js'
import { scheduleModeOf, queueRecovery, rotationIds, saveRotation, startNewPass, startPass, stopPass } from '../lib/rotation.js'

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const config = useStore(s => s.config)
  const coachMode = useStore(s => s.coachLocal?.mode)
  const user = useStore(s => s.user)

  /* The Coach's only entry point in the app. Its screens have existed since the UI landed and
     nothing linked to them, so the feature was reachable only by typing the URL — enabled,
     configured, and invisible. The same predicate every other Coach surface uses gates it, so
     an instance without the feature sees exactly the Plan screen it saw before. */
  const showCoach = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode })

  // Swap with the neighbour, the way the routine editor moves an exercise. `S.routines` is the
  // one order the whole app reads, so this is all there is to it (#142).
  const moveRoutine = (i, delta) => update(s => {
    const to = i + delta
    if (to < 0 || to >= s.routines.length) return
    const [moved] = s.routines.splice(i, 1)
    s.routines.splice(to, 0, moved)
  })

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  // Pull one routine off a weekday; drop the key when the day empties (never store []).
  const removeFromDay = (d, rid) => update(s => {
    const next = [].concat(s.week[d] || []).filter(id => id !== rid)
    if (next.length) s.week[d] = next; else delete s.week[d]
  })

  // The same confirmation and the same delete as RoutineEdit's "Delete routine" button, minus
  // its navigation back to /plan, which this screen already is.
  const confirmDelete = r => confirmSheet({
    title: t('Delete routine?'), message: t('“{0}” and its exercises will be removed.', r.name), confirmText: t('Delete'), danger: true,
    onConfirm: () => update(s => { deleteRoutine(s, r.id) })
  })

  /* The rotation editor. What it shows is the live pass when there is one, otherwise the saved
     sequence — S.rotation is only a definition, so the pass is the truth whenever it exists.
     Every edit writes straight through saveRotation: an edit IS the save (and, for a queue
     somebody else wrote, the adoption), so there is no half-edited state to lose. `since` and
     `startsOn` carry over, so progress already logged survives a reorder. */
  const liveQ = queueOf(S)
  const seq = liveQ?.ids ?? rotationIds(S)
  const seqLabel = liveQ?.label || S.rotation?.label || t('Rotation')
  // Ownership, not presence: a planner's queue has no rotationId, or one that does not match the
  // saved rotation here — that's what makes it someone else's to write, not this app's.
  const managed = !!liveQ && !!S.rotation && liveQ.rotationId === S.rotation.id
  const external = !!liveQ && !managed
  // The editor shows for any live queue — so "Use this rotation" stays reachable for a planner's
  // week — or once Rotation is chosen with nothing built yet (S.scheduleMode). The weekday grid
  // stays up for ANY live queue, managed or not: the weekday routines ride along beside it either
  // way (effectiveRoutineIds, history.js) and feed the same tally (weekTally, queue.js), so hiding
  // the grid would hide the very thing that explains a combined count. It is hidden only while
  // Rotation is chosen with nothing built yet — there is no queue at that point for it to sit
  // beside, so a plain weekday grid would just be noise.
  const rotating = scheduleModeOf(S) === 'rotation' || queueRecovery(S)
  const hideGrid = !liveQ && S.scheduleMode === 'rotation'
  const setSeq = ids => update(s => {
    // Emptying the sequence is how you leave the rotation from here: no pass, no definition, and
    // the weekday plan — untouched all along — is the schedule again.
    if (ids.length) saveRotation(s, ids, seqLabel)
    else { stopPass(s); s.rotation = null; s.scheduleMode = 'week' }
  })
  const moveInSeq = (i, d) => { const n = [...seq]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); setSeq(n) }
  const addToSeq = () => menuSheet({
    title: t('Add to the rotation'),
    items: S.routines.filter(r => !seq.includes(r.id)).map(r => ({
      icon: glyphOf(r.emoji), label: r.name, onClick: () => setSeq([...seq, r.id]),
    })),
  })
  // The only path from a coach-written queue into a managed one: behind a confirmation, since it
  // hands refilling over to this app from here on — the coach's app should not still be writing it.
  // The rotation takes a name of its own here rather than the planner's (e.g. "US W1") — that
  // name is this one pass's, and refillAfter would otherwise repeat it on every pass after it.
  const adopt = () => confirmSheet({
    title: t('Use this rotation?'),
    message: t('openGym will take over refilling this queue from here on — the coach’s app should no longer write to it.'),
    confirmText: t('Use this rotation'),
    onConfirm: () => update(s => saveRotation(s, seq, t('Rotation'))),
  })

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    {showCoach && <button className="coach-cta" onClick={() => nav('/coach')}>
      <span className="coach-cta-av"><Icon name="sparkles" /></span>
      <span className="coach-cta-t">
        <b>{t('Coach')}</b>
        <span>{t('Plan design and reviews, from your own training')}</span>
      </span>
      <Icon name="chevronRight" className="coach-cta-chev" />
    </button>}

    <div className="cols"><div>
      {/* Rotation (lib/rotation.js) shows for any live queue, so a coach's week can still be
          adopted from here. The weekday grid stays up beside it either way — managed or
          external — since the weekday routines ride along regardless (effectiveRoutineIds,
          history.js) and the grid is what explains their share of the combined tally. */}
      {rotating && <div className="rotation">
        <h4 className="sec">{t('Rotation')}{external && <span className="tag" style={{ marginLeft: 8 }}>{t('Externally managed')}</span>}</h4>
        {queueRecovery(S) ? <div className="empty">
          {t('This rotation could not be read — it may have been written by another device.')}
          <div style={{ marginTop: 10 }}>
            {/* Also gives up S.scheduleMode='rotation' — otherwise the editor stays up with a
                saved sequence and no queue, and hideGrid keeps the weekday grid (and its own
                "Start pass" way out of that state) hidden along with it: a dead end. */}
            <Button size="sm" variant="tinted" aria-label={t('Discard it')} onClick={() => update(s => { s.queue = null; s.scheduleMode = 'week' })}>{t('Discard it')}</Button>
          </div>
        </div> : <>
          {seq.length ? <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
            {seq.map((id, i) => {
              const r = S.routines.find(x => x.id === id)
              return <div key={id} className="item rotation-row">
                <span className="lrow-i"><Icon name={glyphOf(r?.emoji)} /></span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="tt">{r?.name ?? id}</div><div className="ss">{t('Position {0}', i + 1)}</div>
                </div>
                {/* A coach's own queue is read-only here: the one way to change what it holds is
                    to adopt it first ("Use this rotation" below), never a tap on one of its rows. */}
                {!external && <>
                  <button className="iconbtn sm" aria-label={t('Move up')} title={t('Move up')} disabled={i === 0} onClick={() => moveInSeq(i, -1)}><Icon name="chevronUp" /></button>
                  <button className="iconbtn sm" aria-label={t('Move down')} title={t('Move down')} disabled={i === seq.length - 1} onClick={() => moveInSeq(i, 1)}><Icon name="chevronDown" /></button>
                  <button className="iconbtn sm" aria-label={t('Remove')} title={t('Remove')} onClick={() => setSeq(seq.filter(x => x !== id))}><Icon name="xmark" /></button>
                </>}
              </div>
            })}
          </div> : <div className="empty">{t('No rotation yet. Add routines in the order you want to train them — the first one you have not logged stays next.')}</div>}
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {!external && <Button size="sm" variant="tinted" icon="plus" aria-label={t('Add routine to the rotation')}
              disabled={S.routines.every(r => seq.includes(r.id))} onClick={addToSeq}>{t('Add routine')}</Button>}
            {external && <Button size="sm" variant="tinted" aria-label={t('Use this rotation')} onClick={adopt}>{t('Use this rotation')}</Button>}
            {!!liveQ && !external && <Button size="sm" aria-label={t('Start new pass')}
              onClick={() => update(s => startNewPass(s))}>{t('Start new pass')}</Button>}
            {!liveQ && !queueRecovery(S) && <Button size="sm" variant="tinted" aria-label={t('Cancel')} onClick={() => update(s => { s.scheduleMode = 'week' })}>{t('Cancel')}</Button>}
          </div>
        </>}
      </div>}
      {!hideGrid && <>
        <h4 className="sec">{t('Week schedule')}</h4>
        <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
          {weekOrder(weekStartOf(S)).map(d => {
            const dayRoutines = [].concat(S.week[d] || []).map(id => S.routines.find(x => x.id === id)).filter(Boolean)
            // An empty day stays one tappable row → pick its first routine (today's behaviour).
            if (!dayRoutines.length) return <div key={d} className="item" {...tappable(() => dayAssignSheet(d))}>
              <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
              <span className="tag">{t('Rest')}</span>
              <Icon name="chevronRight" className="chev" /></div>
            // A populated day: always-visible routine sub-rows + inline ✕. Adding a second routine
            // is a small ＋ in the day's header, centred over the ✕ column (#276): a full-width
            // "＋ Add routine" under every planned day made the week read as a list of buttons,
            // when most people train one routine a day. The ＋ keeps the option for those who don't.
            return <div key={d} className="item" style={{ display: 'block', padding: '10px 14px' }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <div className="tt">{t(DAYN[d])}</div>
                <div className="row" style={{ gap: 8 }}>
                  <div className="small dim">{routineCount(dayRoutines.length)}</div>
                  <button className="iconbtn sm" aria-label={t('Add routine')} title={t('Add routine')}
                    style={{ width: 30, height: 30, margin: '-5px 3px', fontSize: 15 }}
                    onClick={() => dayAddRoutineSheet(d)}><Icon name="plus" /></button>
                </div>
              </div>
              {dayRoutines.map(r => <div key={r.id} className="row" style={{ gap: 8, padding: '4px 0 4px 8px' }}>
                <span className="lrow-i" style={{ width: 26, height: 26, fontSize: 14 }}><Icon name={glyphOf(r.emoji)} /></span>
                <div className="grow" style={{ minWidth: 0 }}><div className="tt" style={{ fontSize: 14 }}>{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
                <button className="iconbtn sm" aria-label={t('Remove')} onClick={() => removeFromDay(d, r.id)}><Icon name="xmark" /></button>
              </div>)}
            </div>
          })}
        </div>
        {/* Two dead ends land here with a saved sequence but no active pass — "Discard it" on a
            malformed queue, and Settings' "Use Fixed Week" (which keeps the sequence on purpose).
            "Build a rotation instead" only ever meant "start one from scratch", so it stays
            hidden once there is already a sequence to resume instead. */}
        {!liveQ && seq.length > 0
          ? <Button size="sm" variant="tinted" icon="shuffle" style={{ marginTop: 8 }}
              aria-label={t('Start pass')} onClick={() => update(s => startPass(s))}>{t('Start pass')}</Button>
          : !liveQ && !S.rotation && <Button size="sm" variant="tinted" icon="shuffle" style={{ marginTop: 8 }}
              aria-label={t('Build a rotation instead')} onClick={() => update(s => { s.scheduleMode = 'rotation' })}>{t('Build a rotation instead')}</Button>}
      </>}
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
      </div>
      {S.routines.length ? <div className="list">{S.routines.map((r, i) => <SwipeToDelete key={r.id} className="item"
        deleteLabel={t('Delete routine')} onDelete={() => confirmDelete(r)} {...tappable(() => nav('/plan/r/' + r.id))}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        {/* The order of this list is the order of `S.routines`, and every other screen reads the
            same array — the Start screen, the day-assignment sheets, the routine pickers. So
            moving a routine here moves it everywhere, which is what the request asked for (#142). */}
        {S.routines.length > 1 && <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
          <button className="iconbtn" aria-label={t('Move up')} title={t('Move up')} disabled={i === 0}
            style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }}
            onClick={ev => { ev.stopPropagation(); moveRoutine(i, -1) }}><Icon name="chevronUp" /></button>
          <button className="iconbtn" aria-label={t('Move down')} title={t('Move down')} disabled={i === S.routines.length - 1}
            style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }}
            onClick={ev => { ev.stopPropagation(); moveRoutine(i, 1) }}><Icon name="chevronDown" /></button>
        </div>}
        <Icon name="chevronRight" className="chev" /></SwipeToDelete>)}</div> : <>
        <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
        <Button icon="sparkles" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
      </>}
    </div></div>
  </>
}
