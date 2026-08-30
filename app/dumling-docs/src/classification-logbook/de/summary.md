# Common Mistakes

## Typo Handling

Do not normalize noisy input on the Attestation. Preserve each exact source
string in `attestation.members`, mark each misspelled member with
`orthography: "Typo"`, and keep
`surface.normalizedSurface` linguistically normalized.

Source: `Im_Heft_stand_[Filosofie]_statt_Philosophie.ts`

## Variant Versus Typo

A licensed spelling is not a typo. Put `spelling: "Variant"` on the Surface and
keep the corresponding member's `orthography: "Standard"`. Ordinary
sentence-initial capitalization remains a Canonical Surface.

## Non-Fixed Phrases

If the clicked material is not part of a fixed expression, do not inflate it
into a Phraseme. Resolve the learner-facing token normally.

Source: `[Wegen]_dem_Regen_kamen_wir_zu_spät.ts`

## Reading Ownership

Historical rows incorrectly stored scene-level emoji meaning on Dumling
entities. Current correction: Dumling owns the foundational Reading value, its
schema, equality, and stable identity operation. A dictionary owns the learner
or hosted scope, records, and workflows, and Reading Resolution still happens
downstream from grammatical resolution.

## Review Span Versus Attestation Coverage

A docs review span around one component does not make the Attestation Partial.
`members` contains all attested components. `realizationCoverage` belongs to
the Attestation and is Partial only when its evidence omits part of the linked
Surface's conventional realization.

## No Attestation Identity

Attestation is fleeting, click-independent evidence and has no ID. Sentence,
click, segment, and review-marker state stays outside Dumling. Several
application interaction records may reuse the same Attestation.

# Locked-In Rules

## Typo Attestations

- ordered members preserve noisy text such as `Filosofie` or `gvae` plus `up`.
- every member carries its own `orthography` evidence.
- `normalizedSurface` stays normalized, such as `Philosophie` or `gave up`.
- Surface `spelling` remains Canonical when the input is merely misspelled.

## Fixed Expressions And Partial Realization

For a full fixed expression occurrence, include every attested component and
use a Full Attestation even if docs review only one component. Multiple review
records may point to that same Attestation and Surface.

Use a Partial Attestation only when the evidence omits conventional material.
Example: `heulte mit` can be a Partial Attestation linked to an inflected Surface of the Lemma
with `canonicalForm: "mit den Wölfen heulen"`.

Sources include:

- `Bei_dieser_Formel_verstehe_ich_nur_[Bahnhof].ts`
- `Damit_triffst_du_den_[Nagel]_auf_den_Kopf.ts`
- `Genau_da_liegt_der_[Hase]_im_Pfeffer.ts`
- `[Morgenstund]_hat_Gold_im_Mund_sagte_sie_verschlafen.ts`

## Discontinuous Morphemes

A reviewed `ge` can resolve the full discontinuous circumfix occurrence
`ge … t`. Record both source-ordered members, preserve the attested strings, and
resolve it to the Lemma with `canonicalForm: "ge-...-t"`.

Source: `In_[ge]lacht_markieren_ge_und_t_zusammen_das_Partizip.ts`

## Citation-Shaped Nouns

If a German noun token is identical to its learner-facing Grundform, it may
stay a Citation Surface when local syntax does not decisively resolve an
inflectional reading.

## Adpositions

For non-fixed phrases like `[Wegen] dem Regen`, use a standalone lexical `ADP`
Lemma rather than a Phraseme. Avoid unsupported prescriptive Core Features.

## Lemma And Reading Identity

- Lemma's grammatical tuple is durable identity; `canonicalForm` is its display form.
- Equal spelling does not imply equal Lemma identity.
- Different dictionary-scoped Readings may share one Lemma ID when the linguistic
  identity is the same, as with contextual readings of `Schloss`.
- Dumling owns the foundational Reading value; dictionaries own scoped Reading
  records and workflows.

## Split And Governed Verb Constructions

Keep the attested verbal form in `normalizedSurface`; do not inflate it with
valency material. Encode currently supported lexical government on the Lemma.

In `Pass auf dich auf!`:

- the middle `auf` can be attested as a standalone ADP Surface;
- the verb occurrence has source-ordered `Pass` and final `auf` members and
  resolves to the inflected verb Surface `pass auf`;
- application click records remain separate from either Attestation.

Sources:

- `Pass_[auf]_dich_auf.ts`
- `Pass_auf_dich_[auf].ts`
- `[Pass]_auf_dich_auf.ts`

## Attestation Resolution

An Attestation is fleeting occurrence evidence, not a persisted clicked-text
node. It has no identity. Docs may retain `sentenceMarkdown` in a wrapper for
display and review, but that context is not part of the Dumling DTO.
