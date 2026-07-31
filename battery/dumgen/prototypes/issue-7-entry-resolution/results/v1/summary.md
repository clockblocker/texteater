# Issue #7 measured summary

Generated: 2026-07-31T06:57:19.441Z

Model alias: `gpt-5-nano`  
Actual model(s): `gpt-5-nano-2025-08-07`  
Repetitions: 3 per 21 cases  
Concurrency: 6

| arm | full exact | identity exact | Citation Form | family | subkind | inherent features | relational | invalid | p95 ms | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `direct-family-first` | 47.6% | 58.7% | 93.7% | 96.8% | 93.7% | 82.5% | 38.9% | 0.0% | 2507 | $0.004723 |
| `direct-citation-first` | 52.4% | 66.7% | 92.1% | 95.2% | 95.2% | 81.0% | 44.4% | 0.0% | 3046 | $0.004883 |
| `progressive-grammar-first` | 36.5% | 68.3% | 92.1% | 98.4% | 93.7% | 55.6% | 38.9% | 0.0% | 5668 | $0.008552 |
| `progressive-identity-first` | 36.5% | 68.3% | 84.1% | 90.5% | 85.7% | 52.4% | 44.4% | 4.8% | 4917 | $0.007113 |
| `progressive-citation-first` | 49.2% | 66.7% | 84.1% | 93.7% | 90.5% | 68.3% | 50.0% | 0.0% | 4830 | $0.006657 |
| `agentic-candidate-inspection` | 76.2% | 84.1% | 95.2% | 100.0% | 93.7% | 85.7% | 61.1% | 0.0% | 5085 | $0.008534 |

Prices use the captured 2026-07-31 schedule:
https://developers.openai.com/api/docs/models/gpt-5-nano.
