---
status: accepted
refines:
  - "0001-persist-occurrence-attestations-by-segment-membership"
---

# Persist one Visitor Encounter per Segment

tf-demo treats each physical Segment Selection as an ephemeral command rather
than a durable event. A Visitor has at most one durable Visitor Encounter for a
Segment; later selections reuse it, and an initially absent result may advance
to the Segment's committed Occurrence Attestation. When membership already
exists, selection returns the canonical Note target directly without creating
a Resolution Session. Request identifiers belong to operational delivery and
do not justify duplicate encounter history. This gives up per-selection event
analytics in favor of minimal Visitor state and immediate reuse.
