---
status: accepted
---

# Persist one Visitor Encounter per Segment

A Segment Selection is an ephemeral command. tf-demo stores at most one
Visitor Encounter for each Visitor and Segment; later selections reuse it, and
an initially absent result may advance to the Segment's committed Occurrence
Attestation. Existing membership returns the canonical Note target without
creating a Resolution Session. This favors minimal Visitor state over
per-selection event analytics.
