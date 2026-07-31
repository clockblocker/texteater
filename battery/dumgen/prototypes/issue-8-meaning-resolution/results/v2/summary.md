# Issue #8 measured summary

Generated: 2026-07-31T07:14:11.451Z

Model alias: `gpt-5-nano`  
Actual model(s): `gpt-5-nano-2025-08-07`  
Repetitions: 3 per 21 cases  
Concurrency: 6

| arm | full exact | decision | reuse ID | draft exact | false split | false merge | invalid | p95 ms | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `progressive-decision-then-draft` | 65.1% | 81.0% | 85.4% | 0.0% | 4.8% | 58.3% | 0.0% | 2951 | $0.002482 |

Prices use the captured 2026-07-31 schedule:
https://developers.openai.com/api/docs/models/gpt-5-nano.
