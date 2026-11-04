import { formatCalendarDate } from '../../utils/date';

/**
 * Short axis labels for financial-month buckets, short enough that every month fits on a phone:
 * "Nov" (or "Nov 26" when the range spans years) when months start on day 1, otherwise the start
 * date ("25 Oct"), because a financial month then spans two calendar months.
 */
export function bucketLabels(buckets: { from: string; to: string }[], startDay: number): string[] {
  if (startDay !== 1) return buckets.map((b) => formatCalendarDate(b.from, 'D MMM'));
  const oneYear = new Set(buckets.map((b) => b.from.slice(0, 4))).size <= 1;
  return buckets.map((b) => formatCalendarDate(b.from, oneYear ? 'MMM' : 'MMM YY'));
}

/** Full label for tooltips and tables: "1 Nov – 30 Nov 2026". */
export function bucketRangeLabel(bucket: { from: string; to: string }): string {
  return `${formatCalendarDate(bucket.from, 'D MMM')} – ${formatCalendarDate(bucket.to, 'D MMM YYYY')}`;
}
