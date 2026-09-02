---
status: accepted
---

# Share Segment Resolution State behind Visitor Encounters

An unattested Segment stores one shared current Resolution State: `Active`,
`Unresolved`, or `PermanentFailure`. Concurrent Resolution Sessions contribute
to `Active`, while each Visitor sees this state only after selecting that exact
Segment. Visitor Encounters retain the Text, Sentence, and Segment locator;
Unit Reading Notes use the same history to include only Source Contexts the
Visitor has encountered.

Committed Attestation Membership is the current truth. The first valid atomic
occurrence commit wins, clears Resolution State for every member, and gives all
members the same resolved presentation. Later chains may finish, but their
terminal writes cannot replace the committed occurrence.
