---
status: accepted
partially-supersedes: 0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
---

# Attestation supersedes Selection and owns realization coverage

This decision supersedes only the Selection topology, Selection identity, and
Surface realization-coverage clauses of ADR 0002. ADR 0002 remains accepted
for Lemma grammatical identity, Surface-to-Lemma linkage, and the boundary
between grammatical Lemmas and dictionary-scoped Readings. ADR 0008 later
moves the foundational Reading value and its identity operation into Dumling
without adding Reading to the Attestation or changing that semantic boundary.

Dumling's grammatical resolution chain is now:

```text
Attestation -> Surface -> Lemma
```

## Attestation contract

An Attestation is a fleeting, click-independent occurrence value:

```text
Attestation {
  members: non-empty ordered AttestationMember list
  realizationCoverage: Full | Partial
  surface: Surface
}

AttestationMember {
  attested: non-empty string
  orthography: Standard | Typo
}
```

The linked Surface carries language, Family, Kind, and grammatical feature
correlation. Attestation adds no language-, Family-, or Kind-specific fields.
It contains no sentence ID, clicked index, Segment/member indices, marked
context, flattened attested string, duplicated normalized projection, or ID.

`Full` means the occurrence completely realizes the linked grammatical entity
under a licensed realization. `Partial` means material belonging to that entity
is absent while the exact Surface and Lemma remain defensible. Discontinuity,
intervening context, typo repair, casing repair, and missing arguments or other
valency participants do not by themselves make an Attestation Partial. A
licensed conventional short form is a Full Variant Surface.
An official German Ergänzungsstrich realization with the narrowly licensed
NOUN contextual completion is likewise `Full`, not `Partial`.

## Identity and retention

Attestation has value equality only. Dumling provides no Attestation identity,
ID codec, repository, durable lifecycle, versioned standalone wire format, or
archival/replay contract. Ordinary strict JSON transport is supported wherever
the containing application already transports the value.

The Selection public API and its readable CSV/base64url IDs are removed with no
alias, decoder, adapter, data migration, or route-compatibility promise.

## Preserved identity decisions

Lemma identity remains exactly the tuple fixed by ADR 0002: language,
`canonicalForm`, Family, Kind, and Core Features.

Surface remains persistent. Its identity remains language,
`normalizedSurface`, Surface Kind, applicable inflectional features, and Lemma
identity. Moving realization coverage from Surface to Attestation does not
change Surface identity bytes when those identity inputs are unchanged.
Licensed `Canonical | Variant` spelling remains on Surface.

## Consequences

- Dumling exposes `Lemma`, `Surface`, and `Attestation`.
- Each Attestation member carries its own `Standard | Typo` evidence.
- Dumgen owns marked context, clicks, Segmented Sentence identity, target
  membership, member Segment indices, and their validation.
- Exact source reconstruction and interaction routing occur outside Dumling.
- Target Classification may return `Unresolved` before a route is fixed.
  Grammatical Resolution is total after valid classification: malformed or
  indefensible model output is an execution/contract error, never a speculative
  Partial Attestation or a linguistic `Unresolved` result.
