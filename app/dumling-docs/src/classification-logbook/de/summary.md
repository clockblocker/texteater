# Common Mistakes

## Typo Handling

Do not normalize the noisy input on the Selection. Preserve the whole attested
Surface occurrence in `selection.attestedSurface`, mark only a misspelled
clicked Segment with `selectedOrthography: "Typo"`, and keep
`surface.normalizedSurface` linguistically normalized.

Source: `Im_Heft_stand_[Filosofie]_statt_Philosophie.ts`

## Variant Versus Typo

A licensed spelling is not a typo. Put `spelling: "Variant"` on the Surface and
keep the clicked Segment `selectedOrthography: "Standard"`. Ordinary
sentence-initial capitalization remains a Canonical Surface.

## Non-Fixed Phrases

If the clicked material is not part of a fixed expression, do not inflate it
into a Phraseme. Resolve the learner-facing token normally.

Source: `[Wegen]_dem_Regen_kamen_wir_zu_spät.ts`

## Learner-Owned Meaning

Historical rows incorrectly stored scene-level emoji meaning on Dumling
entities. Current correction: learner-owned Meaning is resolved downstream
from the selected learner-facing unit. Dumling stores Entry identity,
linguistic Surfaces, and clicked Selection evidence; it does not own Meaning.

## Clicked Segment Versus Surface Coverage

Clicking one component does not mean the Surface is Partial. The clicked index
identifies the Selection; `surfaceSegmentIndices` identifies all participating
segments. `realizationCoverage` belongs to the Surface and is Partial only when
the attested linguistic realization itself is incomplete.

## Selection Identity

Do not collapse distinct clicks into one Selection. A Selection is a valid
node identified by `(segmentedSentenceId, clickedSegmentIndex)`. Different
Selections may resolve to the same Surface and Entry.

# Locked-In Rules

## Typo Attestations

- `attestedSurface` preserves noisy text such as `Filosofie` or `gvae up`.
- `selectedOrthography` describes only the clicked Segment.
- `normalizedSurface` stays normalized, such as `Philosophie` or `gave up`.
- Surface `spelling` remains Canonical when the input is merely misspelled.

## Fixed Expressions And Partial Realization

For a full fixed expression occurrence, include every participating index and
use a Full Surface even if the learner clicked only one component. Multiple
clicked Segments may create distinct Selections pointing to that same Surface.

Use a Partial Surface only when the attested realization omits conventional
material. Example: `heulte mit` can be a Partial inflected Surface of the Entry
with `citationForm: "mit den Wölfen heulen"`.

Sources include:

- `Bei_dieser_Formel_verstehe_ich_nur_[Bahnhof].ts`
- `Damit_triffst_du_den_[Nagel]_auf_den_Kopf.ts`
- `Genau_da_liegt_der_[Hase]_im_Pfeffer.ts`
- `[Morgenstund]_hat_Gold_im_Mund_sagte_sie_verschlafen.ts`

## Discontinuous Morphemes

A click on `ge` can resolve the full discontinuous circumfix occurrence
`ge … t`. Record both participating indices, preserve the attested form, and
resolve it to the Entry with `citationForm: "ge-...-t"`.

Source: `In_[ge]lacht_markieren_ge_und_t_zusammen_das_Partizip.ts`

## Citation-Shaped Nouns

If a German noun token is identical to its learner-facing Grundform, it may
stay a Citation Surface when local syntax does not decisively resolve an
inflectional reading.

## Adpositions

For non-fixed phrases like `[Wegen] dem Regen`, use a standalone lexical `ADP`
Entry rather than a Phraseme. Avoid unsupported prescriptive inherent features.

## Entry And Meaning Identity

- `LinguisticEntry.id` is durable identity; `citationForm` is its display form.
- Equal spelling does not imply equal Entry identity.
- Different learner-owned Meanings may share one Entry ID when the linguistic
  identity is the same, as with contextual readings of `Schloss`.
- Learner-owned Meaning remains outside Dumling.

## Split And Governed Verb Constructions

Keep the attested verbal form in `normalizedSurface`; do not inflate it with
valency material. Encode currently supported lexical government on the Entry.

In `Pass auf dich auf!`:

- clicking the middle `auf` resolves the standalone ADP Surface at its own
  Segment index;
- clicking `Pass` or the final `auf` resolves the inflected verb Surface
  `pass auf` with `surfaceSegmentIndices` containing `Pass` and the final
  particle;
- all three clicks remain distinct Selection identities.

Sources:

- `Pass_[auf]_dich_auf.ts`
- `Pass_auf_dich_[auf].ts`
- `[Pass]_auf_dich_auf.ts`

## Selection Resolution

A Selection is a persisted clicked-text node, not a temporary ingest wrapper.
Its clicked identity survives even when several clicks resolve to the same
Surface and Entry. The original unsegmented text need not survive once the
immutable segmented sentence and local indices exist.
