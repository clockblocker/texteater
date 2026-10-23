---
status: accepted
---

# Keep structured Knowledge pointer-only

Structured Knowledge stores pointers. A Breakdown piece and a Source hold the
letters a piece shows and a Unit Shadow or a Lemma, never a Reading
([ADR 0050](./0050-break-a-reading-down-into-its-constituents.md)). Prompt
roles, source coordinates, alignment, and alternative analyses are transient
execution data and disappear before Dumrel Knowledge projection.

No Knowledge stores a tree. The Constituents are one level, and a part's
deeper levels are its own Constituents. The Morphemic Breakdown is flat
([ADR 0051](./0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md)).
