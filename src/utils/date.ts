import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DISPLAY_DATE_FORMAT = 'DD MMM YYYY';
const ISO_DATE = 'YYYY-MM-DD';

/**
 * Transaction dates are calendar dates ("2026-11-03") with no time zone attached, matching the API's
 * convention. They are parsed and formatted as plain dates, never shifted to local time.
 */
export function formatDate(value: string | Date, tz = DEFAULT_TIMEZONE): string {
  return dayjs(value).tz(tz).format(DISPLAY_DATE_FORMAT);
}

export function formatCalendarDate(isoDate: string, format = DISPLAY_DATE_FORMAT): string {
  return dayjs(isoDate, ISO_DATE).format(format);
}

/** Today's calendar date in the user's time zone. */
export function todayIn(tz = DEFAULT_TIMEZONE): string {
  return dayjs().tz(tz).format(ISO_DATE);
}

export interface DateRange {
  from: string;
  to: string;
}

/**
 * The financial month containing `today`, shifted by `offset` months. A month starting on day 25
 * runs 25 Oct – 24 Nov. Start days are capped at 28, so every month has one.
 */
export function financialMonth(today: string, startDay: number, offset = 0): DateRange {
  const day = dayjs(today, ISO_DATE);
  const currentStart = day.date() >= startDay ? day.date(startDay) : day.subtract(1, 'month').date(startDay);
  const start = currentStart.add(offset, 'month');
  return { from: start.format(ISO_DATE), to: start.add(1, 'month').subtract(1, 'day').format(ISO_DATE) };
}

export const PERIODS = [
  'this-month',
  'last-month',
  'last-3-months',
  'last-6-months',
  'this-year',
  'all',
  'custom',
] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  'this-month': 'This month',
  'last-month': 'Last month',
  'last-3-months': 'Last 3 months',
  'last-6-months': 'Last 6 months',
  'this-year': 'This year',
  all: 'All time',
  custom: 'Custom range',
};

/** Resolves a named period to dates using the user's financial month; "all" and "custom" return null. */
export function periodRange(period: Period, today: string, startDay: number): DateRange | null {
  switch (period) {
    case 'this-month':
      return financialMonth(today, startDay);
    case 'last-month':
      return financialMonth(today, startDay, -1);
    case 'last-3-months':
      return { from: financialMonth(today, startDay, -2).from, to: financialMonth(today, startDay).to };
    case 'last-6-months':
      return { from: financialMonth(today, startDay, -5).from, to: financialMonth(today, startDay).to };
    case 'this-year': {
      const year = dayjs(today, ISO_DATE).year();
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    default:
      return null;
  }
}

export { dayjs };
