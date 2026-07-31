# Issue #13 hidden Click Resolution corpus

Throwaway, non-production evaluator fixture for
`click-resolution-chain-v2-hidden`. It freezes 15 click cases over 10
hand-authored immutable Segmented Sentences:

| Stratum | Clicks |
| --- | ---: |
| simple Citation | 1 |
| repeated token / governed versus detached particle | 3 |
| clicked versus non-clicked typo | 2 |
| discontinuous morpheme excluding its stem | 2 |
| partial phraseme | 2 |
| non-phraseme control | 1 |
| canonical versus Variant spelling | 2 |
| Citation versus Inflection | 2 |

The resulting gates contain 14 `Standard` and one `Typo` click, 14
`Canonical` and one `Variant` Surface, 13 `Full` and two `Partial` results, and
nine `Citation` versus six `Inflection` Surfaces.

Evaluator-only gold lives in `corpus.hidden.ts`. `blind-inference-input.ts` is
the sole runner-facing projection and strips strata, membership, normalization,
Entry references, forbidden forms, and any authority evidence.
`scoring-fixtures.ts` freezes all 15 perfect outcomes, six cross-case
relations, and seven mandatory rejection examples.

Two corpus policies are explicit:

- `Portemonnaie` is corpus-canonical and the officially licensed `Portmonee`
  spelling is Variant. Both occur in the
  [official 2024 German spelling inventory](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf).
- contextual `sehen`, identical to the Entry's Citation Form, is the Citation
  Surface; `sahen` is the Inflection Surface for the same Entry.

Validate without inference:

```sh
bun test battery/dumgen/prototypes/issue-13-click-resolution-chain-v2-hidden
bun battery/dumgen/prototypes/issue-13-click-resolution-chain-v2-hidden/validate.ts
```

The authoritative aggregate SHA-256 is
`8fd7fa81fa5ce371d032b6c51feade0cdac029550a73d7416f0862c8499f5e09`.
Any change to a hashed file requires a new corpus version; never regenerate
this manifest in place after inference.
