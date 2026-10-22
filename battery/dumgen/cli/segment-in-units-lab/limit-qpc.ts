/**
 * The lab's `limit-qpc`: questions per jev call at several sizes, priced and
 * spent against the round.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type LabCase,
	loadSet,
} from "../../lab/segmentation/harness/corpus.js";
import type { CallRecord } from "../../lab/segmentation/harness/jev-cache.js";
import {
	appendLedger,
	spendOf,
} from "../../lab/segmentation/harness/ledger.js";
import { questionsPerCall } from "../../lab/segmentation/harness/limits.js";
import { provenanceOf } from "../../lab/segmentation/harness/provenance.js";
import {
	guardProjectedSpend,
	priceProjection,
	projectedSpend,
	projectionText,
	standInAnswers,
} from "../../lab/segmentation/harness/round.js";
import {
	account,
	cliSources,
	evidenceRoot,
	jevCache,
	ledgerPath,
	packageRoot,
	printEstimate,
	repository,
	setsRoot,
	values,
} from "./context.js";

export async function limitQuestionsPerCall() {
	const set = await loadSet(setsRoot, "dev");
	const pieces = (labCase: LabCase) =>
		labCase.input.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length;
	const cases = [...set.cases]
		.sort((a, b) => pieces(b) - pieces(a))
		.slice(0, Number(values.limit ?? 12));
	const { round, pin, stopLine, spent } = await account(
		!values.estimate,
		"limit-qpc",
	);
	const sizes = (values.sizes ?? "").split(",").map(Number);
	const projecting = jevCache({
		...(values.model ? { model: values.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		offline: true,
		project: standInAnswers,
	});
	await questionsPerCall({
		cases,
		jev: projecting,
		sizes,
		baselineRepetitions: 3,
	});
	const priced = priceProjection(projecting.projection);
	console.log(projectionText(priced));
	if (values.estimate) {
		printEstimate(round, spent, stopLine, projectedSpend(priced));
		return;
	}
	guardProjectedSpend({ round, spent, stopLine, priced });
	const provenance = await provenanceOf({
		packageRoot,
		repository,
		cliSources,
	});
	const calls: CallRecord[] = [];
	let fresh = 0;
	const jev = jevCache({
		...(values.model ? { model: values.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		beforeSpend: () => {
			if (spent + fresh >= stopLine)
				throw Error(
					`Round ${round.id} reached its stop line: ${spent + fresh} of ${stopLine} fresh jev input tokens`,
				);
		},
		onSpend: (tokens) => {
			fresh += tokens;
		},
	});
	const results = await questionsPerCall({
		cases,
		jev,
		sizes,
		baselineRepetitions: 3,
	});
	console.log(
		`${cases.length} sentences, ${cases.map(pieces).join("/")} pieces`,
	);
	console.log(
		"q/call rep  calls failed  tokens    meanMs  maxMs   |Δp| vs base  flips/compared  errors",
	);
	for (const result of results) {
		console.log(
			`${String(result.questionsPerCall).padStart(6)} ${result.repetition}  ${String(result.calls).padStart(5)} ${String(result.failedCalls).padStart(6)} ${String(result.inputTokens).padStart(8)} ${result.meanCallLatencyMs.toFixed(0).padStart(7)} ${result.maxCallLatencyMs.toFixed(0).padStart(6)}   ${result.meanAbsoluteDifference.toFixed(4)}        ${result.decisionFlips}/${result.compared}  ${result.errors.join(" | ").slice(0, 300)}`,
		);
		calls.push({
			executor: "jev",
			stage: "limit",
			questions: result.questions,
			inputTokens: result.inputTokens,
			outputTokens: 0,
			latencyMs: 0,
			cached: true,
		});
	}
	const runId = `${new Date().toISOString().replace(/[-:]/gu, "").slice(0, 15)}--limit-qpc`;
	await mkdir(join(evidenceRoot, "summaries"), { recursive: true });
	await writeFile(
		join(evidenceRoot, "summaries", `${runId}.json`),
		`${JSON.stringify({ runId, set: set.name, setHash: set.hash, cases: cases.map(({ id }) => id), results }, null, 1)}\n`,
	);
	const spend = spendOf(calls);
	await appendLedger(ledgerPath, {
		runId,
		at: new Date().toISOString(),
		command: "limit-qpc",
		round: round.id,
		pin: pin.hash,
		set: set.name,
		setHash: set.hash,
		cases: cases.length,
		gitHead: provenance.gitHead,
		dirty: provenance.dirty,
		codeHash: provenance.codeHash,
		model: [...jev.resolvedModels].join(",") || jev.model,
		...spend,
		jev: { ...spend.jev, freshCalls: 0, freshInputTokens: fresh },
	});
}
