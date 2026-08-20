# Context Map

## Contexts

- [tf-demo](./app/tf-demo/CONTEXT.md) presents one shared linguistic graph with occurrence-specific Attestations. Visitors own only Visitor Encounter history.
- [Dumling](./battery/dumling/CONTEXT.md) names the grammatical entities to which learner text resolves.
- [Dumrel](./battery/dumrel/CONTEXT.md) defines typed Reading Knowledge, German linguistic applicability and selection masks, and Reading-owned relations targeting Lemmas.
- [Dumdict](./battery/dumdict/CONTEXT.md) manages learner-owned dictionary records over Dumling entities.
- [Dumgen](./battery/dumgen/CONTEXT.md) resolves learner text through the generation and prompt pipeline.

## Relationships

- **Dumgen → Dumling**: Dumgen resolves learner text into Dumling grammatical entities and uses Dumling schemas at their boundary.
- **Dumdict → Dumling**: Dumdict scopes and stores learner-owned records over Dumling Lemmas, Surfaces, and foundational Reading values; Dumling owns Reading DTOs and tuple equality while Dumdict owns Reading Entries and workflows.
- **Dumrel → Dumling**: Dumrel validates identityless Knowledge values, Lemma relation targets, and Unit Shadows with concrete Dumling DTOs, languages, Canonical Forms, Families, and Kinds.
- **Dumdict → Dumrel**: Dumdict stores direct Reading Knowledge, resolves unambiguous Pending Semantic Relations, and supplies the dictionary inventory to Dumrel's pure relation projection; inferred inverse, closure, substitution, and later-Reading views are never stored while structural Unit Shadows remain durable pointers.
- **Dumgen → Dumrel**: Dumgen receives Dumrel-validated Knowledge Request Masks and projects private model results into Dumrel-validated Knowledge Changes containing pointer-only structures, or Pending Semantic Relations.
- **Dumgen → Dumdict**: Dumgen resolves an encountered Lemma against learner Reading candidates; Dumdict owns the resulting learner dictionary records and storage changes.
- **tf-demo → Dumling**: tf-demo persists host-owned canonical Lemma, Surface, and Reading records and reconstructs ID-less Dumling Attestation values from occurrence-specific records and Segment memberships.
- **tf-demo → Dumdict**: tf-demo supplies one hosted Shared Demo Dictionary scope and atomically applies Dumdict-planned changes with occurrence and Visitor Encounter persistence.
- **tf-demo → Dumgen**: tf-demo persists Dumgen's immutable Segmented Sentences and resolution results, deriving marked context and Attestation members from ordered Segment memberships.
- **tf-demo → Dumrel**: tf-demo stores global Knowledge Settings and uses Dumrel's pure applicability and intersection operations; server generation receives the complete applicable German mask.
