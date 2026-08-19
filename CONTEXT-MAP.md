# Context Map

## Contexts

- [tf-demo](./app/tf-demo/CONTEXT.md) presents one shared linguistic graph with occurrence-specific Attestations. Visitors own only Visitor Encounter history.
- [Dumling](./battery/dumling/CONTEXT.md) names the grammatical entities to which learner text resolves.
- [Dumrel](./battery/dumrel/CONTEXT.md) defines typed Lemma and Reading Knowledge and the relations between them.
- [Dumdict](./battery/dumdict/CONTEXT.md) manages learner-owned dictionary records over Dumling entities.
- [Dumgen](./battery/dumgen/CONTEXT.md) resolves learner text through the generation and prompt pipeline.

## Relationships

- **Dumgen → Dumling**: Dumgen resolves learner text into Dumling grammatical entities and uses Dumling schemas at their boundary.
- **Dumdict → Dumling**: Dumdict scopes and stores learner-owned records over Dumling Lemmas, Surfaces, and foundational Reading values; Dumling owns Reading DTOs and tuple equality while Dumdict owns Reading Entries and workflows.
- **Dumrel → Dumling**: Dumrel validates identityless Knowledge values and Unit Shadows with concrete Dumling Lemma DTOs, languages, Canonical Forms, Families, and Kinds.
- **Dumdict → Dumrel**: Dumdict stores Knowledge and cleans up Pending Semantic Relations using Dumrel's Knowledge vocabulary and relation algebra; structural Unit Shadows remain durable pointers.
- **Dumgen → Dumrel**: Dumgen projects private model results into Dumrel-validated Knowledge Changes containing pointer-only structures, or Pending Semantic Relations.
- **Dumgen → Dumdict**: Dumgen resolves an encountered Lemma against learner Reading candidates; Dumdict owns the resulting learner dictionary records and storage changes.
- **tf-demo → Dumling**: tf-demo persists host-owned canonical Lemma, Surface, and Reading records and reconstructs ID-less Dumling Attestation values from occurrence-specific records and Segment memberships.
- **tf-demo → Dumdict**: tf-demo supplies one hosted Shared Demo Dictionary scope and atomically applies Dumdict-planned changes with occurrence and Visitor Encounter persistence.
- **tf-demo → Dumgen**: tf-demo persists Dumgen's immutable Segmented Sentences and resolution results, deriving marked context and Attestation members from ordered Segment memberships.
