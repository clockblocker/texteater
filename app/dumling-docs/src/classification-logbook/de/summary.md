# Common Mistakes

## Typo Handling

Only `selection.spelledSelection` may preserve a misspelling. `selection.surface.normalizedFullSurface` must stay canonical.

Sources:

- `Im_Heft_stand_[Filosofie]_statt_Philosophie.ts`

## Non-Fixed Phrases

If the selected material is not part of a fixed expression, do not inflate it into a phraseme analysis. Fall back to UD-style token segmentation instead.

Sources:

- `[Wegen]_dem_Regen_kamen_wir_zu_spät.ts`

## Emoji Semantics

`meaningInEmojis` must represent the meaning of the selected lexical item itself, not a nearby noun or the general sentence scene.

Sources:

- `[Wegen]_dem_Regen_kamen_wir_zu_spät.ts`

## Reviewer Hesitation

Do not treat obvious fixed expressions as suspicious just because the selected span covers only one component. `nur Bahnhof verstehen`, `den Nagel auf den Kopf treffen`, `da liegt der Hase im Pfeffer`, and `Morgenstund hat Gold im Mund` are valid partial-phraseme cases.

Sources:

- `Bei_dieser_Formel_verstehe_ich_nur_[Bahnhof].ts`
- `Damit_triffst_du_den_[Nagel]_auf_den_Kopf.ts`
- `Genau_da_liegt_der_[Hase]_im_Pfeffer.ts`
- `[Morgenstund]_hat_Gold_im_Mund_sagte_sie_verschlafen.ts`

## Selection Reversibility

Do not treat `Selection` as a reversible token record. It is only an ingest-time wrapper for choosing the real payload, so distinct highlighted spans may legitimately collapse to the same `surface` and `lemma` when they point to the same learner-facing unit. Example: `Pass [auf] dich auf!` and `Pass auf dich [auf]!` can both resolve to the same verbal payload for `aufpassen`; the difference between governed-preposition `auf` and separable-prefix `auf` does not need to survive serialization unless it changes the chosen payload.

Sources:

- `Pass_[auf]_dich_auf.ts`
- `Pass_auf_dich_[auf].ts`

# Locked-In Rules

## Typo Attestations

Keep the typo in `selection.spelledSelection` and keep `selection.surface.normalizedFullSurface` canonical.

Sources:

- `Im_Heft_stand_[Filosofie]_statt_Philosophie.ts`

## Partial Phraseme Selection

For clear idioms, proverbs, and other fixed expressions, `selectionFeatures: { coverage: "Partial" }` plus the full citation-form phraseme surface is the correct analysis.

Multiple different highlighted tokens inside the same fixed phraseme may all point to that same citation-form phraseme surface when they select the same learner-facing unit.

Sources:

- `Bei_dieser_Formel_verstehe_ich_nur_[Bahnhof].ts`
- `Damit_triffst_du_den_[Nagel]_auf_den_Kopf.ts`
- `Genau_da_liegt_der_[Hase]_im_Pfeffer.ts`
- `[Morgenstund]_hat_Gold_im_Mund_sagte_sie_verschlafen.ts`
- `Die_Peitsche_hat_er_mitgebrachtund_[nimmt]_sie_sorglich_sehr_in_acht.ts`
- `Die_Peitsche_hat_er_mitgebrachtund_nimmt_sie_sorglich_sehr_[in]_acht.ts`
- `Die_Peitsche_hat_er_mitgebrachtund_nimmt_sie_sorglich_sehr_in_[acht].ts`

## Discontinuous Morphemes

A visible segment such as `ge` may be a `Partial` selection of a discontinuous morpheme lemma such as `ge-...-t`. That remains `Citation`, not `Inflection`.

Sources:

- `In_[ge]lacht_markieren_ge_und_t_zusammen_das_Partizip.ts`

## Citation-Shaped Nouns

If a German noun token is identical to its learner-facing Grundform, it may stay `Citation` even when the local syntax also supports a nominative-singular reading. Do not force `Inflection` just because nominative singular is recoverable from context when the attested noun itself is citation-shaped.

Sources:

- `Die_[Peitsche]_hat_er_mitgebrachtund_nimmt_sie_sorglich_sehr_in_acht.ts`
- `Das_rote_[Band]_lag_auf_dem_Geschenk.ts`
- `Die_[Leiter]_wackelte_auf_dem_nassen_Boden.ts`

## Adpositions

For non-fixed phrases like `[Wegen] dem Regen`, use a plain lexical `ADP` analysis rather than a phraseme-style inflation. Avoid prescriptive inherent features that are not supported by the attested usage.

Sources:

- `[Wegen]_dem_Regen_kamen_wir_zu_spät.ts`

## Emoji Semantics

When classifying part of a phrase, `meaningInEmojis` must still describe the selected lexical item.

Sources:

- `[Wegen]_dem_Regen_kamen_wir_zu_spät.ts`

## Verb

#### Governed Prepositions

Governed prepositions must not be encoded in `normalizedFullSurface`.

Encode verbal government only in `lemma.inherentFeatures.hasGovPrep: "{governed preposition}"`.

Use `normalizedFullSurface` for the attested verbal surface only.

Example:

In `Pass [auf] dich auf!`, the selected `auf` is not a standalone ADP. It remains anchored to the verb lemma `aufpassen`, with:

- `normalizedFullSurface: "pass auf"`
- `lemma.inherentFeatures.hasGovPrep: "auf"`
- `lemma.inherentFeatures.hasSepPrefix: "auf"`

Do not create a surface such as `aufpassen auf` just to represent the governed preposition.

Sources:

- `Pass_[auf]_dich_auf.ts`
- `Er_[wartet]_auf_den_Nachtbus.ts`

## Selection Directionality

Treat `Selection` as an ingest-only wrapper around the real payload. The authoritative linguistic content is the selected `surface` and `lemma`, and distinct highlighted spans may map to the same payload when they point to the same learner-facing unit. Example: `Pass [auf] dich auf!` and `Pass auf dich [auf]!` can both map to the verbal payload `normalizedFullSurface: "pass auf"` with lemma `aufpassen`; token-role differences do not need to survive serialization unless they change the chosen payload.

Sources:

- `Pass_[auf]_dich_auf.ts`
- `Pass_auf_dich_[auf].ts`
