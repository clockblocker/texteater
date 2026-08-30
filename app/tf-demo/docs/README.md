# tf-demo documentation index

The tf-demo Context and accepted ADRs are architectural authority. This index
separates current operations from proposals and retained design history.

## Current decisions and operations

- [ADR 0001: persist occurrence Attestations by Segment membership](./adr/0001-persist-occurrence-attestations-by-segment-membership.md),
  [ADR 0002: persist one Visitor Encounter per Segment](./adr/0002-persist-one-visitor-encounter-per-segment.md),
  and [ADR 0003: make the workspace own navigation](./adr/0003-make-the-workspace-own-navigation.md):
  accepted application decisions.
- [Generated relation publication](./generated-relation-publication.md): current
  fail-closed relation-publication procedure.
- [Post-reset verification](./post-reset-verification.md): current regression
  contract plus a dated one-time reset record.
- [Package integration findings](./dum-integration-findings.md): implementation
  record whose individual gaps carry their own dispositions.

## Proposals and retained history

- [TanStack layer](./tanstack-layer.md): proposed implementation
  specification; not an accepted decision.
- [WIP navigation vision](./design/wip-vision.md): superseded route design
  retained for history; ADR 0003 owns current navigation.
- [Card-demo rubric](./research/card-demo-implementation-rubric.md): historical
  prototype criteria.
- [Sheet-workspace candidates](./research/sheet-workspace-dnd-candidates.md):
  historical candidate shortlist.
- [Sheet-workspace implementation evidence](./research/sheet-workspace-implementation-evidence.md):
  historical prototype evidence.
- [dnd-kit decision](./research/dnd-kit-vs-pragmatic-card-sheet.md): implemented
  library decision reflected by the current workspace code and manifest.
