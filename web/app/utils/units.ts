import type { UnitSystem } from '@/lib/store';

export function convertDistance(meters: number, system: UnitSystem) {
  if (system === 'imperial') {
    const feet = meters * 3.28084;
    return `${feet.toFixed(1)}ft`;
  }
  return `${meters.toFixed(1)}m`;
}

export function convertSpeed(metersPerSecond: number, system: UnitSystem) {
  if (system === 'imperial') {
    const mph = metersPerSecond * 2.23694;
    return `${mph.toFixed(1)} mph`;
  }
  return `${metersPerSecond.toFixed(1)} m/s`;
}
