# Issue #8 measured summary

Generated: 2026-07-31T07:13:05.694Z

Model alias: `gpt-5-nano`  
Actual model(s): `gpt-5-nano-2025-08-07`  
Repetitions: 3 per 21 cases  
Concurrency: 6

| arm | full exact | decision | reuse ID | draft exact | false split | false merge | invalid | p95 ms | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `direct-descriptions-forward` | 65.1% | 85.7% | 85.4% | 0.0% | 0.0% | 58.3% | 0.0% | 2916 | $0.002419 |
| `direct-descriptions-reverse` | 71.4% | 81.0% | 93.8% | 0.0% | 9.5% | 75.0% | 0.0% | 1939 | $0.002393 |
| `direct-description-emoji` | 57.1% | 79.4% | 75.0% | 0.0% | 14.3% | 66.7% | 0.0% | 3055 | $0.002466 |
| `direct-full-candidates` | 74.6% | 85.7% | 97.9% | 0.0% | 0.0% | 75.0% | 0.0% | 1597 | $0.002470 |
| `direct-full-few-shot` | 73.0% | 85.7% | 95.8% | 0.0% | 0.0% | 75.0% | 0.0% | 2214 | $0.002833 |
| `agentic-candidate-inspection` | 61.9% | 76.2% | 81.3% | 0.0% | 4.8% | 66.7% | 3.2% | 5548 | $0.005057 |

Prices use the captured 2026-07-31 schedule:
https://developers.openai.com/api/docs/models/gpt-5-nano.
