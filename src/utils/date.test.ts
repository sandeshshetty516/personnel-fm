import { financialMonth, formatCalendarDate, periodRange } from './date';

describe('financialMonth', () => {
  it('matches the calendar month when the month starts on day 1', () => {
    expect(financialMonth('2026-11-03', 1)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(financialMonth('2026-02-15', 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('runs from the start day to the day before it next month', () => {
    expect(financialMonth('2026-11-03', 25)).toEqual({ from: '2026-10-25', to: '2026-11-24' });
    expect(financialMonth('2026-11-25', 25)).toEqual({ from: '2026-11-25', to: '2026-12-24' });
  });

  it('shifts by whole financial months, across years', () => {
    expect(financialMonth('2026-01-10', 15, -1)).toEqual({ from: '2025-11-15', to: '2025-12-14' });
    expect(financialMonth('2026-12-20', 1, 1)).toEqual({ from: '2027-01-01', to: '2027-01-31' });
  });
});

describe('periodRange', () => {
  it('resolves named periods', () => {
    expect(periodRange('last-3-months', '2026-11-03', 1)).toEqual({ from: '2026-09-01', to: '2026-11-30' });
    expect(periodRange('this-year', '2026-11-03', 1)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodRange('all', '2026-11-03', 1)).toBeNull();
  });
});

describe('formatCalendarDate', () => {
  it('never shifts the day for time zones', () => {
    expect(formatCalendarDate('2026-11-03')).toBe('03 Nov 2026');
  });
});
