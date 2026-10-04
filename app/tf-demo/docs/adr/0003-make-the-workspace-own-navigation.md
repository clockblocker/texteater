---
status: accepted
---

# Make the workspace own navigation

tf-demo uses `/` as its single application URL. The initial Pane is a Rooted
Pane whose Ground line runs Menu › Library › Text, Settings is a Menu Item
beside the Library, and Notes move between Card and Sheet form
([tf-demo ADR 0008](./0008-give-every-pane-a-ground-beneath-its-covers.md)).
Panes form a split tree whose splits record their direction. Only
side-by-side splits are made for now; vertical and nested splits are deferred,
not dropped. Resource URLs and route-encoded workspace state are intentionally
unsupported.

The sidebar keeps only the Playground link, in development builds; a
production build has no sidebar.

Only Workspace Persistence survives a reload. The Library remains the initial
destination, but it no longer occupies a permanent central Pane.

## Considered Options

- A fixed central Pane as the Navigation Anchor. It gave navigation a stable
  destination, but it kept the workspace from expressing the same nested
  layout as the shared renderer.
