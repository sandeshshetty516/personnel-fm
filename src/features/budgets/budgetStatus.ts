import type { MeterSeverity } from '../../components/Meter';
import type { Utilisation } from '../../types/budget';

/** Thresholds at or above this count as "nearing the limit". */
const WARNING_FROM = 80;

/**
 * Turns a utilisation into the meter's severity and label. Configured alert thresholds decide
 * when an alert shows (FR-036); the colour escalates from on-track to warning to over-budget.
 */
export function budgetStatus(u: Utilisation): { severity: MeterSeverity; label: string; isAlert: boolean } {
  if (u.utilizationPercent > 100) return { severity: 'critical', label: 'Over budget', isAlert: true };
  if (u.utilizationPercent === 100) return { severity: 'critical', label: 'Limit reached', isAlert: true };
  if (u.reachedThreshold !== null && u.reachedThreshold >= WARNING_FROM) {
    return { severity: 'warning', label: `${u.reachedThreshold}% alert reached`, isAlert: true };
  }
  if (u.reachedThreshold !== null) {
    return { severity: 'normal', label: `${u.reachedThreshold}% alert reached`, isAlert: true };
  }
  return { severity: 'normal', label: 'On track', isAlert: false };
}
