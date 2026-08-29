// The conversation with the Coach.
//
// Everything the Coach does happens here: your answers as the opening message, a typing
// bubble while a job runs (with how long it usually takes), the plan or the suggestions as a
// card you page through, a composer to say what to change, and one button that imports the
// result. History stays in the thread — come back any time, ask for a review, refine again.
//
// The thread is `S.coach.chat` (small, synced) plus whatever is live right now from the
// status poll: a running job or a pending proposal. Nothing about the proposal is copied into
// the chat until a decision is made about it, so two devices can never disagree on what is
// pending. Turning the Coach off is the admin's decision, not a control on this screen.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, DAYS } from '../lib/format.js'
import { exLine } from '../lib/history.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import {
  coachAvailable, hasConsent, emptyCoach, appendChat, recordTiming, estimateMs, profileLines,
  markStale, applicable, applyChangeSet, applyCreatedPlan, recordDismissal,
  changeTitle, changeValues, exName, canRevert, revertLast
} from '../lib/coach.js'
import { useCoachStatus, requestReview, refinePlan, resolvePending, JOB_ERRORS } from '../lib/coach-api.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Check, Switch, Section, Row, SelectRow } from '../components/ui.jsx'
import '../coach.css'

export default function CoachChat() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const coachLocal = useStore(s => s.coachLocal)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const { job, pending, cap, loading, lastError, last, refresh } = useCoachStatus(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const prevJob = useRef(null)
  const coachMode = coachLocal?.mode

  const ok = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode })
  const ready = ok && hasConsent(S) && !!S.coach?.profile
  useEffect(() => {
    if (!ok) nav('/home', { replace: true })
    else if (!ready) nav('/coach/intake', { replace: true })
  }, [ok, ready])

  // A job that ends is either a proposal, "nothing to change", or a failure. The server tells
  // the client none of that directly — the job simply stops appearing — so the transition is
  // read here, once, and written into the thread as the Coach's reply.
  useEffect(() => {
    if (loading) return
    const was = prevJob.current
    prevJob.current = job
    if (!was || job) return
    const ms = was.startedAt ? Date.now() - was.startedAt : 0
    update(s => {
      recordTiming(s, ms)
      if (!pending) {
        const cls = lastError?.errorClass || (last?.outcome === 'failed' ? (last.errorClass || 'internal') : null)
        appendChat(s, cls
          ? { role: 'coach', kind: 'error', text: JOB_ERRORS[cls] || JOB_ERRORS.internal }
          : { role: 'coach', kind: 'nochange', text: last?.reading
            ? last.reading
            : t('I looked through everything and there is nothing I would change right now. Keep going — ask me again after a few more sessions.') })
      }
    })
  }, [job, pending, loading])

  useEffect(() => { if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ block: 'end' }) }, [S.coach?.chat?.length, !!job, !!pending])

  if (!ready) return null
  const coach = S.coach || emptyCoach()

  const send = async () => {
    const msg = text.trim()
    if (!msg || busy) return
    setBusy(true)
    try {
      if (pending?.kind === 'create') await refinePlan(msg)
      else await requestReview(msg)
      update(s => appendChat(s, { role: 'user', kind: 'text', text: msg }))
      setText('')
      refresh()
    } catch (e) {
      toast(e.message || t('Could not ask the Coach'))
    }
    setBusy(false)
  }

  const askReview = async () => {
    setBusy(true)
    try {
      await requestReview('')
      update(s => appendChat(s, { role: 'user', kind: 'text', text: t('Have a look at my training and tell me what you would change.') }))
      refresh()
    } catch (e) { toast(e.message || t('Could not ask the Coach')) }
    setBusy(false)
  }

  const menu = () => openSheet(close => <div className="chat-menu">
    <h3>{t('Coach')}</h3>
    <div className="sect-b">
      {!job && !pending && <Row icon="sparkles" iconTint="var(--acc)" title={t('Ask for a review')} subtitle={t('What would the Coach change after your last sessions?')} accessory="chevron" onClick={() => { close(); askReview() }} />}
      <Row icon="clipboard" iconTint="var(--indigo)" title={t('Edit my answers')} subtitle={t('Goal, days, equipment, limits')} accessory="chevron" onClick={() => { close(); nav('/coach/intake?edit=1') }} />
      <Row icon="clock" iconTint="var(--purple)" title={t('Automatic reviews')} subtitle={cadenceLabel(coach)} accessory="chevron" onClick={() => { close(); cadenceSheet(openSheet, update) }} />
      {canRevert(S) && <Row icon="reset" iconTint="var(--blue)" title={t('Undo the last Coach changes')} accessory="chevron" onClick={() => { close(); doRevert() }} />}
    </div>
    <div style={{ height: 10 }} />
  </div>)

  const doRevert = () => confirmSheet({
    title: t('Undo the last Coach changes?'),
    message: t('Your plan goes back to how it was before you accepted them. Workouts you have logged since are untouched.'),
    confirmText: t('Undo'),
    onConfirm: () => {
      let ok = false
      update(s => { ok = revertLast(s); if (ok) appendChat(s, { role: 'coach', kind: 'reverted', text: t('Done — your plan is back to how it was before my last changes.') }) })
      toast(ok ? t('Plan restored') : t('Nothing to undo'))
    }
  })

  const status = job ? t('thinking…') : pending ? t('has a suggestion for you') : t('here when you need it')
  const placeholder = pending?.kind === 'create'
    ? t('Tell the Coach what to change…')
    : job ? t('Wait for the Coach to finish…') : t('Ask for a review, or tell the Coach something…')

  return <div className="narrow chat">
    <div className="chat-hdr">
      <button className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div className="chat-av"><Icon name="sparkles" /></div>
      <div className="grow">
        <h1>{t('Coach')}</h1>
        <div className={'chat-st' + (job ? ' live' : '')}>{status}</div>
      </div>
      <button className="iconbtn" onClick={menu} aria-label={t('More')}><Icon name="list" /></button>
    </div>

    <div className="msgs">
      <Bubble role="coach">{t('Hi — I’m your Coach. I build your plan from your answers and adjust it from what you actually log. Nothing changes until you say so.')}</Bubble>

      {(coach.chat || []).map(m => <Message key={m.id} m={m} profile={coach.profile} />)}

      {job && <Typing S={S} kind={job.kind} coachLocal={coachLocal} />}

      {pending && !job && (pending.kind === 'create'
        ? <PlanCard p={pending} S={S} update={update} toast={toast} nav={nav} refresh={refresh} />
        : <ReviewCard p={pending} S={S} update={update} toast={toast} refresh={refresh} />)}

      <div ref={endRef} />
    </div>

    <div className="composer">
      <div className="composer-in">
        <textarea rows={1} value={text} maxLength={1000} placeholder={placeholder} disabled={!!job}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button className="send" onClick={send} disabled={!text.trim() || busy || !!job} aria-label={t('Send')}><Icon name="arrowUp" /></button>
      </div>
      {cap?.limit > 0 && <div className="composer-cap">{t('{0} of {1} Coach runs used today', cap.used, cap.limit)}</div>}
    </div>
  </div>
}

/* ---------------------------------- bubbles ---------------------------------- */

function Bubble({ role, kind, at, children }) {
  const cls = kind === 'error' ? ' err' : ''
  return <div className={'msg ' + role}>
    <div className={'bub' + cls}>{children}</div>
    {at && <div className="msg-t">{stamp(at)}</div>}
  </div>
}

function Message({ m, profile }) {
  if (m.kind === 'intake') {
    const lines = profileLines(profile)
    return <Bubble role="user" at={m.at}>
      {t('Here is what I am working with:')}
      <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </Bubble>
  }
  if (m.kind === 'applied' || m.kind === 'dismissed' || m.kind === 'reverted' || m.kind === 'nochange' || m.kind === 'error' || m.kind === 'text') {
    return <Bubble role={m.role} kind={m.kind} at={m.at}>{m.text}</Bubble>
  }
  return null
}

const stamp = at => {
  const d = new Date(at)
  const today = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === today.toDateString() ? time : fmtDate(d.toISOString().slice(0, 10)) + ' · ' + time
}

function Typing({ S, kind, coachLocal }) {
  const ms = estimateMs(S)
  const local = coachLocal?.mode === 'byok' && coachLocal?.provider === 'compatible'
  let eta
  if (ms) {
    const min = Math.round(ms / 60000)
    eta = min < 1 ? t('Usually under a minute.') : t('Usually about {0} min.', min)
  } else {
    eta = t('This usually takes a minute or two.')
  }
  return <div className="msg coach">
    <div className="bub typing"><i /><i /><i /></div>
    <div className="typing-eta">
      {kind === 'create' ? t('Building your plan…') : t('Reading your training…')} {eta}
      {local ? ' ' + t('A local model can take longer.') : ''}
      {' ' + t('You can leave — it keeps going.')}
    </div>
  </div>
}

/* ---------------------------------- the plan ---------------------------------- */

function PlanCard({ p, S, update, toast, nav, refresh }) {
  const b = p.bundle
  const [tab, setTab] = useState(0)
  const [schedule, setSchedule] = useState(true)
  const r = b.routines[Math.min(tab, b.routines.length - 1)]
  const weekDays = useMemo(() => new Set(Object.keys(b.week || {}).map(Number)), [b])

  const accept = () => {
    try {
      let n = 0
      update(s => {
        const res = applyCreatedPlan(s, p, { schedule })
        n = res?.routines?.length || b.routines.length
        appendChat(s, { role: 'coach', kind: 'applied', text: schedule
          ? t('Imported — {0} routines are in your plan and your week is set. See you at the next session.', n)
          : t('Imported — {0} routines are in your plan. Your week is unchanged; schedule them whenever you like.', n) })
      })
      resolvePending({ accepted: ['plan'] }).catch(() => {})
      toast(t('Your plan is live'))
      refresh()
    } catch (e) { toast(e.message || t('That proposal can’t be read.')) }
  }
  const discard = () => confirmSheet({
    title: t('Discard this plan?'), message: t('Nothing is saved, and you can ask again anytime.'),
    confirmText: t('Discard'), danger: true,
    onConfirm: () => {
      update(s => { recordDismissal(s, p); appendChat(s, { role: 'coach', kind: 'dismissed', text: t('Discarded. Tell me what was off and I will build a different one.') }) })
      resolvePending({ dismissed: true }).catch(() => {})
      refresh()
    }
  })

  return <div className="msg coach" style={{ maxWidth: '100%', width: '100%' }}>
    <div className="pcard">
      <div className="pcard-hd">
        <div className="pcard-eyebrow">{p.iteration > 1 ? t('Revision {0}', p.iteration) : t('Your plan')}</div>
        <h2 className="pcard-h">{b.name || t('Coach plan')}</h2>
        {!!b.summary && <p className="pcard-sum">{b.summary}</p>}
        {!!b.basedOn && <p className="pcard-sum" style={{ fontSize: 13 }}>{b.basedOn}</p>}
      </div>

      <div className="pcard-week">
        {[1, 2, 3, 4, 5, 6, 0].map(d => <div key={d} className={'pcard-wd' + (weekDays.has(d) ? ' on' : '')}>{t(DAYS[d])}</div>)}
      </div>

      {b.routines.length > 1 && <div className="pcard-tabs">
        {b.routines.map((x, i) => <button key={x.id || i} className={'pcard-tab' + (i === tab ? ' on' : '')} onClick={() => setTab(i)}>{x.emoji} {x.name}</button>)}
      </div>}

      {r && <div className="pcard-rt">
        <div className="pcard-rt-h"><b>{r.emoji} {r.name}</b><span>{t('{0} exercises', r.ex.length)}</span></div>
        {!!r.why && <div className="pcard-why">{r.why}</div>}
        {r.ex.map((e, i) => <div key={i} className="pcard-ex">
          <div className="pcard-ex-r"><span className="pcard-ex-n">{exName(e.id)}</span><span className="pcard-ex-l">{exLine(e, S.unit)}</span></div>
          {!!e.why && <div className="pcard-ex-w">{e.why}</div>}
        </div>)}
      </div>}

      <div className="pcard-row">
        <span className="lrow-m"><span className="lrow-t">{t('Use this weekly schedule')}</span><span className="lrow-s">{t('Replaces your current week. Days this plan leaves empty become rest days.')}</span></span>
        <Switch checked={schedule} onChange={setSchedule} />
      </div>
      <div className="pcard-note">{t('The Coach is not a doctor or a physiotherapist. If something hurts, ask a professional.')}</div>
      <div className="pcard-ft">
        <Button variant="primary" icon="download" onClick={accept}>{t('Import this plan')}</Button>
        <Button onClick={discard}>{t('Discard')}</Button>
      </div>
    </div>
    <div className="msg-t">{t('Not quite right? Say what to change below and I will revise the whole plan.')}</div>
  </div>
}

/* ---------------------------------- a review ---------------------------------- */

function ReviewCard({ p, S, update, toast, refresh }) {
  const marked = useMemo(() => markStale(p, S), [p, S])
  const usable = applicable(marked)
  const [accepted, setAccepted] = useState(() => new Set(usable.map(c => c.id)))
  const toggle = id => setAccepted(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const apply = () => {
    const ids = [...accepted].filter(id => usable.some(c => c.id === id))
    if (!ids.length) { discard(); return }
    try {
      update(s => {
        applyChangeSet(s, marked, ids)
        appendChat(s, { role: 'coach', kind: 'applied', text: t(ids.length === 1 ? 'Applied {0} change to your plan.' : 'Applied {0} changes to your plan.', ids.length) })
      })
      resolvePending({ accepted: ids, rejected: marked.changes.filter(c => !ids.includes(c.id)).map(c => c.id) }).catch(() => {})
      toast(t(ids.length === 1 ? '{0} change applied' : '{0} changes applied', ids.length))
      refresh()
    } catch (e) { toast(e.message || t('Could not apply those changes')) }
  }
  const discard = () => confirmSheet({
    title: t('Dismiss these suggestions?'), message: t('Nothing changes, and the Coach will remember you turned these down.'),
    confirmText: t('Dismiss'), danger: true,
    onConfirm: () => {
      update(s => { recordDismissal(s, marked); appendChat(s, { role: 'coach', kind: 'dismissed', text: t('Understood — I will not suggest these again without new evidence.') }) })
      resolvePending({ dismissed: true }).catch(() => {})
      refresh()
    }
  })

  return <div className="msg coach" style={{ maxWidth: '100%', width: '100%' }}>
    <div className="pcard">
      <div className="pcard-hd">
        <div className="pcard-eyebrow">{t('Suggestions')}</div>
        <h2 className="pcard-h">{t(marked.changes.length === 1 ? '{0} suggestion' : '{0} suggestions', marked.changes.length)}</h2>
        {!!marked.summary && <p className="pcard-sum">{marked.summary}</p>}
        {!!marked.evidence?.sessions && <p className="pcard-sum" style={{ fontSize: 13 }}>
          {t('Based on your last {0} sessions', marked.evidence.sessions)}{marked.evidence.from ? ` · ${fmtDate(marked.evidence.from)} – ${fmtDate(marked.evidence.to)}` : ''}
        </p>}
        {marked.planMoved && <p className="pcard-sum" style={{ fontSize: 13, color: 'var(--yellow)' }}>
          {t('Your plan changed since the Coach looked at it. Suggestions that no longer match are greyed out — ask for a fresh review to see them again.')}
        </p>}
      </div>

      {marked.changes.map(c => {
        const stale = c.status === 'stale'
        const vals = changeValues(c)
        return <div key={c.id} className={'pcard-chg' + (stale ? ' stale' : '')}>
          <div className="grow">
            <div className="pcard-chg-t">{changeTitle(c)}{c.routineName ? <span className="dim" style={{ fontWeight: 400 }}> · {c.routineName}</span> : null}</div>
            {vals && <div className="pcard-chg-v"><span className="tag">{vals.before}</span><Icon name="chevronRight" style={{ fontSize: 12, color: 'var(--label-3)' }} /><span className="tag acc">{vals.after}</span></div>}
            <div className="pcard-chg-w">{c.why}</div>
            {stale && <div className="pcard-chg-stale">{t('Doesn’t match your plan any more — can’t be applied.')}</div>}
          </div>
          {!stale && <Check checked={accepted.has(c.id)} onChange={() => toggle(c.id)} />}
        </div>
      })}

      {!!marked.notes?.length && <div className="pcard-notes">
        {marked.notes.map((n, i) => <div key={i}>💬 {n}</div>)}
      </div>}

      <div className="pcard-note">{t('The Coach is not a doctor or a physiotherapist. If something hurts, ask a professional.')}</div>
      <div className="pcard-ft">
        <Button variant="primary" icon="check" onClick={apply}>
          {accepted.size ? t(accepted.size === 1 ? 'Apply {0} change' : 'Apply {0} changes', accepted.size) : t('Apply nothing')}
        </Button>
        <Button onClick={discard}>{t('Dismiss all')}</Button>
      </div>
    </div>
  </div>
}

/* ---------------------------------- cadence ---------------------------------- */

const cadenceLabel = coach => {
  const c = coach.cadence && coach.cadence !== 'off' ? coach.cadence : null
  if (!c) return t('Off')
  if (c.weekly) return t('Weekly')
  return t('After every few workouts')
}

function cadenceSheet(openSheet, update) {
  openSheet(close => <CadenceSheet close={close} update={update} />)
}
function CadenceSheet({ update }) {
  const coach = useStore(s => s.S.coach) || emptyCoach()
  const cadence = coach.cadence && coach.cadence !== 'off' ? coach.cadence : null
  const mode = !cadence ? 'off' : cadence.weekly ? 'weekly' : 'every'
  const setMode = m => update(s => {
    const c = (s.coach = s.coach || emptyCoach())
    c.cadence = m === 'off' ? 'off' : m === 'weekly' ? { weekly: { day: 0, time: '18:00' } } : { everyWorkouts: 4 }
  })
  const patch = fn => update(s => { const c = (s.coach = s.coach || emptyCoach()); fn(c) })
  return <>
    <h3>{t('Automatic reviews')}</h3>
    <Section footer={mode === 'off' ? t('Off — the Coach only looks when you ask it to.') : t('You are only notified when the Coach actually has something to suggest.')}>
      <SelectRow icon="clock" iconTint="var(--purple)" title={t('When')} value={mode} onChange={setMode}
        options={[
          { value: 'off', label: t('Off') },
          { value: 'weekly', label: t('Weekly'), subtitle: t('On a day and time you choose') },
          { value: 'every', label: t('After every few workouts'), subtitle: t('As soon as you have logged enough') }
        ]} />
      {mode === 'weekly' && <>
        <SelectRow icon="calendar" iconTint="var(--orange)" title={t('Day')} value={cadence.weekly.day}
          onChange={v => patch(c => { c.cadence = { weekly: { ...c.cadence.weekly, day: v } } })}
          options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => ({ value: i, label: t(d) }))} />
        <Row icon="clock" iconTint="var(--purple)" title={t('Time')}>
          <input type="time" className="timef" value={cadence.weekly.time || '18:00'}
            onChange={e => patch(c => { c.cadence = { weekly: { ...c.cadence.weekly, time: e.target.value } } })} />
        </Row>
      </>}
      {mode === 'every' && <SelectRow icon="dumbbell" iconTint="var(--teal)" title={t('After how many workouts')}
        value={cadence.everyWorkouts || 4}
        onChange={v => patch(c => { c.cadence = { everyWorkouts: v } })}
        options={[3, 4, 5, 6, 8, 10].map(n => ({ value: n, label: t('{0} workouts', n) }))} />}
    </Section>
  </>
}
