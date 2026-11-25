# kyiv-day-boundary

`groupByDay` groups events for the daily report by day. A day is counted in Kyiv time (`Europe/Kyiv`).

## The bug

Some events ended up in the previous day. For example, `2026-03-10T01:30:00+02:00` landed in the `2026-03-09` group.

**Cause.** The old code took the day as `new Date(e.at).toISOString().slice(0, 10)`. A `Date` stores only a moment in time: the offset in the string is used to compute that moment and is then dropped. `toISOString()` always prints the moment in UTC, so events between 00:00 and 02:00 Kyiv time in winter (UTC+2), and between 00:00 and 03:00 in summer (UTC+3), fell into the previous UTC day.

**Fix.** The day is read from a Kyiv wall clock using `Intl.DateTimeFormat` with `timeZone: 'Europe/Kyiv'`. DST changes are handled by the time zone database built into Node, so no +2/+3 offsets are hard-coded. The `groupByDay` signature is unchanged.

## How to check that the test catches the bug

```sh
npm install

git checkout c7bacf5   # test: reproduce Kyiv day bug — old code + tests
npm test               # 11 failed | 6 passed

git checkout main      # fix: group events by Kyiv day
npm test               # 17 passed
```

The tests cover:

- the example from the report, the start and end of a day, summer time;
- input strings in other offsets (`Z`, `-05:00`);
- the nights of the switch to summer time (29 Mar 2026) and back to winter time (25 Oct 2026), including the 03:00–04:00 hour that occurs twice on 25 October.

Six tests pass on the old code too, on purpose. They catch wrong fixes. For example, `2026-03-10T20:30:00-05:00 → 2026-03-11` breaks the "take the date from the string" approach (`e.at.slice(0, 10)`), and `23:59:59.999+02:00 → 2026-03-10` breaks a hard-coded `+3` offset.

The result does not depend on the machine's time zone. The tests pass with `TZ` set to `UTC`, `Europe/Kyiv`, `America/New_York` and `Asia/Tokyo`:

```sh
TZ=Asia/Tokyo npm test                   # bash (Linux/macOS)
$env:TZ = 'Asia/Tokyo'; npm test         # PowerShell
```

## Where the AI agent got it wrong

The solution was written together with Claude Code. Things that had to be corrected:

- **False green tests.** The agent first ran the `TZ` checks in Git Bash on Windows. Values like `Asia/Tokyo` silently never reached Node, so the tests reported "passed" while running in the machine's own time zone. This came out only after the agent printed `process.env.TZ` and got `undefined`. The checks were rerun in PowerShell.
- **Unneeded API changes.** The agent added a `timeZone` parameter to `groupByDay`, exported the helper function and wrote separate tests for it. None of that was related to the bug, so it was rolled back: the signature stayed as it was, and only the internal helper takes the time zone as an argument.
