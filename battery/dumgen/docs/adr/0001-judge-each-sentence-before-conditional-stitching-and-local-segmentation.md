---
status: accepted
---

# Judge each sentence before conditional stitching and local segmentation

TypeSafe judges Language, intelligibility and Stitching need independently for
each source sentence. A batch may contain German, English and Hebrew. Explicit
rejection is terminal; acceptance remains provisional for later recognition.

Luna repairs whitespace only when an accepted sentence needs Stitching. Code
preserves source order and identity, checks every non-whitespace character, and
segments the resulting text locally and losslessly. Uncertain judgments do not
authorize generation. English and Hebrew recognition remain deferred.

This supersedes the original single-model Intake call that combined batch
Language, judgments and repair. Deterministic, package-free Source Segmentation
remains the boundary; analyzer-backed Hebrew segmentation was rejected because
its footprint and server-only deployment violate that boundary.

ADR 0004 amends the boundary: deterministic Source Segmentation is the first
internal step of intake-time Segment production, and word-internal splitting
happens there rather than at click resolution. ADR 0005 amended it a second
time, making the intake call also produce the Segmented Sentence. ADR 0007
superseded ADR 0005: `Segment.Text` returns a text's pieces and biggest units.
Neither changes the per-sentence judgments above.
