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
