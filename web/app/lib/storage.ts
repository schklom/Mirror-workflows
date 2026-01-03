interface SessionData {
  fmdId: string;
  sessionToken: string;
  persistent: boolean;
}

export function saveSession(
  data: Omit<SessionData, 'persistent'>,
  remember: boolean
) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(
    'fmd_session',
    JSON.stringify({ ...data, persistent: remember })
  );
  window.dispatchEvent(new Event('session-updated'));
}

export function getSession() {
  if (typeof window === 'undefined') return null;

  const fromLocal = localStorage.getItem('fmd_session');
  const fromSession = sessionStorage.getItem('fmd_session');
  const raw = fromLocal || fromSession;

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('fmd_session');
  sessionStorage.removeItem('fmd_session');
  window.dispatchEvent(new Event('session-updated'));
}

export type UnitSystem = 'metric' | 'imperial';

export function getUnitPreference() {
  if (typeof window === 'undefined') return 'metric';
  const stored = localStorage.getItem('fmd_units');
  return stored === 'imperial' ? 'imperial' : 'metric';
}

export function setUnitPreference(system: UnitSystem) {
  localStorage.setItem('fmd_units', system);
}
