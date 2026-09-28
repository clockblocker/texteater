---
status: accepted
---

# Make the workspace own navigation

tf-demo uses `/` as its single application URL. Settings remains shell state.
The Library starts as a Locked Sheet, Text opens as Locked Sheets, and Notes
move between Card and Sheet form. Users may create arbitrary nested Panes.
Resource URLs and route-encoded workspace state are intentionally unsupported.

Only Workspace Persistence survives a reload. The Library remains the initial
destination, but it no longer occupies a permanent central Pane.

## Considered Options

- A fixed central Pane as the Navigation Anchor. It gave navigation a stable
  destination, but it kept the workspace from expressing the same nested
  layout as the shared renderer.
