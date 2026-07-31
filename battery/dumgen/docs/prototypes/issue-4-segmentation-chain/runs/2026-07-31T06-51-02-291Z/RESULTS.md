# Segmentation Chain prompt experiment results

Run: `2026-07-31T06-51-02-291Z`  
Corpus: `segmentation-chain-v1` (28 cases × 3 repetitions)  
Model request: `gpt-5-nano`; resolved snapshot: `gpt-5-nano-2025-08-07`  
Provider: OpenAI Responses API; concurrency: 1; retries: 0; storage: false  
Price schedule: [openai-standard-pricing-2026-07-31](https://developers.openai.com/api/docs/pricing), effective 2026-07-31

## Model availability

The supplied project exposed only `gpt-5-nano`. Stronger-model probes are retained in `availability.json`; inaccessible models returned HTTP 403 `model_not_found`, so the ticket's stronger-model comparison was not available under this credential.

```json
{
  "modelListHttpStatus": 200,
  "listedModels": [
    "gpt-5-nano"
  ],
  "probes": [
    {
      "model": "gpt-5-mini",
      "available": false,
      "httpStatus": 403,
      "code": "model_not_found",
      "message": "403 Project `[redacted]` does not have access to model `gpt-5-mini`"
    },
    {
      "model": "gpt-5.4-mini-2026-03-17",
      "available": false,
      "httpStatus": 403,
      "code": "model_not_found",
      "message": "403 Project `[redacted]` does not have access to model `gpt-5.4-mini-2026-03-17`"
    },
    {
      "model": "gpt-5.4-2026-03-05",
      "available": false,
      "httpStatus": 403,
      "code": "model_not_found",
      "message": "403 Project `[redacted]` does not have access to model `gpt-5.4-2026-03-05`"
    }
  ]
}
```

## Arm comparison

| Arm | Eligible | Exact sentence | Intake | Boundary+kind F1 | Click F1 | Min class exact | Hebrew | Opaque F1 | Preserve | Reconstruction | False reconstruction | Requests | p95 ms | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `minimal-combined-direct` | no | 0.0% | 73.8% | 0.9% | 0.9% | 0.0% | 0.0% | 50.0% | 100.0% | 0.0% | 10.9% | 84 | 2321 | $0.002379 |
| `explicit-combined-direct` | no | 52.8% | 84.5% | 69.3% | 69.3% | 0.0% | 25.0% | 57.1% | 100.0% | 25.0% | 16.4% | 84 | 2860 | $0.006381 |
| `explicit-decomposed-direct` | no | 40.3% | 81.0% | 64.4% | 64.4% | 0.0% | 16.7% | 50.0% | 91.7% | 0.0% | 18.6% | 152 | 2603 | $0.006942 |
| `explicit-combined-agentic` | no | 51.4% | 86.9% | 62.2% | 62.2% | 0.0% | 8.3% | 71.4% | 91.7% | 41.7% | 28.3% | 168 | 3094 | $0.012052 |

## Required-stratum results

### minimal-combined-direct

Confusion matrix: `{"Accepted":{"Accepted":58,"UnsupportedLanguage":3,"Unintelligible":0,"Failure":11},"UnsupportedLanguage":{"Accepted":1,"UnsupportedLanguage":4,"Unintelligible":0,"Failure":1},"Unintelligible":{"Accepted":2,"UnsupportedLanguage":4,"Unintelligible":0,"Failure":0}}`  
Intake macro recall: 49.1%  
Authoritative-text exact: 68.1%  
Boundary P/R/F1: 4.5% / 0.5% / 0.9%  
Boundary+kind P/R/F1: 4.5% / 0.5% / 0.9%  
Click union accuracy / P/R/F1 / exact-case: 0.5% / 4.5% / 0.5% / 0.9% / 0.0%  
Adapter failures / provider errors / retries: 12 / 0 / 0  
Domain validity gates: FAIL

| Class | Attempts | Intake | Exact case | Exact accepted sentence |
| --- | ---: | ---: | ---: | ---: |
| clean German | 12 | 100.0% | 0.0% | 0.0% |
| punctuation | 3 | 100.0% | 0.0% | 0.0% |
| punctuation and whitespace | 3 | 100.0% | 0.0% | 0.0% |
| punctuation inside text | 3 | 66.7% | 0.0% | 0.0% |
| tab and repeated space | 3 | 66.7% | 0.0% | 0.0% |
| nested punctuation | 3 | 100.0% | 0.0% | 0.0% |
| ordinary typo | 6 | 100.0% | 0.0% | 0.0% |
| licensed variant | 3 | 100.0% | 0.0% | 0.0% |
| licensed variants | 3 | 100.0% | 0.0% | 0.0% |
| severe structural corruption | 9 | 22.2% | 0.0% | 0.0% |
| required noisy atom case | 3 | 33.3% | 0.0% | 0.0% |
| accepted with local opaque text | 9 | 100.0% | 0.0% | 0.0% |
| unintelligible | 6 | 0.0% | 0.0% | N/A |
| valid unsupported Polish | 3 | 100.0% | 100.0% | N/A |
| valid unsupported Spanish | 3 | 33.3% | 33.3% | N/A |
| Hebrew visible fused prefixes | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew prefix and pronominal suffix | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew object suffix | 3 | 33.3% | 0.0% | 0.0% |
| Hebrew stacked visible prefixes | 3 | 66.7% | 0.0% | 0.0% |

### explicit-combined-direct

Confusion matrix: `{"Accepted":{"Accepted":65,"UnsupportedLanguage":2,"Unintelligible":0,"Failure":5},"UnsupportedLanguage":{"Accepted":2,"UnsupportedLanguage":4,"Unintelligible":0,"Failure":0},"Unintelligible":{"Accepted":4,"UnsupportedLanguage":0,"Unintelligible":2,"Failure":0}}`  
Intake macro recall: 63.4%  
Authoritative-text exact: 68.1%  
Boundary P/R/F1: 75.3% / 65.5% / 70.1%  
Boundary+kind P/R/F1: 74.6% / 64.8% / 69.3%  
Click union accuracy / P/R/F1 / exact-case: 53.0% / 74.6% / 64.8% / 69.3% / 52.8%  
Adapter failures / provider errors / retries: 5 / 0 / 0  
Domain validity gates: FAIL

| Class | Attempts | Intake | Exact case | Exact accepted sentence |
| --- | ---: | ---: | ---: | ---: |
| clean German | 12 | 83.3% | 66.7% | 66.7% |
| punctuation | 3 | 100.0% | 100.0% | 100.0% |
| punctuation and whitespace | 3 | 100.0% | 33.3% | 33.3% |
| punctuation inside text | 3 | 100.0% | 66.7% | 66.7% |
| tab and repeated space | 3 | 100.0% | 0.0% | 0.0% |
| nested punctuation | 3 | 100.0% | 66.7% | 66.7% |
| ordinary typo | 6 | 100.0% | 100.0% | 100.0% |
| licensed variant | 3 | 100.0% | 100.0% | 100.0% |
| licensed variants | 3 | 100.0% | 100.0% | 100.0% |
| severe structural corruption | 9 | 100.0% | 33.3% | 33.3% |
| required noisy atom case | 3 | 33.3% | 0.0% | 0.0% |
| accepted with local opaque text | 9 | 100.0% | 44.4% | 44.4% |
| unintelligible | 6 | 33.3% | 33.3% | N/A |
| valid unsupported Polish | 3 | 100.0% | 100.0% | N/A |
| valid unsupported Spanish | 3 | 33.3% | 33.3% | N/A |
| Hebrew visible fused prefixes | 3 | 100.0% | 100.0% | 100.0% |
| Hebrew prefix and pronominal suffix | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew object suffix | 3 | 33.3% | 0.0% | 0.0% |
| Hebrew stacked visible prefixes | 3 | 66.7% | 0.0% | 0.0% |

### explicit-decomposed-direct

Confusion matrix: `{"Accepted":{"Accepted":62,"UnsupportedLanguage":1,"Unintelligible":9,"Failure":0},"UnsupportedLanguage":{"Accepted":6,"UnsupportedLanguage":0,"Unintelligible":0,"Failure":0},"Unintelligible":{"Accepted":0,"UnsupportedLanguage":0,"Unintelligible":6,"Failure":0}}`  
Intake macro recall: 62.0%  
Authoritative-text exact: 66.7%  
Boundary P/R/F1: 74.0% / 60.4% / 66.5%  
Boundary+kind P/R/F1: 71.7% / 58.5% / 64.4%  
Click union accuracy / P/R/F1 / exact-case: 47.5% / 71.7% / 58.5% / 64.4% / 40.3%  
Adapter failures / provider errors / retries: 0 / 0 / 0  
Domain validity gates: PASS

| Class | Attempts | Intake | Exact case | Exact accepted sentence |
| --- | ---: | ---: | ---: | ---: |
| clean German | 12 | 100.0% | 75.0% | 75.0% |
| punctuation | 3 | 100.0% | 100.0% | 100.0% |
| punctuation and whitespace | 3 | 100.0% | 33.3% | 33.3% |
| punctuation inside text | 3 | 66.7% | 0.0% | 0.0% |
| tab and repeated space | 3 | 100.0% | 0.0% | 0.0% |
| nested punctuation | 3 | 100.0% | 0.0% | 0.0% |
| ordinary typo | 6 | 100.0% | 83.3% | 83.3% |
| licensed variant | 3 | 100.0% | 100.0% | 100.0% |
| licensed variants | 3 | 100.0% | 100.0% | 100.0% |
| severe structural corruption | 9 | 33.3% | 0.0% | 0.0% |
| required noisy atom case | 3 | 0.0% | 0.0% | 0.0% |
| accepted with local opaque text | 9 | 100.0% | 33.3% | 33.3% |
| unintelligible | 6 | 100.0% | 100.0% | N/A |
| valid unsupported Polish | 3 | 0.0% | 0.0% | N/A |
| valid unsupported Spanish | 3 | 0.0% | 0.0% | N/A |
| Hebrew visible fused prefixes | 3 | 100.0% | 66.7% | 66.7% |
| Hebrew prefix and pronominal suffix | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew object suffix | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew stacked visible prefixes | 3 | 100.0% | 0.0% | 0.0% |

### explicit-combined-agentic

Confusion matrix: `{"Accepted":{"Accepted":71,"UnsupportedLanguage":1,"Unintelligible":0,"Failure":0},"UnsupportedLanguage":{"Accepted":6,"UnsupportedLanguage":0,"Unintelligible":0,"Failure":0},"Unintelligible":{"Accepted":4,"UnsupportedLanguage":0,"Unintelligible":2,"Failure":0}}`  
Intake macro recall: 44.0%  
Authoritative-text exact: 66.7%  
Boundary P/R/F1: 63.7% / 61.8% / 62.8%  
Boundary+kind P/R/F1: 63.2% / 61.3% / 62.2%  
Click union accuracy / P/R/F1 / exact-case: 45.2% / 63.2% / 61.3% / 62.2% / 51.4%  
Adapter failures / provider errors / retries: 0 / 0 / 0  
Domain validity gates: PASS

| Class | Attempts | Intake | Exact case | Exact accepted sentence |
| --- | ---: | ---: | ---: | ---: |
| clean German | 12 | 100.0% | 75.0% | 75.0% |
| punctuation | 3 | 100.0% | 100.0% | 100.0% |
| punctuation and whitespace | 3 | 100.0% | 33.3% | 33.3% |
| punctuation inside text | 3 | 100.0% | 33.3% | 33.3% |
| tab and repeated space | 3 | 100.0% | 0.0% | 0.0% |
| nested punctuation | 3 | 100.0% | 66.7% | 66.7% |
| ordinary typo | 6 | 100.0% | 83.3% | 83.3% |
| licensed variant | 3 | 100.0% | 100.0% | 100.0% |
| licensed variants | 3 | 100.0% | 100.0% | 100.0% |
| severe structural corruption | 9 | 100.0% | 44.4% | 44.4% |
| required noisy atom case | 3 | 66.7% | 0.0% | 0.0% |
| accepted with local opaque text | 9 | 100.0% | 55.6% | 55.6% |
| unintelligible | 6 | 33.3% | 33.3% | N/A |
| valid unsupported Polish | 3 | 0.0% | 0.0% | N/A |
| valid unsupported Spanish | 3 | 0.0% | 0.0% | N/A |
| Hebrew visible fused prefixes | 3 | 100.0% | 33.3% | 33.3% |
| Hebrew prefix and pronominal suffix | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew object suffix | 3 | 100.0% | 0.0% | 0.0% |
| Hebrew stacked visible prefixes | 3 | 100.0% | 0.0% | 0.0% |

## Operational evidence

Provider-reported token usage and every raw response are retained in `attempts.jsonl`. Means, p50, p95, maximum, and totals are in `summary.json`. Reasoning tokens are included in output-token billing. No retry or output repair was applied.

## Reproducibility notes

- Seeded shuffle: `420420260731`; concurrency: 1.
- The 28 corpus cases are eval-only. Few-shots use different strings and are frozen in `prototype.ts`.
- Each accepted prediction is adapted to one deterministic stable ID and locally indexed Segment array. Re-segmentation is modeled as a distinct ID; no source alignment crosses the adapter boundary.
- OpenAI Structured Outputs are used to isolate semantic quality from JSON-shape failures.
- This is a throwaway prototype and does not select or install production code.

