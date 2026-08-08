# `dumling`

## The best parts of computational linguistics with a typesafe API

`dumling` is inspired by [Universal Dependencies](https://universaldependencies.org/)
and provides types and Zod schemas for learner-facing meaning-focused segmentation.

This package ships working runtime surfaces for `de`, `en`, and `he`.

`dumling` keeps three linked DTOs separate:

- `Lemma`: the normalized grammatical identity
- `Surface`: a persistent normalized form that carries licensed spelling and inflection
- `Attestation`: fleeting, click-independent occurrence evidence linked to one Surface

## Entrypoints

| Import path      | Purpose                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `dumling`        | Root runtime API: `dumling.<language>`, `getLanguageApi`, and `supportedLanguages`              |
| `dumling/types`  | Public DTOs, feature helpers, descriptors, and API/result/error types                           |
| `dumling/schema` | Concrete runtime schema registry: `schemasFor` and `getSchemaTreeFor(language)`                 |

## Runtime API

Each concrete language namespace (`dumling.de`, `dumling.en`, `dumling.he`) exposes:

- `create`: explicit constructors for `lemma`, `surface.citation`, `surface.inflection`, and `attestation`
- `convert`: convenience projections from `lemma -> surface`, `lemma -> attestation`, and `surface -> attestation`
- `extract`: entity accessors such as `extract.lemma(...)`
- `parse`: safe parsing returning `ApiResult<T, ParseError>`
- `describe`: descriptor helpers via `describe.as.*` and canonical descriptor CSV via `describe.asCsv.*`
- `id`: stable identity encode/decode helpers; decoding returns identity keys, not hydrated DTO graphs

The root runtime entrypoint also exposes:

- `supportedLanguages`: the curated runtime language inventory
- `getLanguageApi(language)`: dynamic access to a language-bound workflow API

## Public types

`dumling/types` exports:

- DTOs: `Lemma`, `Surface`, `Attestation`
- Entity and ID helpers: `EntityValue`, `EntityForKind`, `DumlingCsv`, `DumlingBase64Url`, `AttestationOptionsFor`
- Language-aware helper types: `LemmaFamilyFor`, `LemmaKindFor`, `SurfaceKindFor`, `LemmaFamilyForSurfaceKind`
- Feature typing helpers: `FeatureSet`, `FeatureName`, `FeatureValue`, `CoreFeaturesFor`, `InflectionalFeaturesFor`
- Descriptors and API shapes: `Descriptor`, `DumlingApi`, `LanguageApi`, `DumlingDescriptorCsv`
- Result and error types: `ApiResult`, `ParseError`, `IdDecodeError`, `IdDecodeSuccess`

## Core idea

Start with a German noun Lemma, build the linked learner-facing entities explicitly, and then use the runtime helpers for parsing and IDs.

The `Lemma` is the normalized grammatical identity:

<!-- README_BLOCK:core-lemma -->

The `Surface` is the normalized contextual form that the note belongs to:

<!-- README_BLOCK:core-surface -->

The `Attestation` records non-empty ordered member evidence, per-member
orthography, and whether the occurrence fully or partially realizes the Surface:

<!-- README_BLOCK:core-attestation -->

Readable identities make the ownership boundary explicit. Lemma and Surface
have stable identities; Attestation deliberately has no identity or ID codec:

<!-- README_BLOCK:core-attestation-id-examples -->

## Quickstart

Install the package:

```sh
npm install dumling
```

Minimal end-to-end usage:

<!-- README_BLOCK:quickstart-de -->

`schemasFor.de.entity.*`, `schemasFor.en.entity.*`, and `schemasFor.he.entity.*` expose concrete Zod schema getters. Leaf calls return Zod schemas for validators, LLM response-schema callers, and other schema-consuming APIs.

## Concepts / Search Terms

People often look for this package using adjacent terms:

- linguistic annotation
- learner annotation
- Lemma and inflection modeling
- surface form normalization
- attestation DTOs
- Zod schema registries
- stable linguistic IDs

## Model notes

The public DTO model assigns each distinction to the layer that owns it:

- `Attestation.members` preserves ordered, possibly discontinuous source text with `Standard | Typo` evidence per member
- `Attestation.realizationCoverage` distinguishes full and partial realizations, such as `heulte mit` for `mit den Wölfen heulen`
- `Surface.spelling` distinguishes canonical and licensed variant spellings, such as `armor` / `armour`
- inflectional features and Lemma identity belong to the Surface

Attestations are always hydrated:

- an `Attestation` always contains a `Surface`
- a `Surface` always contains a `Lemma`

Lemma families also include `Construction` for learner-facing patterned entities such as fused forms like German `zum`, `zur`, or `beim`, and paired frames like `um_zu`. Construction Lemmas are citation-only today.

Dumling stops at Lemma. Learner-scoped semantic identity is a `Reading`—the
pair of a Lemma and an emoji description—and belongs outside this package.

## Scope

- Runtime today: `de`, `en`, `he`
- Runtime: `Node >= 24`
- Package format: ESM

For repo development:

- `bun test`
- `bun run test:package`
- `bun run build`
- `bun run generate:readme`
