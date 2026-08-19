# Production Prompt Parts

A promoted route owns the complete reviewed prompt content and its canonical
Golden Corpus in one place. Its production interface exposes the exact
`promptPart` instruction body, the corpus, the ordered production demonstration
selection, and the guidance rendered with those demonstrations.

Demonstrations, frozen evaluations, diagnostics, and development pools are
immutable Case Selections over that one corpus. Selection algebra proves ID
separation; Prompt Assembly's contamination check also rejects repeated
inputs, semantic stimulus fingerprints, and declared contamination keys.

Production Prompt Parts have no dependency on laboratory experiments, runners,
provider clients, or retained results. Laboratory code imports production
content and selects cases from the production corpus; it does not own duplicate
cases.

An execution-ready production route also owns its selected model representation,
Prompt Source, and deterministic Generated System Prompt. `PROMPT_CATALOG`
imports the generated production artifact together with the production schemas
and projection Adapter; it never assembles prompt text at runtime.
