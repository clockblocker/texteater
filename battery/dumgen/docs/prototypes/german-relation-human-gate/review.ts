import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { GermanKnowledgeAnalysis } from "../../../src/knowledge-generation/de/schemas";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../src/knowledge-generation/relations";
import {
	type GoldenCaseSource,
	stableJson,
} from "../../../src/promptsmith/assembly";
import { analyzeCombinedGermanKnowledgeCase } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import type { GermanRelationEvaluationReport } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import {
	corpus,
	relationCorpusAdjudications,
} from "../../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
import {
	createLabPlan,
	PROMPT_REVISIONS,
} from "../german-relation-prompt-iteration-lab/logic";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIRECTORY = resolve(HERE, "../../..");
const WORKSPACE_DIRECTORY = resolve(PACKAGE_DIRECTORY, "../..");
const MANIFEST_PATH = join(HERE, "candidate-manifest.json");
const APPROVAL_PATH = join(HERE, "reservation-approval.json");
const ACCEPTANCE_RESULT_PATH = join(HERE, "acceptance-result.json");
const VERDICT_PATH = join(HERE, "verdict.json");
const REVIEWED_REVISION_ID = "consolidated-null-first-checklist" as const;
const CANDIDATE_TOPOLOGY = "combined-atomic-prompt-iterations" as const;

type FrozenArtifact = Readonly<{
	issue: 189 | 190 | 191 | 192 | 193;
	role: string;
	path: string;
	sha256: string;
}>;

export type CandidateManifest = Readonly<{
	formatVersion: "german-relation-human-gate-candidate-v1";
	candidateId: string;
	state: "development-gate-failed";
	artifacts: readonly FrozenArtifact[];
	candidate: Readonly<{
		topology: typeof CANDIDATE_TOPOLOGY;
		model: "gpt-5.6-luna";
		reasoningEffort: "none";
		promptPolicy: string;
		developmentRecommendation: "no-prompt-revision-clears-the-frozen-gate";
	}>;
	acceptanceReservation: Readonly<{
		status: "sealed-pending-human-approval";
		approvedByHuman: false;
		revealedCaseCount: 0;
		reservedCaseCount: number;
		selectionCommitmentSha256: string;
	}>;
	executionFailurePolicy: Readonly<{
		retries: 0;
		failedCallTreatment: string;
		consumptionPoint: string;
		preRevealFailureTreatment: string;
		partialRunTreatment: string;
	}>;
	verdictContract: Readonly<{
		formatVersion: "german-relation-human-verdict-v1";
		path: string;
		relationKinds: readonly RequestableRelation[];
		decisions: readonly ["promote", "revise", "do-not-generate"];
		promotionRequiresUntouchedAcceptancePass: true;
		requiredAcceptanceStatus: "retained-untouched";
	}>;
}>;

type RetainedAttempt = Readonly<{
	callId: string;
	revisionNumber: number;
	revisionId: string;
	repetition: number;
	caseId: string;
	output?: GermanKnowledgeAnalysis;
	error?: Readonly<{ name: string; message: string }>;
}>;

type RelationTargets = NonNullable<
	NonNullable<
		GermanKnowledgeAnalysis["semanticRelations"]
	>[RequestableRelation]
>;

type RevisionReport = Readonly<{
	revisionNumber: number;
	title: string;
	hypothesis: string;
	promptFingerprint: string;
	plannedRepetitions: number;
	completedRepetitions: number;
	decisionRepetitions: number;
	callCount: number;
	errorCount: number;
	refusalCount: number;
	incompleteCount: number;
	harmfulByRepetition: readonly Readonly<{
		repetition: number;
		harmfulFalsePositiveCount: number;
	}>[];
	stopRuleTriggeredAfterRepetition: number | null;
	postStopAttemptCount: number;
	stopEnforcementPass: boolean;
	stopReason: string | null;
	actualSpendUsd: string;
	semanticReport: GermanRelationEvaluationReport;
	gatePass: boolean;
}>;

type ReviewObservation = Readonly<{
	callId: string;
	repetition: number;
	caseId: string;
	relation: RequestableRelation;
	decisionEligible: boolean;
	status:
		| "execution-error"
		| "material-omission"
		| "emitted-match"
		| "emitted-partial"
		| "emitted-false-positive";
	actual: RelationTargets | null;
	expected: RelationTargets | null;
	acceptableAlternatives: readonly (RelationTargets | null)[];
	rationale: string;
	sources: readonly GoldenCaseSource[];
	harmfulTargets: readonly Readonly<{
		relation: RequestableRelation;
		target: RelationTargets[number];
		reason: string;
	}>[];
	error?: Readonly<{ name: string; message: string }>;
	metrics?: Readonly<{
		truePositiveCount: number;
		falsePositiveCount: number;
		harmfulFalsePositiveCount: number;
		omissionCount: number;
		wrongFamilyCount: number;
		wrongKindCount: number;
		kindConfusionCount: number;
		unclassifiedFalsePositiveCount: number;
	}>;
}>;

type ReviewState =
	| "development-gate-failed"
	| "invalid-post-development-artifact";

type RetainedResult = Readonly<{
	attempts: readonly RetainedAttempt[];
	report: Readonly<{
		actualSpendUsd: string;
		historicalIssue192SpendUsd: string;
		cumulativeIssue192SpendUsd: string;
		budgetUsd: string;
		byRevision: Readonly<Record<string, RevisionReport>>;
		recommendation: Readonly<{ decision: string; action: string }>;
	}>;
}>;

export async function loadFrozenReview() {
	const manifest = JSON.parse(
		await readFile(MANIFEST_PATH, "utf8"),
	) as CandidateManifest;
	assertManifestShape(manifest);
	await verifyFrozenArtifacts(manifest);

	const evidenceArtifact = manifest.artifacts.find(
		({ issue, role }) => issue === 192 && role === "retained-result",
	);
	if (evidenceArtifact === undefined)
		throw new Error("Candidate manifest has no retained #192 result.");
	const retained = JSON.parse(
		await readFile(
			join(WORKSPACE_DIRECTORY, evidenceArtifact.path),
			"utf8",
		),
	) as RetainedResult;
	const candidateReport = retained.report.byRevision[REVIEWED_REVISION_ID];
	if (candidateReport === undefined)
		throw new Error(
			`Retained result has no ${REVIEWED_REVISION_ID} report.`,
		);
	if (candidateReport.gatePass)
		throw new Error(
			"The manifest says development failed, but the retained candidate passed.",
		);
	if (
		retained.report.recommendation.decision !==
		manifest.candidate.developmentRecommendation
	)
		throw new Error(
			"The frozen development recommendation does not match the manifest.",
		);

	const planCalls = new Map(
		createLabPlan().calls.map((call) => [call.id, call] as const),
	);
	const observations = retained.attempts
		.filter(({ revisionId }) => revisionId === REVIEWED_REVISION_ID)
		.flatMap<ReviewObservation>((attempt) => {
			const planned = planCalls.get(attempt.callId);
			if (planned === undefined)
				throw new Error(
					`Retained attempt is not in the frozen plan: ${attempt.callId}`,
				);
			const relations = requestableRelationSchema.options.filter(
				(relation) =>
					planned.evaluationInput.request.semanticRelations?.[
						relation
					] === null,
			);
			const adjudication =
				relationCorpusAdjudications.byCaseId[attempt.caseId];
			const sources = corpus.cases[attempt.caseId]?.sources ?? [];
			const decisionEligible =
				attempt.repetition <= candidateReport.decisionRepetitions;
			if (attempt.error !== undefined) {
				return relations.map((relation) => ({
					callId: attempt.callId,
					repetition: attempt.repetition,
					caseId: attempt.caseId,
					relation,
					decisionEligible,
					status: "execution-error" as const,
					actual: null,
					expected:
						planned.idealOutput.semanticRelations?.[relation] ??
						null,
					acceptableAlternatives:
						adjudication?.acceptableTargetSets?.[relation] ?? [],
					rationale: adjudication?.rationale ?? "",
					sources,
					harmfulTargets:
						adjudication?.harmfulTargets.filter(
							(item) => item.relation === relation,
						) ?? [],
					error: attempt.error,
				}));
			}
			if (attempt.output === undefined)
				throw new Error(
					`Successful attempt has no parsed output: ${attempt.callId}`,
				);

			const analysis = analyzeCombinedGermanKnowledgeCase({
				caseId: attempt.caseId,
				input: planned.evaluationInput,
				idealOutput: planned.idealOutput,
				output: attempt.output,
			});
			return relations.flatMap<ReviewObservation>((relation) => {
				const actual =
					attempt.output?.semanticRelations?.[relation] ?? null;
				const expected =
					planned.idealOutput.semanticRelations?.[relation] ?? null;
				const leaf = analysis.relations[relation];
				if (leaf === undefined)
					throw new Error(
						`${attempt.callId} has no ${relation} analysis.`,
					);
				if (actual === null && expected === null) return [];
				const status: ReviewObservation["status"] =
					actual === null
						? "material-omission"
						: leaf.falsePositiveCount === 0 &&
								leaf.omissionCount === 0
							? "emitted-match"
							: leaf.truePositiveCount > 0
								? "emitted-partial"
								: "emitted-false-positive";
				return [
					{
						callId: attempt.callId,
						repetition: attempt.repetition,
						caseId: attempt.caseId,
						relation,
						decisionEligible,
						status,
						actual,
						expected,
						acceptableAlternatives:
							adjudication?.acceptableTargetSets?.[relation] ??
							[],
						rationale: adjudication?.rationale ?? "",
						sources,
						harmfulTargets:
							adjudication?.harmfulTargets.filter(
								(item) => item.relation === relation,
							) ?? [],
						metrics: {
							truePositiveCount: leaf.truePositiveCount,
							falsePositiveCount: leaf.falsePositiveCount,
							harmfulFalsePositiveCount:
								leaf.harmfulFalsePositiveCount,
							omissionCount: leaf.omissionCount,
							wrongFamilyCount: leaf.wrongFamilyCount,
							wrongKindCount: leaf.wrongKindCount,
							kindConfusionCount: leaf.confusions.length,
							unclassifiedFalsePositiveCount:
								leaf.unclassifiedFalsePositiveCount,
						},
					},
				];
			});
		});

	const revisions = Object.entries(retained.report.byRevision)
		.sort(
			([, left], [, right]) => left.revisionNumber - right.revisionNumber,
		)
		.map(([id, report]) => ({ id, ...report }));
	return Object.freeze({
		manifest,
		state: await reviewState(),
		acceptancePreflight: {
			formatVersion:
				"german-relation-acceptance-blocked-preflight-v1" as const,
			reservedCaseCount: manifest.acceptanceReservation.reservedCaseCount,
			revealedCaseCount: 0,
			callCount: 0,
			maximumSpendUsd: "0.000000000",
			selectionCommitmentSha256:
				manifest.acceptanceReservation.selectionCommitmentSha256,
			blocked: true,
			blockReason: "development-gate-failed",
		},
		acceptanceResult: null,
		candidateReport,
		revisions,
		observations,
		recommendation: retained.report.recommendation,
		spend: {
			actualUsd: retained.report.actualSpendUsd,
			historicalUsd: retained.report.historicalIssue192SpendUsd,
			cumulativeUsd: retained.report.cumulativeIssue192SpendUsd,
			budgetUsd: retained.report.budgetUsd,
		},
		productionOutcome: {
			qualifiedKinds: [] as readonly RequestableRelation[],
			publicationPolicy: "fail-closed-empty-allowlist",
		},
	});
}

export async function verifyFrozenArtifacts(manifest: CandidateManifest) {
	for (const artifact of manifest.artifacts) {
		const contents = await readFile(
			join(WORKSPACE_DIRECTORY, artifact.path),
		);
		const actual = sha256(contents);
		if (actual !== artifact.sha256)
			throw new Error(
				`Frozen artifact drifted: ${artifact.path}; expected ${artifact.sha256}, got ${actual}.`,
			);
	}
	const calculatedCandidateId = sha256(
		manifest.artifacts
			.map(({ issue, role, path, sha256: digest }) =>
				[issue, role, path, digest].join("\u0000"),
			)
			.join("\u0001"),
	);
	if (calculatedCandidateId !== manifest.candidateId)
		throw new Error(
			`Candidate ID mismatch; expected ${calculatedCandidateId}, got ${manifest.candidateId}.`,
		);
}

export function validateVerdict(
	_manifest: CandidateManifest,
	state: ReviewState,
	_value: unknown,
	_acceptanceResult: Record<string, unknown>,
) {
	throw new Error(
		`Human verdict is locked in state ${state}; development must clear every proposed per-kind threshold before untouched acceptance can exist.`,
	);
}

async function reviewState(): Promise<ReviewState> {
	if (
		(await exists(APPROVAL_PATH)) ||
		(await exists(ACCEPTANCE_RESULT_PATH)) ||
		(await exists(VERDICT_PATH))
	)
		return "invalid-post-development-artifact";
	return "development-gate-failed";
}

function assertManifestShape(value: CandidateManifest): void {
	const finalRevision = PROMPT_REVISIONS.at(-1);
	if (
		value.formatVersion !== "german-relation-human-gate-candidate-v1" ||
		value.state !== "development-gate-failed" ||
		value.candidate.topology !== CANDIDATE_TOPOLOGY ||
		value.candidate.developmentRecommendation !==
			"no-prompt-revision-clears-the-frozen-gate" ||
		finalRevision?.id !== REVIEWED_REVISION_ID ||
		stableJson(value.verdictContract.relationKinds) !==
			stableJson(requestableRelationSchema.options)
	)
		throw new Error("Candidate manifest shape is invalid.");
}

async function exists(path: string) {
	return readFile(path).then(
		() => true,
		() => false,
	);
}

function sha256(value: Uint8Array | string) {
	return createHash("sha256").update(value).digest("hex");
}

function htmlShell(review: Awaited<ReturnType<typeof loadFrozenReview>>) {
	const payload = JSON.stringify(review).replaceAll("<", "\\u003c");
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>German Relation Semantics development gate</title>
<style>
:root{font:15px/1.45 ui-sans-serif,system-ui;color:#e9eef6;background:#0d1117}body{margin:0}.wrap{max-width:1240px;margin:auto;padding:32px}h1,h2{line-height:1.15}.alert{border:1px solid #ff7b72;background:#2d1517;padding:16px;border-radius:10px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin:20px 0}.card,details{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px}.pass{color:#56d364}.fail{color:#ff7b72}.muted{color:#8b949e}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #30363d;padding:8px;vertical-align:top}code{color:#a5d6ff}select,input{font:inherit;color:inherit;background:#21262d;border:1px solid #484f58;border-radius:6px;padding:8px}.controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.target{font-family:ui-monospace,SFMono-Regular,monospace}.badge{display:inline-block;border:1px solid #484f58;border-radius:99px;padding:2px 7px;margin-right:4px}.sticky{position:sticky;top:0;background:#0d1117;padding:8px 0;z-index:2}pre{white-space:pre-wrap;overflow-wrap:anywhere}
</style></head><body><main class="wrap">
<h1>German Relation Semantics development gate</h1>
<div class="alert"><strong>Hard stop: <span id="state"></span></strong><div>No prompt revision cleared the frozen semantic gate. Untouched acceptance is sealed and unavailable.</div></div>
<p>This review is bound to evidence set <code id="candidate"></code>. Opening it writes nothing and makes no provider call.</p>
<div class="cards"><div class="card"><h3>Paid evidence</h3><div>$<span id="actualSpend"></span> this run</div><div>$<span id="cumulativeSpend"></span> cumulative / $<span id="budget"></span> cap</div></div><div class="card"><h3>Production outcome</h3><div class="fail">0 qualified kinds</div><div>Fail-closed empty allowlist</div></div><div class="card"><h3>Acceptance reservation</h3><div><span id="reserved"></span> cases remain sealed</div><div>0 revealed · 0 acceptance calls</div></div></div>
<h2>Six cumulative prompt revisions</h2><div id="revisions" class="cards"></div>
<h2>Final revision, per-kind evidence</h2><div id="metrics" class="cards"></div>
<details open><summary><strong>Operational regression retained</strong></summary><div id="operations"></div></details>
<h2>Every emitted target, material omission, and execution error</h2>
<div class="sticky controls"><select id="relationFilter"><option value="">All relation kinds</option></select><select id="statusFilter"><option value="">All statuses</option></select><select id="evidenceFilter"><option value="">Decision + post-stop evidence</option><option value="decision">Decision evidence only</option><option value="post-stop">Post-stop regression only</option></select><input id="caseFilter" placeholder="Filter case ID"></div>
<p id="count" class="muted"></p><div id="observations"></div>
<h2>Human decision</h2><div class="card"><p><strong>Acceptance approval and promotion are disabled.</strong> Issue #193 requires every proposed kind to clear development before the untouched set can be revealed. The current recommendation for all six kinds is <code>do-not-generate</code>; no verdict artifact is written until a human performs a future qualified review.</p><div id="recommended"></div></div>
</main><script>
const review=${payload}; const kinds=review.manifest.verdictContract.relationKinds;
state.textContent=review.state; candidate.textContent=review.manifest.candidateId; actualSpend.textContent=review.spend.actualUsd; cumulativeSpend.textContent=review.spend.cumulativeUsd; budget.textContent=review.spend.budgetUsd; reserved.textContent=review.acceptancePreflight.reservedCaseCount;
for(const item of review.revisions){const card=document.createElement('div');card.className='card';const harmful=item.harmfulByRepetition.reduce((n,x)=>n+x.harmfulFalsePositiveCount,0);card.innerHTML='<h3>'+item.revisionNumber+'. '+esc(item.title)+' <span class="fail">FAIL</span></h3><div>'+item.semanticReport.contractPassCount+'/'+item.semanticReport.caseObservationCount+' contract passes</div><div>'+item.errorCount+' schema/execution errors · '+harmful+' harmful observations</div><div>$'+item.actualSpendUsd+' · prompt <code>'+item.promptFingerprint.slice(0,12)+'…</code></div>';revisions.append(card)}
const candidateReport=review.candidateReport.semanticReport; for(const kind of kinds){const item=candidateReport.byRelation[kind]; const card=document.createElement('div');card.className='card';card.innerHTML='<h3>'+kind+' <span class="fail">FAIL</span></h3><div>precision '+pct(item.metrics.precision)+' · recall '+pct(item.metrics.recall)+'</div><div>null '+pct(item.metrics.nullAccuracy)+' · stability '+pct(item.metrics.stability)+'</div><div>'+item.metrics.falsePositiveCount+' FP · '+item.metrics.omissionCount+' omissions · '+item.metrics.harmfulFalsePositiveCount+' harmful</div>';metrics.append(card)}
const final=review.candidateReport;operations.innerHTML='<p>Stop triggered after repetition <strong>'+final.stopRuleTriggeredAfterRepetition+'</strong>, but <strong>'+final.postStopAttemptCount+'</strong> additional calls were retained. Stop enforcement: <span class="fail">'+(final.stopEnforcementPass?'PASS':'FAIL')+'</span>. Decision metrics exclude the post-stop repetition; the raw regression remains visible below.</p><p>'+final.errorCount+' schema/execution errors · '+final.refusalCount+' refusals · '+final.incompleteCount+' incomplete responses.</p>';
for(const kind of kinds)relationFilter.add(new Option(kind,kind)); for(const s of [...new Set(review.observations.map(x=>x.status))])statusFilter.add(new Option(s,s));
function target(v){if(v===null)return '<span class="muted">null</span>';return v.map(x=>'<span class="target">'+esc(x.canonicalForm)+' · '+x.family+'/'+x.kind+'</span>').join('<br>')}
function source(s){const locator=s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noreferrer">'+esc(s.url)+'</a>':'<code>'+esc(s.path)+'</code>';return '<li><strong>'+esc(s.title)+'</strong>: '+esc(s.supports)+'<br>'+locator+'</li>'}
function render(){const rows=review.observations.filter(x=>(!relationFilter.value||x.relation===relationFilter.value)&&(!statusFilter.value||x.status===statusFilter.value)&&(!caseFilter.value||x.caseId.includes(caseFilter.value))&&(!evidenceFilter.value||(evidenceFilter.value==='decision'?x.decisionEligible:!x.decisionEligible)));count.textContent=rows.length+' review observations';observations.innerHTML=rows.map(x=>'<details><summary><span class="badge">'+x.status+'</span> '+x.caseId+' · '+x.relation+' · repetition '+x.repetition+(x.decisionEligible?'':' · POST-STOP REGRESSION')+'</summary><table><tr><th>Emitted</th><td>'+target(x.actual)+'</td></tr><tr><th>Expected</th><td>'+target(x.expected)+'</td></tr><tr><th>Harmful if emitted</th><td>'+((x.harmfulTargets||[]).map(h=>target([h.target])+' — '+esc(h.reason)).join('<br>')||'<span class="muted">none declared</span>')+'</td></tr></table><p>'+esc(x.rationale)+'</p>'+(x.sources.length?'<h4>Sources</h4><ul>'+x.sources.map(source).join('')+'</ul>':'')+'<pre>'+esc(JSON.stringify(x.metrics||x.error||{},null,2))+'</pre></details>').join('')}; for(const el of [relationFilter,statusFilter,evidenceFilter,caseFilter])el.addEventListener('input',render);render();
recommended.innerHTML=kinds.map(kind=>'<span class="badge">'+kind+': do-not-generate</span>').join(' ');
function pct(n){return (100*n).toFixed(1)+'%'} function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
</script></body></html>`;
}

export async function startReviewServer() {
	await loadFrozenReview();
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		async fetch(request) {
			const url = new URL(request.url);
			if (request.method === "GET" && url.pathname === "/")
				return new Response(htmlShell(await loadFrozenReview()), {
					headers: { "content-type": "text/html; charset=utf-8" },
				});
			if (request.method === "GET" && url.pathname === "/api/review")
				return Response.json(await loadFrozenReview());
			if (
				request.method === "POST" &&
				(url.pathname === "/api/approve-and-run" ||
					url.pathname === "/api/verdict")
			)
				return Response.json(
					{
						error: "Development gate failed; acceptance and verdict writes are disabled.",
					},
					{ status: 409 },
				);
			return new Response("Not found", { status: 404 });
		},
	});
	const url = `http://${server.hostname}:${server.port}/`;
	console.log(`Frozen development failure verified. Review: ${url}`);
	if (process.platform === "darwin") Bun.spawn(["open", url]);
	return server;
}

if (import.meta.main) await startReviewServer();
