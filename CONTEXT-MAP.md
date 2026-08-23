# Context Map

## Contexts

- [tf-demo](./app/tf-demo/CONTEXT.md) presents one shared linguistic graph with occurrence-specific Attestations. Visitors own only Visitor Encounter history.
- [Dumling](./battery/dumling/CONTEXT.md) names the grammatical entities to which learner text resolves.
- [Dumrel](./battery/dumrel/CONTEXT.md) defines typed Reading Knowledge, German linguistic applicability and selection masks, homogeneous Semantic Relations, and separate Grammatical Relations.
- [Dumdict](./battery/dumdict/CONTEXT.md) manages learner-owned dictionary records over Dumling entities.
- [Dumgen](./battery/dumgen/CONTEXT.md) resolves learner text through the generation and prompt pipeline.
- [Dumtrain](./battery/dumtrain/CONTEXT.md) owns sentence-analysis corpora, evaluation, and local grammatical model releases.

## Relationships

- **Dumgen → Dumling**: Dumgen resolves learner text into Dumling grammatical entities and uses Dumling schemas at their boundary.
- **Dumdict → Dumling**: Dumdict scopes and stores learner-owned records over Dumling Lemmas, Surfaces, and foundational Reading values; Dumling owns Reading DTOs and tuple equality while Dumdict owns Reading Entries and workflows.
- **Dumrel → Dumling**: Dumrel validates identityless Knowledge values, homogeneous Semantic and Grammatical Relation endpoints, and Unit Shadows with concrete Dumling DTOs, languages, Canonical Forms, Families, and Kinds.
- **Dumdict → Dumrel**: Dumdict stores direct Reading Knowledge, resolves Pending Semantic Relations in the default Lemma Target Mode, and supplies the dictionary inventory to Dumrel's pure relation projection; it also carries direct Grammatical Relation claims. Inferred inverse, closure, and substitution views are never stored.
- **Dumgen → Dumrel**: Dumgen receives Dumrel-validated Knowledge Request Masks and projects private model results into Dumrel-validated Knowledge Changes containing pointer-only structures, or Pending Semantic Relations.
- **Dumgen → Dumdict**: Dumgen resolves an encountered Lemma against learner Reading candidates; Dumdict owns the resulting learner dictionary records and storage changes.
- **Dumtrain → Dumgen**: Dumtrain labels and evaluates complete sentence-wide versions of Dumgen's High-Level Whole Unit and Grammatical Resolution contracts; an accepted local Model Release may satisfy Dumgen's sentence-analysis seam without changing Reading or Knowledge operations.
- **Dumtrain → Dumling**: Dumtrain validates labelled and predicted Attestations, Surfaces, and Lemmas with Dumling schemas but does not redefine their grammatical identity.
- **tf-demo → Dumling**: tf-demo persists host-owned canonical Lemma, Surface, and Reading records and reconstructs ID-less Dumling Attestation values from occurrence-specific records and Segment memberships.
- **tf-demo → Dumdict**: tf-demo supplies one hosted Shared Demo Dictionary scope and atomically applies Dumdict-planned changes with occurrence and Visitor Encounter persistence.
- **tf-demo → Dumgen**: tf-demo persists Dumgen's immutable Segmented Sentences and resolution results, deriving marked context and Attestation members from ordered Segment memberships.
- **tf-demo → Dumrel**: tf-demo stores global Knowledge Settings, uses Dumrel's pure applicability and intersection operations, and persists direct Grammatical Relation claims separately from Semantic Relations; server generation receives the complete applicable German mask.
