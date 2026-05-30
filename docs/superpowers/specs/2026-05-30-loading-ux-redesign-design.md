# Loading UX Redesign

**Date:** 2026-05-30
**Status:** Approved (pending spec review)

## Problem

The current loading experience has visible defects:

- `page.tsx:141` shows a plaintext `"Loading channels…"` until the fetch resolves.
- `stats-strip.tsx`, `activity-feed.tsx`, `channel-card.tsx` use a mix of em-dash `—` placeholders and plaintext `"Loading…"` strings — inconsistent treatment.
- The channel page (`/c/[slug]`) has **no loading indicator at all** — an empty stream is indistinguishable from a still-loading stream.
- Every component does its own fetch + `setInterval` poll. There is no shared cache: navigating back from a channel page to `/` re-fetches everything from scratch and shows the cold-load state again.
- Action buttons (apply behavior, reset, clear) provide no in-flight feedback.

## Goals

- First paint on every route shows **content-shaped placeholders**, not blank screens or text strings.
- Revisiting a route shows **cached data instantly**, with background revalidation.
- The channel page distinguishes "still loading" from "no events yet".
- User actions feel instant (React 19 transitions; spinner only after 300 ms).
- The change is focused: ~6 files, one small dependency.

## Non-goals

- No global state management framework, no Redux/Zustand.
- No conversion of pages to React Server Components (rejected as Approach B — too large a refactor for this iteration; the SSE-driven channel page is fundamentally client-side anyway).
- No new design system or component library.

## Research basis

- **NN/g — Skeleton Screens 101**: content-shaped skeletons reduce cognitive load and outperform spinners for full-page loads <10 s. Frame-only skeletons (empty header/footer) are explicitly not recommended.
- **Nielsen response-time limits**: <1 s = no indicator (prevents flicker); 1–10 s = skeleton/spinner; >10 s = progress bar.
- **Next.js 16 docs**: `loading.tsx` is the route-level convention for instant fallback; `<Suspense fallback={…}>` streams individual sections.
- **SWR (Vercel)**: stale-while-revalidate is the recommended client-data pattern for dashboards. Shared cache eliminates back-navigation flash.
- **React 19**: `useTransition` lets us mark async state changes as non-blocking so the UI stays responsive.

## Design

### Component additions

#### `src/components/ui/skeleton.tsx`
Tailwind-driven primitive with an animated pulse. ~15 lines. Exposes `<Skeleton className="…" />` for shaping.

#### Content-shaped skeleton variants
Co-located with the components they shadow:

- `ChannelCardSkeleton` — matches `channel-card.tsx`: title bar, behavior pill, sparkline rectangle, two stat numbers.
- `StatsStripSkeleton` — four card placeholders with label + value lines.
- `ActivityFeedSkeleton` — six row placeholders with status pill + event name + timestamp.
- `EventStreamSkeleton` — eight rows matching `event-stream.tsx` layout.
- `KpiStripSkeleton` — KPI card placeholders.

These are not stored in a `ui/` bucket — they live next to the component they mirror, keeping the visual relationship obvious.

### Route-level loading

- `src/app/loading.tsx` — renders the home page shell (workspace header + stats placeholder + channel card grid + activity feed sidebar) so route transitions show the layout immediately.
- `src/app/c/[slug]/loading.tsx` — renders the channel page shell (top bar + 3-panel layout with stream/inspector skeletons).

### Data layer: SWR

Add `swr` as a dependency.

Create `src/lib/hooks/use-api.ts` containing thin hooks:

```ts
useChannels()                  // GET /api/channels  refresh 30s
useStats()                     // GET /api/stats     refresh 15s
useActivity(limit = 30)        // GET /api/activity  refresh 5s
useChannelStatus(slug)         // GET /api/channels/[slug]/status
useChannelHistory(slug, limit) // GET /api/channels/[slug]/history
```

Each hook is one line: `useSWR(key, fetcher, { refreshInterval, keepPreviousData: true })`. The `keepPreviousData` option is what eliminates revalidation flicker.

### Component changes (one per concern)

- **`page.tsx`** — replace the `useEffect`/`useState` channel fetch with `useChannels()`. While `isLoading && !data`, render `<ChannelCardSkeleton />` × 4. On revisit, the cache returns instantly so this branch never fires.
- **`stats-strip.tsx`** — replace the manual `setInterval` + `setStats` with `useStats()`. While `isLoading && !data`, render `<StatsStripSkeleton />`.
- **`activity-feed.tsx`** — same treatment with `useActivity()`. Distinguish loading skeleton from the existing "no webhooks received yet" empty state.
- **`channel-card.tsx`** — use `useChannelStatus(slug)` + `useChannelHistory(slug, 200)`. The hover-revealed buttons stay; the body shows `<ChannelCardSkeleton />` while loading.
- **`use-webhook-events.ts`** — keep SSE behaviour, but use SWR for the initial `/status` + `/history` fetch so revisits hit the cache. Add an `isInitialLoading` boolean to the return value so the channel page can show an `<EventStreamSkeleton />` instead of an empty stream.
- **`c/[slug]/page.tsx`** — when `isInitialLoading`, render skeletons in the stream and KPI panels. The sidebar stays interactive (behavior selector, send composer) so the page is still usable.

### Action feedback

For mutation buttons in `sidebar.tsx`, `event-inspector.tsx`, etc.:

```ts
const [isPending, startTransition] = useTransition()

function applyBehavior(value) {
  startTransition(async () => {
    await fetch(…)
    mutate('/api/channels/[slug]/status')  // SWR revalidate
  })
}
```

The button shows its "pressed" / "active" visual immediately. Only after 300 ms of pending state does a small spinner appear inside the button. SWR's `mutate()` triggers an immediate revalidation so the affected reads (status, history) refresh without delay.

### Freshness indicator

Add a tiny dot + relative timestamp in the activity feed header — `● updated 2 s ago`. The dot pulses during revalidation. This is the only visible difference between "fresh data" and "data being refreshed in background" — no skeletons during background refresh, since they'd be more distracting than the change.

## Files touched

| File | Change |
|---|---|
| `package.json` | + `swr` dependency |
| `src/components/ui/skeleton.tsx` | new — primitive |
| `src/components/channel-card-skeleton.tsx` | new |
| `src/components/stats-strip-skeleton.tsx` | new |
| `src/components/activity-feed-skeleton.tsx` | new |
| `src/components/event-stream-skeleton.tsx` | new |
| `src/components/kpi-strip-skeleton.tsx` | new |
| `src/lib/hooks/use-api.ts` | new — SWR hooks |
| `src/app/loading.tsx` | new — route fallback |
| `src/app/c/[slug]/loading.tsx` | new — route fallback |
| `src/app/page.tsx` | replace fetch with `useChannels()`, render skeleton when loading |
| `src/components/stats-strip.tsx` | replace fetch + interval with `useStats()` |
| `src/components/activity-feed.tsx` | replace fetch + interval with `useActivity()`, add freshness indicator |
| `src/components/channel-card.tsx` | replace fetch + interval with SWR hooks |
| `src/lib/hooks/use-webhook-events.ts` | use SWR for initial load; expose `isInitialLoading` |
| `src/app/c/[slug]/page.tsx` | render skeleton while `isInitialLoading` |
| `src/components/sidebar.tsx` | add `useTransition` for action buttons |

~17 files, ~6 new components, ~3 modified hooks.

## Testing strategy

- **Visual verification** — boot the app with the seeded data (already exists), navigate `/` ↔ `/c/stripe-payments` ↔ `/c/flaky-payments` and confirm: (a) skeletons appear on first visit, (b) second visit is instant, (c) channel page no longer shows blank stream during load, (d) action buttons feel instant.
- **Slow-network sanity check** — Chrome DevTools Network → "Slow 3G" to verify skeletons hold up under realistic latency.
- **Unit tests** — none planned for skeleton components (purely presentational). The SWR hooks are thin wrappers, also no value in unit testing.

## Risks

- **SWR + Next 16 compatibility** — SWR 2.x supports React 19 and Next 16. Verified during research.
- **Cache invalidation on mutation** — mitigated by calling `mutate(key)` after every `POST`/`DELETE` to the affected resource. The list is small (behavior, sequence, reset, clear, public-key, forward); each can be wired once.
- **`loading.tsx` requires server-component pages** — current pages are `'use client'`. `loading.tsx` still works for client-component routes — Next streams the fallback during the React render phase. Verified in Next 16 docs.

## Out of scope (deferred)

- Pre-fetching on hover (channel card → channel page warm-up).
- Optimistic UI for "send webhook" composer (separate iteration; the SSE event will arrive within ~200 ms anyway).
- Converting any page to a Server Component.
