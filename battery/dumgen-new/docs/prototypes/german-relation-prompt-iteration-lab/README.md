# Historical German relation prompt iterations

The retained #192 run compared six cumulative revisions of one combined German
Knowledge prompt under `german-relation-evaluation-v1`, using `gpt-5.6-luna` with
reasoning `none`. Its prompts, attempts, costs, failures and semantic scores
remain unchanged. No revision cleared the frozen per-relation development gate.

The revisions added a Reading-general null test, synonym boundaries, antonym
boundaries, taxonomy and whole-part boundaries, then a consolidated checklist.
The final revision attempted repetitions over the same disclosed development
cases. The recorded post-stop calls remain part of the operational evidence.
The [human-gate manifest](../german-relation-human-gate/candidate-manifest.json)
binds the candidate to these exact artifacts.

The [earlier topology result](../german-relation-topology-lab/runs/2026-08-20T08-32-05-075Z/results.json)
records a rejected experiment design and cannot qualify publication.
`logic.ts.txt` and `run.ts.txt` preserve the old source; their commands are retired.

Current Dumgen uses Family-specific Knowledge prompts and validates each target
Kind within the source Family. The migrated adjudications and development
selections feed `knowledge-analysis/de/lexeme:development` and
`knowledge-analysis/de/phraseme:development` through the shared Evaluation Run
system. Historical scores are not acceptance results for those new contracts.
