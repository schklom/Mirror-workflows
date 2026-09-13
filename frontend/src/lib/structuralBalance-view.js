import { BALANCE_STATUSES } from './structuralBalanceTemplates.js'

// Status -> UI label/severity (0 = best). Kept as a tiny boundary selector so the view and its
// tests can't drift from the engine's status values, same rationale as fatigueStateOf() in
// recovery-view.js.
export function balanceStatusView(status) {
  switch (status) {
    case BALANCE_STATUSES.BALANCED: return { label: 'Balanced', severity: 0 }
    case BALANCE_STATUSES.BORDERLINE: return { label: 'Borderline', severity: 1 }
    case BALANCE_STATUSES.WEAK: return { label: 'Weak', severity: 2 }
    default: return { label: 'No data', severity: 3 }
  }
}
