# Queue Profile — Architecture

Queue operator profile: status, desk, countdown, client call, redirect, and queue list.

## Structure

```
queueProfile/
├── queueProfile.tsx       # Page: composes layout + modals, holds countdown/redirect state
├── constants.ts           # STATUS_LABELS, STATUS_CHIP_CONFIG, WAITING_TIMER_SEC, redirect options
├── QueueStatusSidebar.tsx # Right column: status chip, status select, desk row
├── QueueSidebarContent.tsx# Right column: with-client (redirect + finish) or waiting (countdown + call)
├── QueueNextClientsList.tsx # Bottom: next clients list (when available)
├── api/
│   └── queueManagerApi.ts   # getManagerProfile, setManagerStatus, setManagerCurrentCounter
├── modals/
│   ├── index.ts
│   ├── StatusChangeModal.tsx  # Confirm status change
│   └── DeskSelectionModal.tsx # Choose desk when going online
└── panels/                # Main (left) content by status/phase
    ├── QueueMainPanel.tsx    # Router: break | lunch | unavailable | available (called vs waiting)
    ├── QueueBreakPanel.tsx
    ├── QueueLunchPanel.tsx
    ├── QueueUnavailablePanel.tsx
    ├── QueueWaitingForNextPanel.tsx
    ├── QueueCalledPanel.tsx  # With client: call/attendance/data + history
    ├── WelcomeModal.tsx
    └── ElapsedTimer.tsx
```

## Integration with galamat-queue-backend

- **On load**: `GET /api/queue/manager/me` → backend profile (status, counters, currentCounterId). Result is written to Redux via `setProfileFromApi` (desks = counters, status mapped AVAILABLE→available, etc.).
- **On confirm status** (modal): `PUT /api/queue/manager/status` with `AVAILABLE`|`OFFLINE`|`BREAK`|`LUNCH`; on success Redux `confirmStatusChange()`.
- **On confirm desk + go online**: `PUT /api/queue/manager/current-counter` with `counterId`, then `PUT .../status` with `AVAILABLE`; on success Redux `confirmDeskAndGoOnline(draftDesk)`.

Next.js API routes under `/api/queue/manager/*` proxy to `QUEUE_API_URL` (env) and forward the `access_token` cookie as Bearer. Queue backend must accept the same JWT (e.g. `JWT_SECRET` = main app `ACCESS_TOKEN_SECRET`) and use `userId` or `sub` as manager id.

## Data flow

- **State**: Redux `queueProfile` slice (`@/store/queueProfileSlice`): `status`, `phase`, `callServicePhase`, `selectedDesk`, `desks`, modals, etc.
- **Local state** in `queueProfile.tsx`: `redirectWindow`, `countdown`, `showWelcomeModal`, `draftDesk`, `newDeskName`.
- **Panels**: `QueueMainPanel` picks panel by `status` and `phase`; panels read store and call dispatch for actions.

## Status / phase

- **Status**: `available` | `break` | `lunch` | `unavailable`
- **Phase** (when available): `waitingForNext` | `withClient`
- **CallServicePhase** (when withClient): `waiting` (client called, not yet at window) | `servicing`

## Exports

Use `queueProfile/` or `queueProfile/index` for the page; subcomponents and constants are exported from `index.ts` for reuse if needed.
