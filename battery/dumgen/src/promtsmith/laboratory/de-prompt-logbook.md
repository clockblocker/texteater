# German laboratory prompt logbook

This file is the permanent, append-only notebook for German Dumgen prompt work.
Session-level model inputs, validated outputs, latency, and errors live in the
ignored `.laboratory/sessions/` JSONL logs; durable conclusions belong here.

## 2026-08-01 — split classification chain installed as early WIP

- Status: laboratory-only; no production prompt or production-readiness claim.
- Supported language: German (`de`) only.
- Segmentation leaf: `laboratory.segmentation.de.segment`.
- Post-click leaves, in execution order:
  `laboratory.classification.de.selection`,
  `laboratory.classification.de.surface`,
  `laboratory.classification.de.lemma`, and
  `laboratory.classification.de.reading`.
- The application constructs attested Surface text from Segment membership and
  validates assembled Surface and Selection values with the matching concrete
  German Dumling schemas.
- No evaluation result is recorded yet.
