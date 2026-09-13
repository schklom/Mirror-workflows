import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { EXIDX } from '../lib/exercises.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'
import { exercisePicker } from '../sheets.jsx'
import { computeBalance, overrideKey } from '../lib/structuralBalance.js'
import { balanceStatusView } from '../lib/structuralBalance-view.js'
import { TEMPLATES, TEMPLATE_LIST, DEFAULT_TEMPLATE_ID, EVALUATION_MODES } from '../lib/structuralBalanceTemplates.js'

const STATUS_COLOR = {
  balanced: 'var(--green)',
  borderline: 'var(--yellow)',
  weak: 'var(--red)',
  'no-data': 'var(--label-3)',
}

const exerciseName = id => (id && EXIDX[id] ? exerciseNameFor(EXIDX[id]) : null)

export default function StructuralBalance() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const templateId = TEMPLATES[S.balanceTemplate] ? S.balanceTemplate : DEFAULT_TEMPLATE_ID
  const template = TEMPLATES[templateId]
  const results = useMemo(() => computeBalance(S, template), [S, template])

  const setOverride = (role, exId) => update(s => {
    s.balanceOverrides = { ...s.balanceOverrides, [overrideKey(template, role)]: exId }
  })
  const clearOverride = role => update(s => {
    const next = { ...s.balanceOverrides }
    delete next[overrideKey(template, role)]
    s.balanceOverrides = next
  })
  const changeExercise = role => {
    const picker = exercisePicker(ex => { setOverride(role, ex.id); picker.close() })
  }

  return <>
    <div className="hdr"><button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 12 }}><h1>{t('Structural Balance')}</h1>
        <div className="sub">{t('Compare your lifts against a published ratio table to find the weak link.')}</div></div></div>

    <Segmented className="seg-range" value={templateId}
      onChange={id => update(s => { s.balanceTemplate = id })}
      options={TEMPLATE_LIST.map(tpl => ({ value: tpl.id, label: t(tpl.label) }))} />

    <div className="card">
      {results.map(r => {
        const role = template.roles.find(role => role.id === r.roleId)
        const view = balanceStatusView(r.status)
        // The exercise the number came from when there is one, otherwise the one this role is
        // set to — a role you just pointed at an exercise should name it, logged or not.
        const name = exerciseName(r.mappedExerciseId || r.configuredExerciseId)
        const reps = role.evaluationMode === EVALUATION_MODES.REP_COUNT
        const actual = r.status === 'no-data' ? '—' : reps ? r.current.r : `${Math.round(r.actualPct)}%`
        const valueText = `${actual} / ${r.targetPct}${reps ? '' : '%'}`
        return (
          <div key={r.roleId} className="mrow" data-role-id={r.roleId} data-status={r.status}
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, paddingBlock: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="nm" style={{ minWidth: 0 }}>
                <span style={{ display: 'block' }}>{t(role.label)}</span>
                <span className="small dim" style={{ display: 'block' }}>
                  {name}{r.isOverridden ? ` · ${t('Custom')}` : ''}
                </span>
              </span>
              <span className="v" style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ color: STATUS_COLOR[r.status] }}>{t(view.label)}</span>
                <span className="dim small" style={{ display: 'block' }}>{valueText}</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="ghost" icon="pencil" onClick={() => changeExercise(role)}>{t('Change exercise')}</Button>
              {r.isOverridden && <Button size="sm" variant="ghost" onClick={() => clearOverride(role)}>{t('Use default exercise')}</Button>}
            </div>
          </div>
        )
      })}
    </div>
  </>
}
