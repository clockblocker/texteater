# Issue #6 measured summary

Fixed run generated: 2026-07-31T07:11:31.740Z  
Summary regenerated from retained rows: 2026-07-31T07:23:44.535Z

Model alias: `gpt-5-nano`  
Actual model(s): `gpt-5-nano-2025-08-07`  
Repetitions: 3 per 24 click cases  
Concurrency: 4

Scope: Issue #6 Selection membership and contextual Surface subset. Surface kind/features, Entry, and Meaning fields from the full #5 chain are not produced or scored.

## Micro summary

| arm | full exact | membership exact | membership F1 | normalization exact given correct membership (n) | whitespace-token expansions | exact known lemmatizations | invalid |
|---|---:|---:|---:|---:|---:|---:|---:|
| `monolith-indices` | 40.3% | 52.8% | 77.6% | 92.1% (38) | 0 | 0 | 0.0% |
| `monolith-text` | 23.6% | 43.1% | 71.3% | 77.4% (31) | 0 | 0 | 12.5% |
| `chain-free-normalization` | 44.4% | 58.3% | 83.1% | 90.5% (42) | 1 | 3 | 0.0% |
| `chain-guarded-normalization` | 44.4% | 58.3% | 83.5% | 88.1% (42) | 0 | 2 | 2.8% |
| `agentic-inspection` | 30.6% | 44.4% | 74.9% | 81.3% (32) | 0 | 1 | 0.0% |

Invalid attempts receive zero for every correctness metric. For pooled
membership precision/F1, each invalid attempt is represented as an unalignable
prediction with the gold cardinality, contributing zero precision and recall.

Whitespace-token expansion and a fixed exact lemmatization oracle are reported. Whitespace-token expansion is not a general proof of lexical insertion safety; that unimplemented full #5 gate prevents production eligibility.

## Runtime, output, and cost

Distribution cells are mean / p50 / p95 / max / total. Byte and token cells
below include the contract-required mean, p95, and total plus retained p50/max.

| arm | latency ms | raw output bytes | parsed JSON bytes | retry total | mean cost | total cost |
|---|---:|---:|---:|---:|---:|---:|
| `monolith-indices` | 7342 / 6673 / 13611 / 20522 / 528640 | 148 / 144 / 160 / 178 / 10662 | 148 / 144 / 160 / 178 / 10662 | 0 | $0.00035605 | $0.025636 |
| `monolith-text` | 7153 / 6380 / 14743 / 24152 / 515001 | 151 / 150 / 168 / 198 / 10864 | 151 / 150 / 168 / 198 / 10864 | 0 | $0.00038913 | $0.028017 |
| `chain-free-normalization` | 9563 / 8207 / 18183 / 33243 / 688531 | 146 / 144 / 154 / 161 / 10503 | 146 / 144 / 154 / 161 / 10503 | 0 | $0.00041736 | $0.030050 |
| `chain-guarded-normalization` | 11552 / 9620 / 21079 / 73788 / 831730 | 187 / 166 / 240 / 256 / 13451 | 187 / 166 / 240 / 256 / 13450 | 0 | $0.00048624 | $0.035009 |
| `agentic-inspection` | 8508 / 7687 / 14485 / 20656 / 612588 | 178 / 177 / 195 / 213 / 12848 | 178 / 177 / 195 / 213 / 12848 | 0 | $0.00045032 | $0.032423 |

| arm | input tokens (mean/p95/total) | cached input | output | reasoning |
|---|---:|---:|---:|---:|
| `monolith-indices` | 689.1 / 818 / 49614 | 0.0 / 0 / 0 | 804.0 / 1405 / 57888 | 731.6 / 1344 / 52672 |
| `monolith-text` | 749.1 / 878 / 53934 | 0.0 / 0 / 0 | 879.2 / 1525 / 63301 | 801.8 / 1472 / 57728 |
| `chain-free-normalization` | 912.1 / 1200 / 65671 | 0.0 / 0 / 0 | 929.4 / 1745 / 66916 | 810.7 / 1600 / 58368 |
| `chain-guarded-normalization` | 894.3 / 1195 / 64392 | 0.0 / 0 / 0 | 1103.8 / 2070 / 79474 | 968.9 / 1920 / 69760 |
| `agentic-inspection` | 1991.7 / 2708 / 143400 | 0.0 / 0 / 0 | 876.8 / 1495 / 63132 | 739.6 / 1344 / 53248 |

Prices use the captured 2026-07-31 OpenAI schedule:
https://developers.openai.com/api/docs/models/gpt-5-nano.

## Macro averages by required-case group

| arm | required-case group | membership | attested Surface | normalized Surface | full issue-#6 contract |
|---|---|---:|---:|---:|---:|
| `monolith-indices` | `simple-one-segment` | 100.0% | 100.0% | 100.0% | 100.0% |
| `monolith-indices` | `noisy-phrasal-verb` | 83.3% | 83.3% | 83.3% | 83.3% |
| `monolith-indices` | `chat-composition` | 22.2% | 22.2% | 22.2% | 22.2% |
| `monolith-indices` | `partial-idiom` | 66.7% | 66.7% | 66.7% | 0.0% |
| `monolith-indices` | `repeated-token-membership` | 0.0% | 11.1% | 0.0% | 0.0% |
| `monolith-indices` | `partial-fixed-phraseme` | 100.0% | 100.0% | 0.0% | 0.0% |
| `monolith-indices` | `non-fixed-lexeme` | 33.3% | 33.3% | 33.3% | 33.3% |
| `monolith-indices` | `discontinuous-morpheme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `monolith-indices` | `canonical-variant-pair` | 50.0% | 50.0% | 50.0% | 33.3% |
| `monolith-indices` | `homograph-pair` | 83.3% | 83.3% | 83.3% | 66.7% |
| `monolith-indices` | `overlapping-inflection-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `monolith-indices` | `meaning-identity-controls` | 66.7% | 66.7% | 66.7% | 66.7% |
| `monolith-indices` | **macro mean** | **58.8%** | **59.7%** | **50.5%** | **42.1%** |
| `monolith-text` | `simple-one-segment` | 100.0% | 100.0% | 100.0% | 100.0% |
| `monolith-text` | `noisy-phrasal-verb` | 16.7% | 16.7% | 16.7% | 0.0% |
| `monolith-text` | `chat-composition` | 66.7% | 66.7% | 11.1% | 11.1% |
| `monolith-text` | `partial-idiom` | 66.7% | 66.7% | 66.7% | 0.0% |
| `monolith-text` | `repeated-token-membership` | 0.0% | 0.0% | 0.0% | 0.0% |
| `monolith-text` | `partial-fixed-phraseme` | 66.7% | 66.7% | 0.0% | 0.0% |
| `monolith-text` | `non-fixed-lexeme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `monolith-text` | `discontinuous-morpheme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `monolith-text` | `canonical-variant-pair` | 66.7% | 66.7% | 66.7% | 33.3% |
| `monolith-text` | `homograph-pair` | 33.3% | 33.3% | 33.3% | 33.3% |
| `monolith-text` | `overlapping-inflection-pair` | 83.3% | 83.3% | 83.3% | 83.3% |
| `monolith-text` | `meaning-identity-controls` | 44.4% | 44.4% | 44.4% | 44.4% |
| `monolith-text` | **macro mean** | **45.4%** | **45.4%** | **35.2%** | **25.5%** |
| `chain-free-normalization` | `simple-one-segment` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-free-normalization` | `noisy-phrasal-verb` | 66.7% | 66.7% | 16.7% | 16.7% |
| `chain-free-normalization` | `chat-composition` | 0.0% | 0.0% | 0.0% | 0.0% |
| `chain-free-normalization` | `partial-idiom` | 83.3% | 83.3% | 83.3% | 0.0% |
| `chain-free-normalization` | `repeated-token-membership` | 11.1% | 22.2% | 0.0% | 0.0% |
| `chain-free-normalization` | `partial-fixed-phraseme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `chain-free-normalization` | `non-fixed-lexeme` | 100.0% | 100.0% | 100.0% | 66.7% |
| `chain-free-normalization` | `discontinuous-morpheme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `chain-free-normalization` | `canonical-variant-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-free-normalization` | `homograph-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-free-normalization` | `overlapping-inflection-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-free-normalization` | `meaning-identity-controls` | 88.9% | 88.9% | 88.9% | 88.9% |
| `chain-free-normalization` | **macro mean** | **62.5%** | **63.4%** | **57.4%** | **47.7%** |
| `chain-guarded-normalization` | `simple-one-segment` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-guarded-normalization` | `noisy-phrasal-verb` | 66.7% | 66.7% | 33.3% | 33.3% |
| `chain-guarded-normalization` | `chat-composition` | 22.2% | 22.2% | 0.0% | 0.0% |
| `chain-guarded-normalization` | `partial-idiom` | 83.3% | 83.3% | 83.3% | 0.0% |
| `chain-guarded-normalization` | `repeated-token-membership` | 0.0% | 11.1% | 0.0% | 0.0% |
| `chain-guarded-normalization` | `partial-fixed-phraseme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `chain-guarded-normalization` | `non-fixed-lexeme` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-guarded-normalization` | `discontinuous-morpheme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `chain-guarded-normalization` | `canonical-variant-pair` | 100.0% | 100.0% | 83.3% | 83.3% |
| `chain-guarded-normalization` | `homograph-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-guarded-normalization` | `overlapping-inflection-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `chain-guarded-normalization` | `meaning-identity-controls` | 77.8% | 77.8% | 77.8% | 77.8% |
| `chain-guarded-normalization` | **macro mean** | **62.5%** | **63.4%** | **56.5%** | **49.5%** |
| `agentic-inspection` | `simple-one-segment` | 100.0% | 100.0% | 100.0% | 100.0% |
| `agentic-inspection` | `noisy-phrasal-verb` | 33.3% | 33.3% | 16.7% | 16.7% |
| `agentic-inspection` | `chat-composition` | 55.6% | 55.6% | 22.2% | 22.2% |
| `agentic-inspection` | `partial-idiom` | 33.3% | 33.3% | 33.3% | 0.0% |
| `agentic-inspection` | `repeated-token-membership` | 11.1% | 22.2% | 0.0% | 0.0% |
| `agentic-inspection` | `partial-fixed-phraseme` | 33.3% | 33.3% | 0.0% | 0.0% |
| `agentic-inspection` | `non-fixed-lexeme` | 33.3% | 33.3% | 33.3% | 33.3% |
| `agentic-inspection` | `discontinuous-morpheme` | 0.0% | 0.0% | 0.0% | 0.0% |
| `agentic-inspection` | `canonical-variant-pair` | 50.0% | 50.0% | 50.0% | 16.7% |
| `agentic-inspection` | `homograph-pair` | 33.3% | 33.3% | 33.3% | 33.3% |
| `agentic-inspection` | `overlapping-inflection-pair` | 100.0% | 100.0% | 100.0% | 100.0% |
| `agentic-inspection` | `meaning-identity-controls` | 66.7% | 66.7% | 66.7% | 66.7% |
| `agentic-inspection` | **macro mean** | **45.8%** | **46.8%** | **38.0%** | **32.4%** |

## Every click case

| arm | case | invalid | membership | attested | orthography | normalized | spelling | coverage | full | whitespace expansion | lemmatization |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `monolith-indices` | `CR-01@0` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-indices` | `CR-02@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-indices` | `CR-02@4` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `monolith-indices` | `CR-03@0` | 0/3 | 66.7% | 66.7% | 66.7% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `monolith-indices` | `CR-03@2` | 0/3 | 0.0% | 0.0% | 0.0% | 0.0% | 66.7% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-03@4` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-04@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-04@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-05@0` | 0/3 | 0.0% | 33.3% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-05@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-05@6` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-06@2` | 0/3 | 100.0% | 100.0% | 100.0% | 0.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-07@6` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `monolith-indices` | `CR-08@8` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-08@10` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-09@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `monolith-indices` | `CR-10@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 33.3% | 100.0% | 33.3% | 0 | 0 |
| `monolith-indices` | `CR-11@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 66.7% | 33.3% | 0 | 0 |
| `monolith-indices` | `CR-12@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-indices` | `CR-13@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-indices` | `CR-14@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-indices` | `CR-15@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-indices` | `CR-16@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-indices` | `CR-17@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-text` | `CR-01@0` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-text` | `CR-02@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 33.3% | 66.7% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-02@4` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 66.7% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-03@0` | 0/3 | 66.7% | 66.7% | 33.3% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `monolith-text` | `CR-03@2` | 0/3 | 66.7% | 66.7% | 0.0% | 0.0% | 66.7% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-03@4` | 0/3 | 66.7% | 66.7% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-04@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-04@4` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-05@0` | 3/3 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-05@2` | 3/3 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-05@6` | 3/3 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-06@2` | 0/3 | 66.7% | 66.7% | 100.0% | 0.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-07@6` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-08@8` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-08@10` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-09@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `monolith-text` | `CR-10@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 33.3% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-11@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `monolith-text` | `CR-12@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `monolith-text` | `CR-13@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `monolith-text` | `CR-14@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `monolith-text` | `CR-15@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `monolith-text` | `CR-16@4` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `monolith-text` | `CR-17@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-01@0` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-02@2` | 0/3 | 66.7% | 66.7% | 66.7% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 1 |
| `chain-free-normalization` | `CR-02@4` | 0/3 | 66.7% | 66.7% | 33.3% | 0.0% | 100.0% | 66.7% | 0.0% | 0 | 2 |
| `chain-free-normalization` | `CR-03@0` | 0/3 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-03@2` | 0/3 | 0.0% | 0.0% | 66.7% | 0.0% | 100.0% | 66.7% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-03@4` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-04@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-04@4` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-05@0` | 0/3 | 0.0% | 33.3% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-05@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-05@6` | 0/3 | 33.3% | 33.3% | 66.7% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-06@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-07@6` | 0/3 | 100.0% | 100.0% | 66.7% | 100.0% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `chain-free-normalization` | `CR-08@8` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 1 | 0 |
| `chain-free-normalization` | `CR-08@10` | 0/3 | 0.0% | 0.0% | 66.7% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-free-normalization` | `CR-09@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-10@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-11@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-12@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-13@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-14@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-15@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `chain-free-normalization` | `CR-16@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-free-normalization` | `CR-17@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-01@0` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-02@2` | 0/3 | 66.7% | 66.7% | 66.7% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 2 |
| `chain-guarded-normalization` | `CR-02@4` | 0/3 | 66.7% | 66.7% | 66.7% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `chain-guarded-normalization` | `CR-03@0` | 0/3 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-03@2` | 0/3 | 33.3% | 33.3% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-03@4` | 1/3 | 33.3% | 33.3% | 66.7% | 0.0% | 66.7% | 66.7% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-04@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-04@4` | 0/3 | 100.0% | 100.0% | 66.7% | 100.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-05@0` | 0/3 | 0.0% | 33.3% | 100.0% | 0.0% | 100.0% | 66.7% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-05@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-05@6` | 0/3 | 0.0% | 0.0% | 66.7% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-06@2` | 0/3 | 0.0% | 0.0% | 66.7% | 0.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-07@6` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-08@8` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 66.7% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-08@10` | 0/3 | 0.0% | 0.0% | 66.7% | 0.0% | 100.0% | 33.3% | 0.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-09@2` | 0/3 | 100.0% | 100.0% | 100.0% | 66.7% | 66.7% | 100.0% | 66.7% | 0 | 0 |
| `chain-guarded-normalization` | `CR-10@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-11@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-12@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-13@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-14@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-15@2` | 1/3 | 33.3% | 33.3% | 66.7% | 33.3% | 66.7% | 66.7% | 33.3% | 0 | 0 |
| `chain-guarded-normalization` | `CR-16@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `chain-guarded-normalization` | `CR-17@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `agentic-inspection` | `CR-01@0` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `agentic-inspection` | `CR-02@2` | 0/3 | 0.0% | 0.0% | 33.3% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-02@4` | 0/3 | 66.7% | 66.7% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 1 |
| `agentic-inspection` | `CR-03@0` | 0/3 | 33.3% | 33.3% | 66.7% | 33.3% | 66.7% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-03@2` | 0/3 | 100.0% | 100.0% | 33.3% | 33.3% | 66.7% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-03@4` | 0/3 | 33.3% | 33.3% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-04@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-04@4` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-05@0` | 0/3 | 0.0% | 33.3% | 100.0% | 0.0% | 100.0% | 66.7% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-05@2` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 66.7% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-05@6` | 0/3 | 33.3% | 33.3% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-06@2` | 0/3 | 33.3% | 33.3% | 100.0% | 0.0% | 100.0% | 0.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-07@6` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-08@8` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-08@10` | 0/3 | 0.0% | 0.0% | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-09@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-10@2` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 0.0% | 100.0% | 0.0% | 0 | 0 |
| `agentic-inspection` | `CR-11@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-12@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-13@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `agentic-inspection` | `CR-14@2` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |
| `agentic-inspection` | `CR-15@2` | 0/3 | 33.3% | 33.3% | 100.0% | 33.3% | 100.0% | 100.0% | 33.3% | 0 | 0 |
| `agentic-inspection` | `CR-16@4` | 0/3 | 66.7% | 66.7% | 100.0% | 66.7% | 100.0% | 100.0% | 66.7% | 0 | 0 |
| `agentic-inspection` | `CR-17@4` | 0/3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 |

## Relational assertions, per arm and repetition

Assertions marked “in-scope projection” exclude full-chain fields that issue #6
does not produce. The exact excluded fields are retained rather than silently
counted as passes.

| arm | repetition | assertion | result | scope | excluded full-chain fields |
|---|---:|---|---|---|---|
| `monolith-indices` | 1 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `monolith-indices` | 1 | `CR-03` | fail | full | — |
| `monolith-indices` | 1 | `CR-04` | fail | full | — |
| `monolith-indices` | 1 | `CR-05` | fail | full | — |
| `monolith-indices` | 1 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `monolith-indices` | 1 | `CR-08` | fail | full | — |
| `monolith-indices` | 1 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `monolith-indices` | 1 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `monolith-indices` | 1 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `monolith-indices` | 1 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `monolith-indices` | 2 | `CR-02` | pass | in-scope projection | Entry key, Meaning |
| `monolith-indices` | 2 | `CR-03` | fail | full | — |
| `monolith-indices` | 2 | `CR-04` | fail | full | — |
| `monolith-indices` | 2 | `CR-05` | fail | full | — |
| `monolith-indices` | 2 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `monolith-indices` | 2 | `CR-08` | fail | full | — |
| `monolith-indices` | 2 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `monolith-indices` | 2 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `monolith-indices` | 2 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `monolith-indices` | 2 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `monolith-indices` | 3 | `CR-02` | pass | in-scope projection | Entry key, Meaning |
| `monolith-indices` | 3 | `CR-03` | fail | full | — |
| `monolith-indices` | 3 | `CR-04` | fail | full | — |
| `monolith-indices` | 3 | `CR-05` | fail | full | — |
| `monolith-indices` | 3 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `monolith-indices` | 3 | `CR-08` | fail | full | — |
| `monolith-indices` | 3 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `monolith-indices` | 3 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `monolith-indices` | 3 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `monolith-indices` | 3 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `monolith-text` | 1 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `monolith-text` | 1 | `CR-03` | fail | full | — |
| `monolith-text` | 1 | `CR-04` | fail | full | — |
| `monolith-text` | 1 | `CR-05` | fail | full | — |
| `monolith-text` | 1 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `monolith-text` | 1 | `CR-08` | fail | full | — |
| `monolith-text` | 1 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `monolith-text` | 1 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `monolith-text` | 1 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `monolith-text` | 1 | `CR-16/17` | fail | in-scope projection | Meaning reuse |
| `monolith-text` | 2 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `monolith-text` | 2 | `CR-03` | fail | full | — |
| `monolith-text` | 2 | `CR-04` | fail | full | — |
| `monolith-text` | 2 | `CR-05` | fail | full | — |
| `monolith-text` | 2 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `monolith-text` | 2 | `CR-08` | fail | full | — |
| `monolith-text` | 2 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `monolith-text` | 2 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `monolith-text` | 2 | `CR-13/14` | fail | in-scope projection | person feature, global Surface identity |
| `monolith-text` | 2 | `CR-16/17` | fail | in-scope projection | Meaning reuse |
| `monolith-text` | 3 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `monolith-text` | 3 | `CR-03` | fail | full | — |
| `monolith-text` | 3 | `CR-04` | fail | full | — |
| `monolith-text` | 3 | `CR-05` | fail | full | — |
| `monolith-text` | 3 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `monolith-text` | 3 | `CR-08` | fail | full | — |
| `monolith-text` | 3 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `monolith-text` | 3 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `monolith-text` | 3 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `monolith-text` | 3 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `chain-free-normalization` | 1 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `chain-free-normalization` | 1 | `CR-03` | fail | full | — |
| `chain-free-normalization` | 1 | `CR-04` | fail | full | — |
| `chain-free-normalization` | 1 | `CR-05` | fail | full | — |
| `chain-free-normalization` | 1 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `chain-free-normalization` | 1 | `CR-08` | fail | full | — |
| `chain-free-normalization` | 1 | `CR-09/10` | pass | in-scope projection | Entry reference, Meaning |
| `chain-free-normalization` | 1 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `chain-free-normalization` | 1 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `chain-free-normalization` | 1 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `chain-free-normalization` | 2 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `chain-free-normalization` | 2 | `CR-03` | fail | full | — |
| `chain-free-normalization` | 2 | `CR-04` | fail | full | — |
| `chain-free-normalization` | 2 | `CR-05` | fail | full | — |
| `chain-free-normalization` | 2 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `chain-free-normalization` | 2 | `CR-08` | fail | full | — |
| `chain-free-normalization` | 2 | `CR-09/10` | pass | in-scope projection | Entry reference, Meaning |
| `chain-free-normalization` | 2 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `chain-free-normalization` | 2 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `chain-free-normalization` | 2 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `chain-free-normalization` | 3 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `chain-free-normalization` | 3 | `CR-03` | fail | full | — |
| `chain-free-normalization` | 3 | `CR-04` | fail | full | — |
| `chain-free-normalization` | 3 | `CR-05` | fail | full | — |
| `chain-free-normalization` | 3 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `chain-free-normalization` | 3 | `CR-08` | fail | full | — |
| `chain-free-normalization` | 3 | `CR-09/10` | pass | in-scope projection | Entry reference, Meaning |
| `chain-free-normalization` | 3 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `chain-free-normalization` | 3 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `chain-free-normalization` | 3 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `chain-guarded-normalization` | 1 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `chain-guarded-normalization` | 1 | `CR-03` | fail | full | — |
| `chain-guarded-normalization` | 1 | `CR-04` | fail | full | — |
| `chain-guarded-normalization` | 1 | `CR-05` | fail | full | — |
| `chain-guarded-normalization` | 1 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `chain-guarded-normalization` | 1 | `CR-08` | fail | full | — |
| `chain-guarded-normalization` | 1 | `CR-09/10` | pass | in-scope projection | Entry reference, Meaning |
| `chain-guarded-normalization` | 1 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `chain-guarded-normalization` | 1 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `chain-guarded-normalization` | 1 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `chain-guarded-normalization` | 2 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `chain-guarded-normalization` | 2 | `CR-03` | fail | full | — |
| `chain-guarded-normalization` | 2 | `CR-04` | fail | full | — |
| `chain-guarded-normalization` | 2 | `CR-05` | fail | full | — |
| `chain-guarded-normalization` | 2 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `chain-guarded-normalization` | 2 | `CR-08` | fail | full | — |
| `chain-guarded-normalization` | 2 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `chain-guarded-normalization` | 2 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `chain-guarded-normalization` | 2 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `chain-guarded-normalization` | 2 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `chain-guarded-normalization` | 3 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `chain-guarded-normalization` | 3 | `CR-03` | fail | full | — |
| `chain-guarded-normalization` | 3 | `CR-04` | fail | full | — |
| `chain-guarded-normalization` | 3 | `CR-05` | fail | full | — |
| `chain-guarded-normalization` | 3 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `chain-guarded-normalization` | 3 | `CR-08` | fail | full | — |
| `chain-guarded-normalization` | 3 | `CR-09/10` | pass | in-scope projection | Entry reference, Meaning |
| `chain-guarded-normalization` | 3 | `CR-11/12` | pass | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `chain-guarded-normalization` | 3 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `chain-guarded-normalization` | 3 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `agentic-inspection` | 1 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `agentic-inspection` | 1 | `CR-03` | fail | full | — |
| `agentic-inspection` | 1 | `CR-04` | fail | full | — |
| `agentic-inspection` | 1 | `CR-05` | fail | full | — |
| `agentic-inspection` | 1 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `agentic-inspection` | 1 | `CR-08` | fail | full | — |
| `agentic-inspection` | 1 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `agentic-inspection` | 1 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `agentic-inspection` | 1 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `agentic-inspection` | 1 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `agentic-inspection` | 2 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `agentic-inspection` | 2 | `CR-03` | fail | full | — |
| `agentic-inspection` | 2 | `CR-04` | fail | full | — |
| `agentic-inspection` | 2 | `CR-05` | fail | full | — |
| `agentic-inspection` | 2 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `agentic-inspection` | 2 | `CR-08` | fail | full | — |
| `agentic-inspection` | 2 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `agentic-inspection` | 2 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `agentic-inspection` | 2 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `agentic-inspection` | 2 | `CR-16/17` | pass | in-scope projection | Meaning reuse |
| `agentic-inspection` | 3 | `CR-02` | fail | in-scope projection | Entry key, Meaning |
| `agentic-inspection` | 3 | `CR-03` | fail | full | — |
| `agentic-inspection` | 3 | `CR-04` | fail | full | — |
| `agentic-inspection` | 3 | `CR-05` | fail | full | — |
| `agentic-inspection` | 3 | `CR-06/07` | fail | in-scope projection | Surface kind |
| `agentic-inspection` | 3 | `CR-08` | fail | full | — |
| `agentic-inspection` | 3 | `CR-09/10` | fail | in-scope projection | Entry reference, Meaning |
| `agentic-inspection` | 3 | `CR-11/12` | fail | in-scope projection | global Surface identity, grammatical analysis, Entry identity |
| `agentic-inspection` | 3 | `CR-13/14` | pass | in-scope projection | person feature, global Surface identity |
| `agentic-inspection` | 3 | `CR-16/17` | fail | in-scope projection | Meaning reuse |
