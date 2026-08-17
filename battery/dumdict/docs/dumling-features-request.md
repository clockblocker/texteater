# Dumling integration status

The Dumdict model now consumes the settled Dumling contract directly.

## Upstream contract in use

- `Lemma` with Canonical Form, Family, Kind, and Core Features
- persistent `Surface` values with normalized contextual form, spelling status,
  Surface kind, applicable features, and their resolved Lemma
- foundational `Reading` values, `readingSchema`, and the stable
  `readingFingerprint` identity operation
- language-specific create, parse, extract, convert, describe, and ID APIs
- `getLanguageApi` and `supportedLanguages`

`src/dumling.ts` is intentionally small. It re-exports the upstream type
vocabulary and adds only Dumdict's persisted `SurfaceId` wrapper,
`makeSurfaceId`, and an ID inspection helper.

## Identity and retention boundary

Dumdict consumes Dumling Lemma, Surface, and Reading identity directly.
`makeSurfaceId` encodes Dumling's documented Surface identity tuple.
Dumling Attestation terminates at the upstream resolution boundary. Dumdict
neither stores nor re-exports that fleeting occurrence value; it consumes the
resolved Lemma and persistent Surface needed by learner dictionary records.

Reading remains separate from Lemma and Surface identity. Dumdict establishes
the learner or hosted-dictionary scope and owns Reading Entries and workflows;
the foundational Reading value and its fingerprint belong to Dumling.

## No compatibility layer

Dumdict exposes no aliases for the retired Selection model. Consumers resolve
Attestation upstream, then use its Lemma and Surface with Dumdict.
