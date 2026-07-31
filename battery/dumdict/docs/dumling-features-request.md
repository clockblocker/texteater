# Dumling integration status

The Dumdict model now consumes the settled Dumling contract directly.

## Upstream contract in use

- opaque `LinguisticEntryId` values
- `LinguisticEntry` with `citationForm`, family, subkind, and inherent features
- `Surface` with `normalizedSurface`, spelling status, realization coverage,
  Surface kind, applicable features, and its resolved Entry
- `Selection` identified by Segmented Sentence ID plus clicked Segment index
- language-specific create, parse, extract, convert, describe, and ID APIs
- `getLanguageApi` and `supportedLanguages`

`src/dumling.ts` is intentionally small. It re-exports the upstream vocabulary
and adds only Dumdict's persisted `SurfaceId` wrapper, `makeSurfaceId`, and an ID
inspection helper.

## Identity boundary

Dumdict does not derive Linguistic Entry identity from Citation Form or
grammatical features. Entry IDs are opaque and come from resolution or
curation. `makeSurfaceId` encodes Dumling's documented Surface identity tuple.

Learner Meaning IDs belong to Dumdict and are opaque caller-supplied values.
They are not Dumling entity IDs and do not participate in Entry or Surface
identity.

## No compatibility layer

Dumdict exposes no aliases for the retired identity model. Consumers migrate to
`LinguisticEntry`, `MeaningEntry`, `Surface`, and `Selection` directly.
