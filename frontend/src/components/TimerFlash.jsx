import { useUI } from '../store/useUI.js'

// A new key restarts the CSS sequence even when two timers finish close together.
// The layer never catches taps and ends transparent, so it can safely stay mounted.
export default function TimerFlash() {
  const id = useUI(s => s.timerFlashId)
  return id ? <div key={id} className="timer-flash" aria-hidden="true" /> : null
}
