# Selection Features Plan

## Migration Stance

This change is a clean break.

We are not preserving backwards compatibility for:

- old selection DTO field names
- old selection schema tree shape
- old descriptor shape where selection identity includes `orthographicStatus`
- old readable CSV selection rows
- old compact-token and base64url selection encodings

The goal is to make the model correct and internally coherent rather than carry
forward legacy structure that we already consider mistaken.

## Goal

Replace the current always-present selection-level axes

- `orthographicStatus`
- `selectionCoverage`
- `spellingRelation`

with a sparse nested bag that only stores marked values.

At the same time, model archaicity on the resolved surface rather than on the
selection-to-surface relation.

## Secondary Goal

Use this redesign to simplify the type helpers, schema helpers, and builder
infrastructure around selections.

Dropping the `OS` generic is not just DTO cleanup. In the current codebase it
removes one full top-level branching axis from several of the most abstract
parts of the system.

## Agreed Target Shape

```ts
type SelectionFeatures = {
	orthography?: "Typo";
	coverage?: "Partial";
	spelling?: "Variant";
};

type SurfaceFeatures = {
	historicalStatus?: "Archaic";
};

type AbstractSelection<
	L extends string = string,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaKind = LemmaKind,
	LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = {
	language: L;
	selectionFeatures?: SelectionFeatures;
	spelledSelection: string;
	surface: AbstractSurface<L, SK, LK, LSK>;
};

type AbstractSurface<
	L extends string = string,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaKind = LemmaKind,
	LSK extends AbstractLemmaSubKindFor<LK> = AbstractLemmaSubKindFor<LK>,
> = {
	language: L;
	normalizedFullSurface: string;
	surfaceKind: SK;
	surfaceFeatures?: SurfaceFeatures;
	lemma: AbstractLemma<L, LK, LSK>;
} & AbstractSurfacePayload<SK, LK, LSK>;
```

## Semantic Split

`selectionFeatures` describes how the attested highlighted string relates to the
resolved surface.

- `orthography?: "Typo"` means the attested selection is misspelled
- `coverage?: "Partial"` means the learner selected only part of the resolved
  surface
- `spelling?: "Variant"` means the attested selection is a licensed
  non-canonical spelling relative to the resolved surface

`surfaceFeatures` describes properties of the resolved surface itself.

- `historicalStatus?: "Archaic"` belongs here because it marks the normalized
  resolved surface, not the mismatch between attestation and resolution

This keeps `Archaic` separate from stylistic notions like `Formal` or
`Colloquial`.

## Intended Defaults

Absence means the unmarked default.

- missing `selectionFeatures.orthography` => standard orthography
- missing `selectionFeatures.coverage` => full coverage
- missing `selectionFeatures.spelling` => canonical spelling relation
- missing `surfaceFeatures.historicalStatus` => not historically marked

This is the main cleanup win: we stop serializing `"Standard"`, `"Full"`, and
`"Canonical"` as mandatory noise.

## Type-Level Consequences

### Selection generics

`AbstractSelection` no longer needs the `OS` generic parameter.

The same should happen to the public `Selection` type unless we discover a
strong reason to preserve the old orthography-keyed indexing model.

Today the public selection type is parameterized as:

```ts
Selection<L, OS, SK, LK, LSK>
```

The target direction is:

```ts
Selection<L, SK, LK, LSK>
```

### Expected simplification win

After reading the current code, this looks like a meaningful simplification,
not a marginal one.

The main win is that `OS` is currently used as a structural index in type maps
and schema trees rather than as a lightweight payload field.

Today that extra axis shows up in several places:

- public selection typing in `Selection<L, OS, SK, LK, LSK>`
- concrete-language selection maps in
  `LanguageSelectionByOrthographicStatusMap`
- schema helper types where selection subtrees are keyed as
  `[OS in OrthographicStatus]`
- selection descriptor schema trees with the same extra branch
- generated declaration output in `scripts/build-types.ts`
- create / convert helper signatures that thread `TStatus extends
  OrthographicStatus`

In practice, removing `OS` should produce these concrete wins:

- collapse the concrete selection map shape from
  `language -> orthography -> surfaceKind -> lemmaKind -> lemmaSubKind`
  to
  `language -> surfaceKind -> lemmaKind -> lemmaSubKind`
- remove duplicated `Standard` / `Typo` schema construction in shared builders
- remove duplicated `Standard` / `Typo` branches in descriptor-schema builders
- remove the `Selection.Standard...` / `Selection.Typo...` schema access shape
- simplify selection-related conditional helper types in `api-shape.ts`
- simplify declaration generation because selection schema and descriptor schema
  trees no longer need an `OrthographicStatus` index

This is probably the single biggest technical payoff of the redesign aside from
the DTO semantics themselves.

### Selection options

`SelectionOptionsFor` should move from top-level explicit defaults

```ts
{
	orthographicStatus?: OS;
	selectionCoverage?: SelectionCoverage;
	spellingRelation?: SpellingRelation;
	spelledSelection?: string;
}
```

to a bag-shaped form

```ts
{
	selectionFeatures?: SelectionFeatures;
	spelledSelection?: string;
}
```

### Surface features

`Surface` and `AbstractSurface` both need `surfaceFeatures?: SurfaceFeatures`.

This is better than putting `Archaic` into `inflectionalFeatures`, because
citation surfaces may also be archaic.

## Runtime and Schema Consequences

### Selection parsing / creation

Current language APIs expose:

- `create.selection.standard(...)`
- `create.selection.typo(...)`

That split mirrors the old `orthographicStatus` axis and likely becomes
unnecessary.

Target direction:

- replace the `standard` / `typo` split with one callable
  `create.selection(...)`
- accept `selectionFeatures?: SelectionFeatures`
- treat omitted features as defaults

Explicit decision:

- do not keep `create.selection` as a namespace object with one remaining
  method
- make `create.selection` itself the single creation entrypoint

### Selection schemas

Current schema trees are keyed by orthographic status:

```ts
schemasFor.en.entity.Selection.Standard...
schemasFor.en.entity.Selection.Typo...
```

That tree shape should be flattened because orthography is no longer a primary
selection discriminator.

Target direction:

```ts
schemasFor.en.entity.Selection.Inflection...
schemasFor.en.entity.Selection.Citation...
```

or another surface-kind-first shape with no `Standard` / `Typo` branch.

### Descriptors

Current selection descriptors include `orthographicStatus`.

That should be removed from descriptor identity unless we explicitly decide that
selection descriptors should still encode selection-level markedness.

Default recommendation:

- keep descriptors structural
- include `language`, `surfaceKind`, `lemmaKind`, `lemmaSubKind`
- do not include `selectionFeatures`

Reason: `Typo`, `Partial`, and `Variant` describe attestation relation, not the
core resolved payload family.

## Serialization Consequences

The current readable CSV and compact token codecs serialize the old explicit
fields directly.

Affected axes:

- readable CSV selection rows
- tiny token maps
- base64url IDs built on top of compact tokens
- descriptor CSV rows

We are explicitly taking the breaking-cleanup route.

- replace old columns / token segments with encoding based on the new sparse
  feature bags
- update fixtures, docs, and generated attestations to match
- do not add a compatibility layer for legacy selection payloads
- keep the tiny CSV version label as `v1`

Because this is greenfield and we are not carrying external compatibility
constraints, there is no reason to introduce a `v2` namespace for a format we
are redefining in place.

### Sparse row policy

The target serialization policy is sparse rather than fixed-width for optional
feature bags.

If all values in a feature bag are default / `undefined`, there should be no
serialized bag payload in the row.

Examples:

- unmarked citation surface should serialize as
  `Surface,Citation,see,Lemma,de,Lexeme,NOUN,see,🌊,gender=Masc`
- archaic citation surface should serialize as
  `Surface,Citation,lot,historicalStatus=Archaic,Lemma,de,Lexeme,NOUN,lot,⚖️,gender=Neut`
- unmarked selection should serialize as
  `Selection,See,Surface,Citation,see,Lemma,de,Lexeme,NOUN,see,🌊,gender=Masc`
- marked selection should serialize as
  `Selection,gvae,orthography=Typo|coverage=Partial|spelling=Variant,Surface,Citation,give up,Lemma,en,Lexeme,VERB,give up,⬆️,`

In other words:

- no placeholder empty column for `selectionFeatures`
- no placeholder empty column for `surfaceFeatures`
- presence of the bag column means at least one non-default feature is encoded

This matches the semantic goal of the redesign: default values should disappear
from serialized selection and surface identities rather than survive as empty
structure.

### Empty bag canonicality

Empty feature bags are non-canonical and should be rejected.

- `selectionFeatures: {}` => reject
- `surfaceFeatures: {}` => reject

If a feature bag is present, it must contain at least one non-default value.
Otherwise the bag should be omitted entirely.

This rule should hold consistently across:

- create APIs
- parse APIs
- readable CSV decoding
- tiny CSV and base64url decoding

This keeps round-tripping canonical and aligned with the sparse-row policy.

### Codec strictness

The break is complete.

New decoders should reject:

- legacy fixed-width selection rows using
  `orthographicStatus,selectionCoverage,spellingRelation`
- legacy selection IDs and tiny CSV payloads based on that shape

They should not silently translate legacy payloads into the new model.

## Migration Order

1. Update core/public/abstract types.
2. Add `SelectionFeatures` and `SurfaceFeatures`.
3. Remove `OS` from `AbstractSelection` and public `Selection`.
4. Update selection builders and convert helpers.
5. Flatten selection schema registries and schema tree declarations.
6. Update create/parse APIs to accept `selectionFeatures`.
7. Update descriptors and decide whether selection-level features belong in
   descriptor identity.
8. Update CSV / token / ID codecs.
9. Rewrite tests, fixtures, README examples, and generated docs-site
   attestations.

## Open Decisions

### 1. Should `selectionFeatures` be optional or always present?

Recommendation:

- make the object itself optional
- avoid serializing an empty bag

### 2. Should descriptors include selection-level features?

Recommendation:

- no

If we later need a descriptor for attestation-shape analysis rather than
resolved payload analysis, that should probably be a separate descriptor kind.

### 3. How should schema trees be reshaped?

Recommendation:

- remove the `Standard` / `Typo` branch entirely
- key selection schemas by resolved surface family only

## Non-Goals

- introducing broader stylistic surface marking such as `Formal` or
  `Colloquial`
- redefining lemma-level inherent features
- changing the surface/lemma hydration rule for selections
