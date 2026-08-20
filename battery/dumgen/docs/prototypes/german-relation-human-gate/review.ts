import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { GermanKnowledgeAnalysis } from "../../../src/knowledge-generation/de/schemas";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../src/knowledge-generation/relations";
import { stableJson } from "../../../src/promptsmith/assembly";
import { analyzeCombinedGermanKnowledgeCase } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import type { GermanRelationEvaluationReport } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import { relationCorpusAdjudications } from "../../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";
import { createLabPlan } from "../german-relation-topology-lab/logic";
import {
	createAcceptancePreflight,
	materializeAcceptanceCasePlan,
	runApprovedAcceptance,
} from "./acceptance";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIRECTORY = resolve(HERE, "../../..");
const WORKSPACE_DIRECTORY = resolve(PACKAGE_DIRECTORY, "../..");
const MANIFEST_PATH = join(HERE, "candidate-manifest.json");
const APPROVAL_PATH = join(HERE, "reservation-approval.json");
const ACCEPTANCE_RESULT_PATH = join(HERE, "acceptance-result.json");
const VERDICT_PATH = join(HERE, "verdict.json");
const REVIEWED_TOPOLOGY = "current-combined-narrow-groups" as const;

type FrozenArtifact = Readonly<{
	issue: 189 | 190 | 191 | 192 | 193;
	role: string;
	path: string;
	sha256: string;
}>;

export type CandidateManifest = Readonly<{
	formatVersion: "german-relation-human-gate-candidate-v1";
	candidateId: string;
	state: "awaiting-human-gate";
	artifacts: readonly FrozenArtifact[];
	candidate: Readonly<{
		topology: typeof REVIEWED_TOPOLOGY;
		model: "gpt-5.6-luna";
		reasoningEffort: "none";
		promptPolicy: string;
		developmentRecommendation: string;
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
	iteration: number;
	topology: string;
	caseId: string;
	relations: readonly RequestableRelation[];
	output?: GermanKnowledgeAnalysis;
	error?: Readonly<{ name: string; message: string }>;
}>;

type RelationTargets = NonNullable<
	NonNullable<
		GermanKnowledgeAnalysis["semanticRelations"]
	>[RequestableRelation]
>;

type ReviewObservation = Readonly<{
	callId: string;
	iteration: number;
	caseId: string;
	relation: RequestableRelation;
	status:
		| "execution-error"
		| "correct-null"
		| "material-omission"
		| "emitted-match"
		| "emitted-partial"
		| "emitted-false-positive";
	actual: RelationTargets | null;
	expected: RelationTargets | null;
	acceptableAlternatives: readonly (RelationTargets | null)[];
	rationale: string;
	harmfulTargets?: readonly Readonly<{
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
	| "invalid-unsealed-reservation"
	| "awaiting-reservation-approval"
	| "approved-awaiting-acceptance"
	| "awaiting-verdict"
	| "complete";

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
	) as {
		attempts: RetainedAttempt[];
		report: {
			byTopology: Record<
				string,
				{
					semanticReport: GermanRelationEvaluationReport;
					gatePass: boolean;
					errorCount: number;
					regressions: unknown[];
				}
			>;
			recommendation: unknown;
		};
	};
	const candidateReport = retained.report.byTopology[REVIEWED_TOPOLOGY];
	const antonymSignal =
		retained.report.byTopology["current-combined-all-kinds"]
			?.semanticReport;
	if (candidateReport === undefined)
		throw new Error(`Retained result has no ${REVIEWED_TOPOLOGY} report.`);

	const plan = createLabPlan();
	const calls = new Map(
		plan.cases
			.filter(({ topology }) => topology === REVIEWED_TOPOLOGY)
			.flatMap((casePlan) =>
				casePlan.calls.map(
					(call) => [call.id, { casePlan, call }] as const,
				),
			),
	);
	const observations: ReviewObservation[] = retained.attempts
		.filter(({ topology }) => topology === REVIEWED_TOPOLOGY)
		.flatMap<ReviewObservation>((attempt) => {
			const planned = calls.get(attempt.callId);
			if (planned === undefined)
				throw new Error(
					`Retained attempt is not in the frozen plan: ${attempt.callId}`,
				);
			if (attempt.error !== undefined) {
				return attempt.relations.map<ReviewObservation>((relation) => ({
					callId: attempt.callId,
					iteration: attempt.iteration,
					caseId: attempt.caseId,
					relation,
					status: "execution-error" as const,
					actual: null,
					expected:
						planned.casePlan.idealOutput.semanticRelations?.[
							relation
						] ?? null,
					acceptableAlternatives: [],
					rationale:
						relationCorpusAdjudications.byCaseId[attempt.caseId]
							?.rationale ?? "",
					error: attempt.error,
				}));
			}
			if (attempt.output === undefined)
				throw new Error(
					`Successful attempt has no parsed output: ${attempt.callId}`,
				);

			const idealRelations =
				planned.casePlan.idealOutput.semanticRelations ?? {};
			const idealOutput = planned.call.outputSchema.parse({
				transcription: attempt.output.transcription,
				definition: attempt.output.definition,
				translations: attempt.output.translations,
				semanticRelations: Object.fromEntries(
					planned.call.relations.map((relation) => [
						relation,
						idealRelations[relation],
					]),
				),
			});
			const analysis = analyzeCombinedGermanKnowledgeCase({
				caseId: attempt.caseId,
				input: planned.call.input,
				idealOutput,
				output: attempt.output,
			});
			const adjudication =
				relationCorpusAdjudications.byCaseId[attempt.caseId];
			return attempt.relations.flatMap((relation) => {
				const actual =
					attempt.output?.semanticRelations?.[relation] ?? null;
				const expected = idealRelations[relation] ?? null;
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
						iteration: attempt.iteration,
						caseId: attempt.caseId,
						relation,
						status,
						actual,
						expected,
						acceptableAlternatives:
							adjudication?.acceptableTargetSets?.[relation] ??
							[],
						rationale: adjudication?.rationale ?? "",
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

	const acceptanceResult = await loadAcceptanceResult();
	return Object.freeze({
		manifest,
		state: await reviewState(manifest),
		acceptancePreflight: createAcceptancePreflight(),
		acceptanceResult,
		candidateReport,
		antonymIsolatedSignal: antonymSignal?.byRelation?.antonym ?? null,
		observations,
		recommendation: retained.report.recommendation,
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
			.map(({ issue, role, path, sha256 }) =>
				[issue, role, path, sha256].join("\u0000"),
			)
			.join("\u0001"),
	);
	if (calculatedCandidateId !== manifest.candidateId)
		throw new Error(
			`Candidate ID mismatch; expected ${calculatedCandidateId}, got ${manifest.candidateId}.`,
		);
}

export function validateVerdict(
	manifest: CandidateManifest,
	state: ReviewState,
	value: unknown,
	acceptanceResult: Record<string, unknown>,
) {
	if (state !== "awaiting-verdict")
		throw new Error(
			`Human verdict is locked in state ${state}; untouched acceptance must exist first.`,
		);
	if (typeof value !== "object" || value === null)
		throw new Error("Verdict must be an object.");
	const record = value as Record<string, unknown>;
	if (
		record.formatVersion !== manifest.verdictContract.formatVersion ||
		record.candidateId !== manifest.candidateId
	)
		throw new Error("Verdict is not bound to the frozen candidate.");
	if (typeof record.recordedAt !== "string" || record.recordedAt.length === 0)
		throw new Error("Verdict has no recordedAt timestamp.");
	if (
		typeof record.reviewer !== "string" ||
		record.reviewer.trim().length === 0
	)
		throw new Error("Verdict has no reviewer.");
	const acceptanceEvidence = record.acceptanceEvidence;
	if (
		typeof acceptanceEvidence !== "object" ||
		acceptanceEvidence === null ||
		(acceptanceEvidence as Record<string, unknown>).status !==
			manifest.verdictContract.requiredAcceptanceStatus ||
		typeof (acceptanceEvidence as Record<string, unknown>)
			.artifactSha256 !== "string" ||
		(acceptanceEvidence as Record<string, unknown>)
			.reservationCommitmentSha256 !==
			manifest.acceptanceReservation.selectionCommitmentSha256
	)
		throw new Error("Verdict has no passing untouched acceptance binding.");
	const byRelation = record.byRelation;
	if (typeof byRelation !== "object" || byRelation === null)
		throw new Error("Verdict has no per-relation decisions.");
	for (const relation of manifest.verdictContract.relationKinds) {
		const item = (byRelation as Record<string, unknown>)[relation];
		if (typeof item !== "object" || item === null)
			throw new Error(`Verdict is missing ${relation}.`);
		const decision = (item as Record<string, unknown>).decision;
		const note = (item as Record<string, unknown>).note;
		if (!manifest.verdictContract.decisions.includes(decision as never))
			throw new Error(`Verdict has an invalid ${relation} decision.`);
		if (typeof note !== "string")
			throw new Error(`Verdict has no ${relation} note field.`);
		if (
			decision === "promote" &&
			acceptanceRelationPass(acceptanceResult, relation) !== true
		)
			throw new Error(
				`${relation} cannot be promoted without an independent untouched acceptance pass.`,
			);
	}
	return value;
}

async function reviewState(manifest: CandidateManifest): Promise<ReviewState> {
	if (
		manifest.acceptanceReservation.reservedCaseCount === 0 ||
		manifest.acceptanceReservation.selectionCommitmentSha256 === null
	)
		return "invalid-unsealed-reservation";
	if (await exists(VERDICT_PATH)) return "complete";
	if (!(await exists(APPROVAL_PATH))) return "awaiting-reservation-approval";
	if (!(await exists(ACCEPTANCE_RESULT_PATH)))
		return "approved-awaiting-acceptance";
	return "awaiting-verdict";
}

async function loadAcceptanceResult() {
	if (!(await exists(ACCEPTANCE_RESULT_PATH))) return null;
	const contents = await readFile(ACCEPTANCE_RESULT_PATH);
	const artifact = JSON.parse(contents.toString("utf8")) as Record<
		string,
		unknown
	>;
	return Object.freeze({
		artifactSha256: sha256(contents),
		artifact,
		observations: acceptanceObservations(artifact),
	});
}

function acceptanceObservations(
	artifact: Record<string, unknown>,
): readonly ReviewObservation[] {
	if (!Array.isArray(artifact.attempts)) return [];
	return (artifact.attempts as RetainedAttempt[]).flatMap<ReviewObservation>(
		(attempt) => {
			const casePlan = materializeAcceptanceCasePlan(
				attempt.iteration,
				REVIEWED_TOPOLOGY,
				attempt.caseId,
			);
			const call = casePlan.calls.find(({ id }) => id === attempt.callId);
			if (call === undefined)
				throw new Error(
					`Acceptance attempt is outside the frozen plan: ${attempt.callId}`,
				);
			const adjudication =
				relationCorpusAdjudications.byCaseId[attempt.caseId];
			return attempt.relations.map<ReviewObservation>((relation) => {
				const expected =
					casePlan.idealOutput.semanticRelations?.[relation] ?? null;
				const common = {
					callId: attempt.callId,
					iteration: attempt.iteration,
					caseId: attempt.caseId,
					relation,
					expected,
					acceptableAlternatives:
						adjudication?.acceptableTargetSets?.[relation] ?? [],
					rationale: adjudication?.rationale ?? "",
					harmfulTargets: adjudication?.harmfulTargets.filter(
						(item) => item.relation === relation,
					),
				};
				if (attempt.error !== undefined || attempt.output === undefined)
					return {
						...common,
						status: "execution-error",
						actual: null,
						error: attempt.error ?? {
							name: "MissingOutput",
							message: "Retained attempt has no parsed output.",
						},
					};
				const actual =
					attempt.output.semanticRelations?.[relation] ?? null;
				const idealOutput = call.outputSchema.parse({
					transcription: attempt.output.transcription,
					definition: attempt.output.definition,
					translations: attempt.output.translations,
					semanticRelations: { [relation]: expected },
				});
				const leaf = analyzeCombinedGermanKnowledgeCase({
					caseId: attempt.caseId,
					input: call.input,
					idealOutput,
					output: attempt.output,
				}).relations[relation];
				if (leaf === undefined)
					throw new Error(`Acceptance has no ${relation} analysis.`);
				const status: ReviewObservation["status"] =
					actual === null && expected === null
						? "correct-null"
						: actual === null
							? "material-omission"
							: leaf.falsePositiveCount === 0 &&
									leaf.omissionCount === 0
								? "emitted-match"
								: leaf.truePositiveCount > 0
									? "emitted-partial"
									: "emitted-false-positive";
				return {
					...common,
					status,
					actual,
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
				};
			});
		},
	);
}

function acceptanceRelationPass(
	acceptanceResult: Record<string, unknown>,
	relation: RequestableRelation,
) {
	const report = acceptanceResult.report;
	if (typeof report !== "object" || report === null) return false;
	const byRelationPass = (report as Record<string, unknown>).byRelationPass;
	return typeof byRelationPass === "object" && byRelationPass !== null
		? (byRelationPass as Record<string, unknown>)[relation]
		: false;
}

function assertManifestShape(value: CandidateManifest): void {
	if (
		value.formatVersion !== "german-relation-human-gate-candidate-v1" ||
		value.state !== "awaiting-human-gate" ||
		value.candidate.topology !== REVIEWED_TOPOLOGY ||
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

async function writeExclusiveJson(path: string, value: unknown) {
	const file = await open(path, "wx").catch((cause) => {
		throw new Error(`${path} already exists and cannot be replaced.`, {
			cause,
		});
	});
	try {
		await file.writeFile(`${JSON.stringify(value, null, "\t")}\n`, "utf8");
	} finally {
		await file.close();
	}
}

function sha256(value: Uint8Array | string) {
	return createHash("sha256").update(value).digest("hex");
}

function htmlShell(review: Awaited<ReturnType<typeof loadFrozenReview>>) {
	const payload = JSON.stringify(review).replaceAll("<", "\\u003c");
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>German Relation Semantics gate</title>
<style>
:root{font:15px/1.45 ui-sans-serif,system-ui;color:#e9eef6;background:#0d1117}body{margin:0}.wrap{max-width:1240px;margin:auto;padding:32px}h1,h2{line-height:1.15}.alert{border:1px solid #f0b429;background:#2b2110;padding:16px;border-radius:10px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin:20px 0}.card,details{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px}.pass{color:#56d364}.fail{color:#ff7b72}.muted{color:#8b949e}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #30363d;padding:8px;vertical-align:top}code{color:#a5d6ff}select,input,textarea,button{font:inherit;color:inherit;background:#21262d;border:1px solid #484f58;border-radius:6px;padding:8px}textarea{width:100%;box-sizing:border-box}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.45}.controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.target{font-family:ui-monospace,SFMono-Regular,monospace}.badge{display:inline-block;border:1px solid #484f58;border-radius:99px;padding:2px 7px;margin-right:4px}.verdict{display:grid;grid-template-columns:140px repeat(3,1fr);gap:8px;align-items:center;margin:8px 0}.sticky{position:sticky;top:0;background:#0d1117;padding:8px 0;z-index:2}
</style></head><body><main class="wrap">
<h1>German Relation Semantics gate</h1>
<div class="alert"><strong>Hard stop: <span id="state"></span></strong><div id="stateHelp"></div></div>
<p>This review is bound to candidate <code id="candidate"></code>. Opening it writes nothing and makes no provider call.</p>
<h2>Untouched acceptance</h2><div class="card" id="acceptance"></div><div id="acceptanceObservations"></div>
<h2>Per-kind evidence</h2><div id="metrics" class="cards"></div>
<details open><summary><strong>Antonym isolated signal</strong></summary><pre id="antonym"></pre></details>
<h2>Every emitted target and material omission</h2>
<div class="sticky controls"><select id="relationFilter"><option value="">All relation kinds</option></select><select id="statusFilter"><option value="">All statuses</option></select><input id="caseFilter" placeholder="Filter case ID"></div>
<p id="count" class="muted"></p><div id="observations"></div>
<h2>Explicit human verdict</h2><p class="muted">Controls remain locked until a non-empty sealed reservation has been approved, revealed once, and retained untouched acceptance has completed. Development evidence cannot unlock promotion.</p>
<div id="verdicts"></div><label>Reviewer <input id="reviewer"></label><br><br><button id="approve">Approve seal & run once</button> <button id="submit">Record frozen verdict</button><p id="actionMessage"></p>
</main><script>
const review=${payload}; const kinds=review.manifest.verdictContract.relationKinds;
const stateHelp={"invalid-unsealed-reservation":"#190 contains zero reserved acceptance cases and no selection commitment. Add a genuine disjoint sealed reservation before asking a human to approve reveal.","awaiting-reservation-approval":"Review the candidate, then approve the one-time sealed-selection reveal.","approved-awaiting-acceptance":"The one-shot acceptance run must complete under the frozen failure policy.","awaiting-verdict":"Untouched acceptance is retained. Record one decision per kind.",complete:"The human verdict is frozen."};
state.textContent=review.state; stateHelp.textContent=stateHelp[review.state]||""; candidate.textContent=review.manifest.candidateId;
acceptance.innerHTML='<div><strong>'+review.acceptancePreflight.reservedCaseCount+' sealed cases · '+review.acceptancePreflight.callCount+' calls · max $'+review.acceptancePreflight.maximumSpendUsd+'</strong></div><div>commitment <code>'+review.acceptancePreflight.selectionCommitmentSha256+'</code></div>'+(review.acceptanceResult?'<pre>'+esc(JSON.stringify(review.acceptanceResult.artifact.report,null,2))+'</pre>':'<p class="muted">Case identities and judgments stay out of this review payload until approval. The button authorizes the exact ceiling and immediately executes the one-shot plan with zero retries.</p>');
if(review.acceptanceResult){acceptanceObservations.innerHTML='<h3>Every untouched acceptance observation</h3>'+review.acceptanceResult.observations.map(x=>'<details><summary><span class="badge">'+x.status+'</span> '+x.caseId+' · '+x.relation+' · iteration '+x.iteration+'</summary><table><tr><th>Emitted</th><td>'+target(x.actual)+'</td></tr><tr><th>Expected</th><td>'+target(x.expected)+'</td></tr><tr><th>Harmful if emitted</th><td>'+((x.harmfulTargets||[]).map(h=>target([h.target])+' — '+esc(h.reason)).join('<br>')||'<span class="muted">none declared</span>')+'</td></tr></table><p>'+esc(x.rationale)+'</p><pre>'+esc(JSON.stringify(x.metrics||x.error||{},null,2))+'</pre></details>').join('')}
const candidateReport=review.candidateReport.semanticReport; for(const kind of kinds){const item=candidateReport.byRelation[kind]; const card=document.createElement('div');card.className='card';card.innerHTML='<h3>'+kind+' <span class="'+(item.gate.pass?'pass':'fail')+'">'+(item.gate.pass?'PASS':'FAIL')+'</span></h3><div>precision '+pct(item.metrics.precision)+' · recall '+pct(item.metrics.recall)+'</div><div>null '+pct(item.metrics.nullAccuracy)+' · stability '+pct(item.metrics.stability)+'</div><div>'+item.metrics.falsePositiveCount+' FP · '+item.metrics.omissionCount+' omissions · '+item.metrics.harmfulFalsePositiveCount+' harmful</div>';metrics.append(card)}
antonym.textContent=JSON.stringify(review.antonymIsolatedSignal,null,2);
for(const kind of kinds)relationFilter.add(new Option(kind,kind)); for(const s of [...new Set(review.observations.map(x=>x.status))])statusFilter.add(new Option(s,s));
function target(v){if(v===null)return '<span class="muted">null</span>';return v.map(x=>'<span class="target">'+esc(x.canonicalForm)+' · '+x.family+'/'+x.kind+'</span>').join('<br>')}
function render(){const rows=review.observations.filter(x=>(!relationFilter.value||x.relation===relationFilter.value)&&(!statusFilter.value||x.status===statusFilter.value)&&x.caseId.includes(caseFilter.value));count.textContent=rows.length+' review observations';observations.innerHTML=rows.map(x=>'<details><summary><span class="badge">'+x.status+'</span> '+x.caseId+' · '+x.relation+' · iteration '+x.iteration+'</summary><table><tr><th>Emitted</th><td>'+target(x.actual)+'</td></tr><tr><th>Expected</th><td>'+target(x.expected)+'</td></tr></table><p>'+esc(x.rationale)+'</p>'+(x.error?'<pre>'+esc(JSON.stringify(x.error,null,2))+'</pre>':'')+'</details>').join('')}; for(const el of [relationFilter,statusFilter,caseFilter])el.addEventListener('input',render);render();
const verdictEnabled=review.state==='awaiting-verdict'; for(const kind of kinds){const row=document.createElement('div');row.className='verdict';row.innerHTML='<strong>'+kind+'</strong>'+review.manifest.verdictContract.decisions.map(d=>'<label><input type="radio" name="'+kind+'" value="'+d+'" '+(verdictEnabled?'':'disabled')+'> '+d+'</label>').join('');verdicts.append(row)}
approve.disabled=review.state!=='awaiting-reservation-approval'&&review.state!=='approved-awaiting-acceptance'; submit.disabled=!verdictEnabled;
approve.onclick=async()=>{const reviewer=document.querySelector('#reviewer').value.trim();if(!reviewer){actionMessage.textContent='Enter the reviewer name first.';return}if(!confirm('Reveal the committed 12-case reservation and authorize the exact $'+review.acceptancePreflight.maximumSpendUsd+' maximum? This consumes the reservation and cannot be retried.'))return;approve.disabled=true;actionMessage.textContent='Running one-shot untouched acceptance…';const response=await fetch('/api/approve-and-run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reviewer,authorizedMaximumSpendUsd:review.acceptancePreflight.maximumSpendUsd})});const body=await response.json();if(!response.ok){actionMessage.textContent=body.error||'Acceptance failed';approve.disabled=false;return}location.reload()};
submit.onclick=async()=>{const reviewer=document.querySelector('#reviewer').value.trim();const byRelation={};for(const kind of kinds){const selected=document.querySelector('input[name="'+kind+'"]:checked');if(!selected){actionMessage.textContent='Choose a verdict for '+kind+'.';return}byRelation[kind]={decision:selected.value,note:''}}const response=await fetch('/api/verdict',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reviewer,byRelation})});const body=await response.json();if(!response.ok){actionMessage.textContent=body.error||'Verdict failed';return}location.reload()};
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
			if (request.method === "GET" && url.pathname === "/") {
				const currentReview = await loadFrozenReview();
				return new Response(htmlShell(currentReview), {
					headers: { "content-type": "text/html; charset=utf-8" },
				});
			}
			if (request.method === "GET" && url.pathname === "/api/review")
				return Response.json(await loadFrozenReview());
			if (
				request.method === "POST" &&
				url.pathname === "/api/approve-and-run"
			) {
				return request
					.json()
					.then(async (value) => {
						const currentReview = await loadFrozenReview();
						const body = value as Record<string, unknown>;
						const currentState = await reviewState(
							currentReview.manifest,
						);
						if (
							currentState !== "awaiting-reservation-approval" &&
							currentState !== "approved-awaiting-acceptance"
						)
							throw new Error(
								`Acceptance cannot start in state ${currentState}.`,
							);
						const reviewer = body.reviewer;
						const authorizedMaximumSpendUsd =
							body.authorizedMaximumSpendUsd;
						if (
							typeof reviewer !== "string" ||
							reviewer.trim().length === 0 ||
							authorizedMaximumSpendUsd !==
								currentReview.acceptancePreflight
									.maximumSpendUsd
						)
							throw new Error(
								"Approval is incomplete or has the wrong ceiling.",
							);
						if (currentState === "awaiting-reservation-approval") {
							await writeExclusiveJson(APPROVAL_PATH, {
								formatVersion:
									"german-relation-acceptance-approval-v1",
								candidateId: currentReview.manifest.candidateId,
								selectionCommitmentSha256:
									currentReview.acceptancePreflight
										.selectionCommitmentSha256,
								authorizedMaximumSpendUsd,
								reviewer: reviewer.trim(),
								recordedAt: new Date().toISOString(),
							});
						}
						await runApprovedAcceptance({
							candidateId: currentReview.manifest.candidateId,
							authorizedMaximumSpendUsd,
						});
						return Response.json({ status: "awaiting-verdict" });
					})
					.catch((cause) => errorResponse(cause));
			}
			if (request.method === "POST" && url.pathname === "/api/verdict") {
				return request
					.json()
					.then(async (value) => {
						const currentReview = await loadFrozenReview();
						const currentState = await reviewState(
							currentReview.manifest,
						);
						const submitted = value as Record<string, unknown>;
						const acceptanceResult = await loadAcceptanceResult();
						if (acceptanceResult === null)
							throw new Error(
								"Untouched acceptance evidence is absent.",
							);
						const verdict = validateVerdict(
							currentReview.manifest,
							currentState,
							{
								formatVersion:
									currentReview.manifest.verdictContract
										.formatVersion,
								candidateId: currentReview.manifest.candidateId,
								recordedAt: new Date().toISOString(),
								reviewer: submitted.reviewer,
								acceptanceEvidence: {
									status: currentReview.manifest
										.verdictContract
										.requiredAcceptanceStatus,
									artifactSha256:
										acceptanceResult.artifactSha256,
									reservationCommitmentSha256:
										currentReview.manifest
											.acceptanceReservation
											.selectionCommitmentSha256,
								},
								byRelation: submitted.byRelation,
							},
							acceptanceResult.artifact,
						);
						await writeExclusiveJson(VERDICT_PATH, verdict);
						return Response.json({ status: "complete" });
					})
					.catch((cause) => errorResponse(cause));
			}
			return new Response("Not found", { status: 404 });
		},
	});
	const url = `http://${server.hostname}:${server.port}/`;
	console.log(`Frozen candidate verified. Review: ${url}`);
	if (process.platform === "darwin") Bun.spawn(["open", url]);
	return server;
}

function errorResponse(cause: unknown) {
	return Response.json(
		{ error: cause instanceof Error ? cause.message : String(cause) },
		{ status: 409 },
	);
}

if (import.meta.main) await startReviewServer();
