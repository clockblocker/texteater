# Production Prompt Parts

A promoted route owns the complete reviewed prompt content and its canonical
Golden Corpus in one place. Its production interface exposes the exact
`promptPart` instruction body, the corpus, the ordered production demonstration
selection, and the guidance rendered with those demonstrations.

Demonstrations, frozen evaluations, diagnostics, and development pools are
immutable Case Selections over that one corpus. Selection algebra proves ID
separation; Prompt Assembly's contamination check additionally rejects repeated
inputs, semantic stimulus fingerprints, and declared contamination keys.

Production Prompt Parts have no dependency on laboratory experiments, runners,
provider clients, or retained results. Laboratory code imports production
content and selects cases from the production corpus; it does not own duplicate
cases.
