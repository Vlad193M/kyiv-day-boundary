import { describe, expect, it } from 'vitest';
import { groupByDay } from '../src/groupByDay.js';

/** Day key that groupByDay assigns to a single event. */
function dayOf(at: string): string {
  const keys = Object.keys(groupByDay([{ at }]));
  expect(keys).toHaveLength(1);
  return keys[0]!;
}

// Kyiv: UTC+2 in winter, UTC+3 in summer.
// 2026: summer time starts Sun 29 Mar 03:00 -> 04:00,
//       ends Sun 25 Oct 04:00 -> 03:00.

describe('groupByDay: Kyiv calendar day', () => {
  it.each([
    // [input, expected Kyiv day, Kyiv local time]
    ['2026-03-10T01:30:00+02:00', '2026-03-10', '01:30 winter (example from report)'],
    ['2026-03-10T00:00:00+02:00', '2026-03-10', '00:00 start of day'],
    ['2026-03-10T23:59:59.999+02:00', '2026-03-10', '23:59:59.999 end of day'],
    ['2026-07-15T02:30:00+03:00', '2026-07-15', '02:30 summer'],
  ])('%s -> %s (%s)', (at, day) => {
    expect(dayOf(at)).toBe(day);
  });
});

describe('groupByDay: input in a different offset', () => {
  it.each([
    ['2026-03-10T23:30:00Z', '2026-03-11', '01:30 Kyiv'],
    ['2026-07-14T22:00:00Z', '2026-07-15', '01:00 Kyiv'],
    // Taking the date from the string itself would give 03-10 here.
    ['2026-03-10T20:30:00-05:00', '2026-03-11', '03:30 Kyiv'],
  ])('%s -> %s (%s)', (at, day) => {
    expect(dayOf(at)).toBe(day);
  });
});

describe('groupByDay: switch to summer time (29 Mar 2026)', () => {
  it.each([
    ['2026-03-29T00:30:00+02:00', '2026-03-29', 'just after midnight, still +02'],
    ['2026-03-28T23:00:00Z', '2026-03-29', '01:00 Kyiv'],
    ['2026-03-29T04:30:00+03:00', '2026-03-29', 'right after the jump'],
    ['2026-03-30T00:30:00+03:00', '2026-03-30', 'first midnight in summer time'],
  ])('%s -> %s (%s)', (at, day) => {
    expect(dayOf(at)).toBe(day);
  });
});

describe('groupByDay: switch to winter time (25 Oct 2026)', () => {
  it.each([
    ['2026-10-25T00:30:00+03:00', '2026-10-25', 'just after midnight, still +03'],
    ['2026-10-25T03:30:00+03:00', '2026-10-25', 'repeated hour, first pass'],
    ['2026-10-25T03:30:00+02:00', '2026-10-25', 'repeated hour, second pass'],
    ['2026-10-26T00:30:00+02:00', '2026-10-26', 'first midnight in winter time'],
  ])('%s -> %s (%s)', (at, day) => {
    expect(dayOf(at)).toBe(day);
  });
});

describe('groupByDay: grouping', () => {
  it('groups events of one report day together and keeps their order', () => {
    const events = [
      { id: 1, at: '2026-03-09T23:30:00+02:00' },
      { id: 2, at: '2026-03-10T00:15:00+02:00' },
      { id: 3, at: '2026-03-10T01:30:00+02:00' },
      { id: 4, at: '2026-03-10T23:59:00+02:00' },
      { id: 5, at: '2026-03-11T00:00:00+02:00' },
    ];

    expect(groupByDay(events)).toEqual({
      '2026-03-09': [events[0]],
      '2026-03-10': [events[1], events[2], events[3]],
      '2026-03-11': [events[4]],
    });
  });

  it('returns an empty object for no events', () => {
    expect(groupByDay([])).toEqual({});
  });
});
