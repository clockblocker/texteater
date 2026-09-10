I found 54 exported types: 8 API shapes, `Descriptor`, and 45 public-model types. [`types.ts`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types.ts:1) is only a three-line barrel; the actual definitions come from [`api-shape.ts`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/api-shape.ts:23), [`descriptor.ts`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types/descriptor.ts:10), and [`public-types.ts`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types/public-types.ts:33).

- 25 types are directly named by six other workspace packages.
- 2 additional types are used only by repository tooling.
- 27 have no direct consumer outside `dumling`.
- Every external import is type-only.

## Audit findings

1. **[P2] Factory return types can promise fields absent at runtime.**  
   [`LanguageApi.create.surface.*` and `create.attestation`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/api-shape.ts:81) return caller-selected generic subtypes. Their implementations reconstruct canonical objects and discard additional fields at [`create.ts:19`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/shared/create/create.ts:19) and [`create.ts:52`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/shared/create/create.ts:52). A caller can therefore receive a value typed as having an extra field that does not exist. Return a canonical `Surface`/`Attestation` derived from the coordinates instead of arbitrary input subtypes.

2. **[P2] `SurfaceIdentity` permits impossible states.**  
   [`SurfaceIdentity`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types/public-types.ts:422) allows Citation identities with `inflectionalFeatures`, Inflection identities without them, and an arbitrary `Record<string, unknown>` feature bag. The decoder first validates a correlated `Surface` at [`readable-csv.ts:303`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/shared/id/id-codec/readable-csv.ts:303), but then widens it to this weaker public shape. Dumdict also re-exports the type.

3. **[P3] The barrel makes a broad semver commitment.**  
   Twenty-nine exports have no direct package consumer through the published boundary; two of those are only private tooling dependencies. The low-level `Abstract*` and feature-calculus types are especially likely candidates for an advanced/internal subpath. Removal still requires checking consumers outside this repository.

4. **[P3] The language inventory is manually duplicated.**  
   [`DumlingApi`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/api-shape.ts:23) hard-codes `de`, `en`, and `he`; the runtime repeats them in [`operations/index.ts`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/index.ts:6), and Dumdict mirrors them. It currently agrees with [`SupportedLanguage`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types/core/enums.ts:3), but adding a language requires synchronized edits.

A lower-priority watch item: `Descriptor<"Surface">` and `Descriptor<"Attestation">` are structurally identical in [`descriptor.ts`](/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types/descriptor.ts:22), so the entity kind cannot be recovered or discriminated from the object.

::code-comment{title="[P2] Factory promises discarded subtype fields" body="These methods return caller-selected TSurface/TAttestation subtypes, but the runtime factories reconstruct canonical objects and discard additional fields. Return canonical entity types derived from the input coordinates instead." file="/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/operations/api-shape.ts" start=81 end=110 priority=2}

::code-comment{title="[P2] SurfaceIdentity permits impossible states" body="The independent optional Record shape loses the Citation-versus-Inflection feature correlation already enforced by Surface validation. Define the identity as a correlated union or derive it distributively from Surface." file="/Users/annagorelova/work/textfresser-batteries/battery/dumling/src/types/public-types.ts" start=422 end=428 priority=2}

## Types with outside consumers

| Exported type(s) | Consumers | Why |
|---|---|---|
| `DumlingApi`, `LanguageApi` | `dumdict` | Implements its lazy compatibility API and selects parser/ID operations. |
| `ApiResult`, `ParseError` | `dumdict` | Adapts lightweight parsing into Dumling’s public result shape. |
| `IdDecodeSuccess`, `DumlingCsv` | `dumdict` | Inspects decoded IDs and brands persisted Surface/Lemma IDs. |
| `LemmaIdentity`, `SurfaceIdentity` | `dumdict` | Exposes decoded linguistic identities through its facade. |
| `CoreFeaturesFor` | `dumdict` | Preserves the exact creation-feature contract in its re-exported API. |
| `SupportedLanguage` | `dumdict`, `dumrel`, `@texteater/tf-demo`, `@dumling/docs-site`; tooling | Shared language coordinate for storage, relations, application code, documentation, and parser contracts. |
| `Language` | `@texteater/tf-demo` | Alias used for the app’s supported target-language type. |
| `EntityKind` | `dumdict`, `@dumling/docs-site` | Validation dispatch and classification of documentation entities. |
| `EntityValue` | `@dumling/docs-site` | Lets generator helpers accept Lemmas, Surfaces, or Attestations uniformly. |
| `LemmaFamilyFor`, `LemmaKindFor` | `dumdict`, `dumrel`, `dumgen`, `@texteater/tf-demo`; tooling | Constrains language-specific grammatical coordinates. |
| `LemmaRoute` | `dumgen`, `@texteater/tf-demo` | Fixed-versus-generated knowledge dispatch and application fixtures. |
| `SurfaceKindFor`, `LemmaFamilyForSurfaceKind` | Tooling only | Freezes the parser-interface contract in [`tooling/dumling-parser-interface.ts`](/Users/annagorelova/work/textfresser-batteries/tooling/dumling-parser-interface.ts:1). |
| `Lemma` | All six packages; tooling | Canonical grammatical identity used by storage, relations, generation, application, docs, and laboratory contracts. |
| `Surface` | `dumdict`, `dumgen`, `@texteater/tf-demo`, `@dumling/docs-site`, `@texteater/laboratory`; tooling | Persistent grammatical forms and typed fixtures. Dumgen’s direct use is test-only. |
| `Attestation` | `dumdict`, `dumgen`, `@texteater/tf-demo`, `@dumling/docs-site`, `@texteater/laboratory`; tooling | Occurrence evidence. The docs site alone type-checks 258 corpus fixtures with it. |
| `Reading` | `dumdict`, `dumrel`, `dumgen`, `@texteater/tf-demo`, `@texteater/laboratory`; tooling | Semantic identities in knowledge, relation, persistence, and UI contracts. |
| `InflectionalFeaturesFor` | `@texteater/tf-demo` | Narrows feature access in the note renderer. |
| `PresentedFeatureSet`, `PresentedLemma`, `PresentedSurface`, `PresentedAttestation` | `@texteater/tf-demo` | Defines the Convex presentation projection and validators. |

The six dependent packages are `dumdict`, `dumrel`, `dumgen`, `@texteater/tf-demo`, `@dumling/docs-site`, and `@texteater/laboratory`.

## Types without a direct outside consumer

These may still occur transitively inside imported types; “unused” means no outside source names them directly.

| Category | Exported types |
|---|---|
| Fine-grained API errors | `ParseErrorCode`, `IdDecodeErrorCode`, `IdDecodeError` |
| Descriptor | `Descriptor` |
| Fundamental aliases/shapes | `LemmaFamily`, `LemmaKind`, `SurfaceKind`, `AttestationMember`, `SurfaceFeatures` |
| Entity selector | `EntityForKind` |
| Additional encoded brands | `DumlingDescriptorCsv`, `DumlingBase64Url` |
| Route selectors | `LemmaKindForSurfaceKind`, `LemmaForRoute` |
| Reading identity brand | `ReadingFingerprint` |
| Feature/options machinery | `FeatureSetKind`, `FeatureSet`, `AbstractFeatureValue`, `FeatureName`, `FeatureValue`, `AttestationOptionsFor` |
| Low-level abstract re-exports | `AbstractAttestation`, `AbstractCoreFeaturesFor`, `AbstractInflectionalFeaturesFor`, `AbstractLemma`, `AbstractLemmaKindFor`, `AbstractSurface` |

No repository files were changed.