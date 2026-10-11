# v0.15.4 pre-release test report

Base: GitHub v0.15.3, commit f1f45fd2f239df2d852a008ac158a6bb820b001b.
Validation date: October 11, 2026. Tests completed locally before publication.

## Render audit

render() is the only live full-panel innerHTML replacement. ensureUi() creates the overlay once; the remaining innerHTML assignment decodes text in a detached element. renderProgressOnly() updates text and bar width without replacing containers.

Full renders capture the currently rendered tab before replacing contents, then restore the destination tab. Using the rendered tab identity prevents outgoing positions overwriting incoming positions. Close saves before hiding. Restoration is synchronous so delayed callbacks cannot override subsequent user gestures. Focus restoration uses preventScroll, then restores nested and main offsets. No faction storage schema changes.

Wheel routing is installed once on the retained panel using non-passive capture. It handles nested overflow boundaries explicitly to avoid table overscroll containment trapping vertical gestures. It also works if a host capture handler cancels the native wheel event, provided the event still reaches the panel. Browser/pinch zoom remains native. A fourth grid row reserves mobile quickbar space.

Source comparison audited 312 existing functions against v0.15.3. Differences are limited to injectStyles, closePanel, render, and removal of forced search focus in bindUiEvents. The activeTabMeta comparison includes the new shared helpers inserted after it. All existing module renderers, API functions, war reconciliation, payout calculation/storage and the v0.15.2 banner fix remain unchanged.

## Validation

- JavaScript syntax check: passed.
- Userscript/metadata/application versions: 0.15.4, consistent.
- Browser: Microsoft Edge 155.0.4283.45.
- 14 regression checks passed:
- All eleven actual module renderers with empty offline data
- Real wheel over panel content bypasses host wheel interception
- Repeat refresh/re-render preserves latest scroll without delayed resets
- Actual search handler preserves focus, mid-string caret and selection
- Each tab keeps its own scroll and does not steal focus from another tab
- Nested vertical/horizontal scroll is restored
- Wheel at nested boundary routes vertically to main viewport
- Trackpad horizontal, Shift-wheel, line/page deltas and zoom gestures
- Close/reopen keeps active tab scroll
- Host capture cancellation still permits TFC wheel scrolling
- Short filtered content safely clamps scroll
- Mobile content remains bounded below quickbar and accepts wheel
- Actual 100-member table, filter focus, API loading renders, and horizontal table position
- Settings draft and caret survive background render

Tests use production render/binding functions with controlled overflow fixtures and offline data, including all eleven actual module renderers, a real 100-member table and Settings input. No live Torn API calls or faction writes were made.

## Local acceptance checks

1. Replace the installed script with the extracted userscript. Reload Torn and confirm v0.15.4 in the TFC header.
2. Wheel/trackpad-scroll over cards, table cells, blank content and the header; check horizontal table scrolling and Shift-wheel.
3. Edit searches mid-text and change filters in Members, War, Recruitment, Finance and Armory. Check caret/focus and viewport position, allowing shorter results to clamp.
4. Scroll down and trigger refresh/roster/intel sync; wait for War/Chain/OC auto-refresh. Check the viewport when loading begins and finishes.
5. Switch tabs and return, then close/reopen TFC; each tab should resume its position in this page session.
6. Reconcile a completed war in Payouts and confirm settings, gross value, adjustments, exclusions, notes and paid status are retained.

## Limits

Live Torn/extension interactions and API responses have not been tested here. Positions reset on page reload and clamp when content shrinks. Focus restores only to the same enabled control in the same tab. Nested offsets use structural/control identity and may reset when sections are removed or substantially rearranged. A host listener that stops events before they reach TFC cannot be bypassed by a panel handler.
