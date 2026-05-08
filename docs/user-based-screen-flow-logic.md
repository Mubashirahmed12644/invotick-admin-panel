# User Based Screen Flow Core Logic

This document explains the main working logic behind the User Based Screen Flow.

It focuses only on how sessions and events are selected, ordered, calculated, and returned. It does not explain UI, styling, components, or frontend code.

## What This Flow Is For

The User Based Screen Flow shows the activity timeline of a specific user or device.

Its main purpose is to answer:

- which sessions belong to this user
- which sessions belong to this device
- what events happened inside each session
- in what order those events happened
- how much time passed between events
- how many sessions and events were found

The main unit of this flow is the session. Events are always handled under their session.

## Main Logic

The flow is session-driven, not event-driven.

That means the system does not start by loading all events and then trying to make sessions from them.

It works like this:

1. Receive user/device filters.
2. Find matching sessions first.
3. Load events only for those sessions.
4. Attach events under their correct session.
5. Order sessions and events.
6. Calculate time gaps between events.
7. Return one timeline response.

## Input Filters

The flow can use these filters:

- `userId`
- `deviceId`
- `appVersion`
- `from`
- `to`

At least one identity filter is required:

- `userId`, or
- `deviceId`

If both `userId` and `deviceId` are missing, the system cannot know whose timeline to load.

## User And Device Matching

The backend first searches the analytics sessions.

### User ID Only

If only `userId` is provided, the system returns sessions where the stored session user matches that user.

This gives the timeline of that user's tracked app usage.

### Device ID Only

If only `deviceId` is provided, the system returns sessions where the stored session device matches that device.

This is useful when activity is tied to a device, even if a logged-in user is not available.

### User ID And Device ID Together

If both `userId` and `deviceId` are provided, matching uses OR logic.

A session is included if:

- the session belongs to the given user, or
- the session belongs to the given device

It does not require both values to exist on the same session.

This allows the timeline to combine user-linked sessions and device-linked sessions into one result.

## App Version Filter

`appVersion` is optional.

If it is provided, it narrows the matching sessions to that exact app version.

If it is not provided, sessions from all app versions can be included.

## Date Range Logic

Date filtering is based on session start time.

That means the system checks when the session started, not when each individual event happened.

If `from` and `to` are provided, only sessions whose start time falls inside that range are included.

If a session starts before the range, it is excluded even if some of its events happened inside the range.

If no date range is provided, the backend uses the latest matching sessions instead of scanning everything.

## Default Latest Sessions Logic

When no date range is provided, the backend selects the latest 30 matching sessions.

The selection happens by newest session start time first.

After those 30 sessions are selected, they are returned in chronological order.

So the logic is:

1. Find newest matching sessions.
2. Keep only the latest 30.
3. Reorder them from oldest to newest for timeline display.

This keeps the response limited while still making the final timeline readable.

## Session Ordering

Sessions in the final response are ordered by session start time ascending.

This means the oldest selected session appears first and the newest selected session appears last.

The timeline depends on this order because it reads like a journey from left to right.

## Event Loading Logic

After matching sessions are finalized, the backend loads events for those session IDs.

Events are not loaded for unrelated sessions.

Each event is attached back to the session it belongs to.

The result becomes:

- Session 1
  - Event 1
  - Event 2
  - Event 3
- Session 2
  - Event 1
  - Event 2

This structure keeps every event inside its real session.

## Event Ordering

Inside each session, events are ordered by event timestamp ascending.

That means the earliest event in that session comes first, and the latest event comes last.

If two events have the same timestamp, the backend keeps the ordering stable using the event identity/order available in storage.

This prevents the same timeline from appearing in a different order on repeated requests.

## Gap Calculation

Each event receives a `gapSec` value.

`gapSec` means how many seconds passed before that event happened.

### First Event In A Session

For the first event, the gap is calculated from the session start time.

Formula:

```text
first event gap = first event timestamp - session start time
```

Example:

```text
session starts at 10:00:00
first event happens at 10:00:03
gapSec = 3
```

This shows how long it took for the first tracked event to happen after the session began.

### Later Events In The Same Session

For every event after the first one, the gap is calculated from the previous event.

Formula:

```text
event gap = current event timestamp - previous event timestamp
```

Example:

```text
previous event happens at 10:00:03
current event happens at 10:00:10
gapSec = 7
```

This shows how much time passed between two user actions, screens, or tracked events.

## Total Session Calculation

`totalSessions` is the number of sessions included after all filters are applied.

For example:

```text
matched sessions = 12
totalSessions = 12
```

If nothing matches:

```text
matched sessions = 0
totalSessions = 0
```

## Total Event Calculation

`totalEvents` is the sum of all events inside the returned sessions.

Example:

```text
Session 1 has 4 events
Session 2 has 3 events
Session 3 has 5 events

totalEvents = 4 + 3 + 5 = 12
```

If sessions exist but have no events, they still count as sessions, but they add zero to `totalEvents`.

## Per Session Event Count

Each session also has its own event count.

This count is the number of events attached to that specific session.

Example:

```text
Session A events = 6
Session A totalEvents = 6
```

This helps identify whether a session contains real tracked activity or only an empty/partial record.

## Final Timeline Response

The final response is one ordered timeline.

At the top level, it contains:

- effective user ID
- effective device ID
- effective app version
- effective date range
- total sessions
- total events
- session list

Each session contains:

- session ID
- session start time
- session end time
- total events in that session
- ordered events

Each event contains:

- event name
- screen name, if available
- event timestamp
- calculated `gapSec`

## Empty Result Logic

An empty result is valid.

It means the filters were accepted, but no sessions matched them.

In that case, the response contains:

- `totalSessions = 0`
- `totalEvents = 0`
- `sessions = []`

This is not treated as a system failure.

## Short Summary

The User Based Screen Flow works like this:

1. Take user/device/version/date filters.
2. Find matching sessions first.
3. Apply app version and date filtering on sessions.
4. If no date range exists, select the latest 30 sessions.
5. Sort selected sessions from oldest to newest.
6. Load events for those sessions.
7. Sort events inside each session by timestamp.
8. Calculate `gapSec` for every event.
9. Count total sessions and total events.
10. Return the final session-based timeline.

