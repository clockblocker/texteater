---
status: accepted
---

# Make the workspace own navigation

tf-demo uses `/` as its single application URL. Settings remains shell state.
The Library starts as a Locked Sheet, Text opens as Locked Sheets, and Notes
move between Card and Sheet form. Users may create arbitrary nested Panes.
Resource URLs and route-encoded workspace state are intentionally unsupported.

Version 2 browser storage keeps placed Sheets and the minimum Card Layer
membership needed for an expanded Note to return to its Layer. Resting Card
Layers, active gestures, drag sessions, announcements, and Settings are
transient.

This amends the earlier central Navigation Anchor decision. A fixed central
Pane gave navigation a stable destination, but it prevented the workspace from
expressing the same nested layout as the shared renderer. The Library remains
the initial destination; it no longer occupies a permanent central Pane.
