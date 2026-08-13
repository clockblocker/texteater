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

## 2026-08-01 — settled topology and first noun vertical slice

- Supersedes the runtime topology in the earlier entry. The laboratory now
  executes Intake -> Segmentation<de> and Target Classification -> route-fixed
  Grammatical Resolution -> route-fixed Reading Resolution.
- Only `<de, Lexeme, NOUN>` is enabled after Target Classification. Other valid
  routes stop as visible `ResolutionRouteNotImplemented` results before a
  resolver call.
- OpenAI Structured Outputs rejected union-root Intake, Target, and noun
  Grammatical schemas. The private model DTOs now use object roots and Dumgen
  validates decision/payload correlations before projecting the same public
  domain decisions.
- In the sentence `Draußen ist es noch still, und in der Küche wartet schon der
  erste Kaffee.`, early Target attempts counted Segment indices incorrectly and
  confused a clicked noun with unrelated sentence material. The general rule
  now explicitly counts every zero-based Segment array member, copies the click
  into target membership, and distinguishes noun heads from preceding
  adjectives.
- Segmentation initially attached a comma to `still`; an attached-punctuation
  example now reinforces that punctuation is always a separate Segment.
- Noun grammar resolves `Küche` as feminine dative singular and `Kaffee` as
  masculine nominative singular, both with Standard orthography and canonical
  Inflection Surfaces.
- Reading initially described `Küche` with the nearby coffee emoji. The prompt
  now requires the emoji to represent the fixed Lemma rather than a neighboring
  noun and records the reusable room-level description `🍳 Küche`.
- Final hands-on rerun: Intake accepted `de`, Segmentation reconstructed the
  sentence exactly, `Küche` and `Kaffee` both classified as Lexeme/NOUN, and the
  complete resolutions returned `🍳 Küche` and `☕ Kaffee` with no diagnostics.
- These observed cases have influenced the authored prompt and are regression
  evidence, not an unbiased evaluation corpus or a production-readiness claim.

## 2026-08-01 — low-noise, high-signal rewrite of the initial five prompts

- Each body now opens with its owned judgment and states the default path
  before exceptions. Laboratory persona, production-status language, repeated
  topology, and schema-enforced forbidden-field lists were removed.
- Rules were retained when they change a valid answer or protect a stage
  boundary: noisy but intelligible German remains accepted; punctuation and
  known-unresolvable spans remain distinct Segments; Target defaults to the
  clicked word but expands defensible wholes; noun Grammar preserves attested
  Surface inflection and membership instead of lemmatizing it; Reading cannot
  revise the fixed Lemma and must ignore nearby scene content.
- Use examples now cover distinct decisions. Clean Segmentation and dative-noun
  cases moved to the test sets, while attached punctuation, `OpaqueText`,
  Surface-versus-Lemma inflection, typo repair, exact Reading reuse, and the
  nearby-object Reading failure remain in the generated prompts. Test examples
  remain excluded from generation.
- Generated prompt-content size was measured against `HEAD` after deterministic
  regeneration. Characters are Unicode code points; size is diagnostic, not a
  quality score.

  | Prompt | HEAD bytes/chars | Rewritten bytes/chars | Rationale |
  | --- | ---: | ---: | --- |
  | Intake | 845 / 845 | 787 / 786 | Removed persona and mechanical output prose; one noisy-but-German routing example now carries the important acceptance edge. |
  | Segmentation<de> | 1740 / 1738 | 1626 / 1624 | Compressed repeated kind rules, moved the clean path to tests, and kept punctuation plus `OpaqueText` boundaries in-prompt. |
  | Target Classification<de, HighLevelWholeUnit> | 913 / 913 | 2351 / 2350 | Added three contrastive policy examples and retained the observed index and noun-versus-adjective safeguards missing from `HEAD`. |
  | Grammatical Resolution<de, Lexeme, NOUN> | 1157 / 1157 | 1906 / 1906 | Removed ceremony but added plural-inflection and typo-repair examples that expose the Surface/Lemma and Standard/Typo boundaries. |
  | Reading Resolution<de> | 653 / 653 | 1205 / 1195 | Added exact Reuse and nearby-object New examples; retained fixed-Lemma and authoritative-membership rules. |

- No model was called for this rewrite. Verification covered authored examples,
  deterministic assembly, generated freshness, codecs, catalog behavior, and
  package gates only.

## 2026-08-02 — Emoji Descriptions corrected to emoji-only labels

- An Emoji Description is one emoji or a compact emoji sequence. It never
  includes the Lemma, a gloss, or explanatory prose.
- Earlier Reading prompts and examples incorrectly concatenated text, such as
  `☕ Tee`. Settled and experimental prompts now use emoji-only values such as
  `☕` and explicitly prohibit appended text.
- Existing Reading reuse still requires exact membership in the learner's
  supplied Emoji Descriptions.
- No model was called for this correction. Verification covered deterministic
  generation, schemas, catalog behavior, and package tests.

## 2026-08-02 — adposition examples distinguish relations without semantic over-splitting

- Spatial and temporal uses of `vor` reuse one broad precedence Reading rather
  than splitting the same relational shape by domain. A contrastive use example
  chooses `⏮️` over an existing generic `🔗` connector.
- Approximate-time `gegen` is distinct from counteraction. A contrastive use
  example creates `🤏` when only the existing counteraction description `⚔️` is
  available.
- These examples encode learner-facing relation identity without copying the
  complement's content into the adposition's Emoji Description.

## 2026-08-13 — first complete production Prompt Part promoted

- German high-level Target Classification is the first complete route promoted
  to `production/prompt-part`: instruction body, canonical 221-case Golden
  Corpus, exact 21 demonstrations, and their prompt guidance.
- The promoted 8,577-byte body is Adaptive-5 from the additional-indices
  contract study. Its frozen 94-case regression scored 89/94 in both
  replicates, with zero execution errors and membership safety passing.
- The regression is not a formal winner claim: click invariance remained false.
  The production promotion is an explicit product decision backed by retained
  development evidence.
- Demonstrations and the frozen 94-case evaluation are disjoint Case Selections
  over the same production corpus. Selection algebra proves ID separation and
  Prompt Assembly validates stronger semantic contamination keys.
- The production route has no laboratory dependency. Its instruction bytes,
  demonstration selection, guidance, and assembled regression prompt hash are
  pinned by focused tests.
