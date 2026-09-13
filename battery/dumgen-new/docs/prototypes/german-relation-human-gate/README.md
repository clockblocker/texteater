# Historical German relation review

This is the frozen evidence for issue #193. The candidate failed its
per-relation development gates; the 12-case acceptance reservation was never
revealed or executed. No reviewed verdict was produced. Those results remain
bound to the original combined prompt, evaluator, schemas and source files.

`candidate-manifest.json` retains the original paths, hashes and candidate ID.
`artifact-locations.json` maps its artifact roles to their current locations.
Frozen TypeScript files end in `.ts.txt`; they record the old implementation
and are not executable tools for the replacement packages.

The tf-demo relation-policy compiler verifies those hashes and separately
fingerprints the current Dumgen, Dumling, Dumrel and Promptsmith sources.
An old candidate or signed verdict cannot qualify the current pipeline.
`historicalCandidateRequiresReevaluation` keeps its relation allowlist empty.
Base Knowledge generation continues through the current contracts.

Current Knowledge production requires an Encounter and an exact tagged Reading.
It dispatches by Family, validates Kind within that Family, and returns
Knowledge Changes plus Pending Semantic Relations. An invalid Kind rejects the
response; historical evaluator scores that counted or filtered such targets
remain evidence about the old response contract.

The reusable cases and adjudications now live in
[Knowledge evaluation](../../../src/concrete-lang/de/knowledge-production/evaluation/).
Current experiments are `knowledge-analysis/de/lexeme:development` and
`knowledge-analysis/de/phraseme:development`, available through Dumgen's
`evaluate` command and Laboratory. New executions produce Promptsmith Evaluation
Runs. They need their own candidate binding and review before qualification;
relocation neither reruns models nor changes historical acceptance status.
