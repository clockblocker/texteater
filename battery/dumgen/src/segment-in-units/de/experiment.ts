/**
 * The German `segment.inUnits` experiments `cli/evaluate.ts` runs (#701):
 * the lab's reference arm over one of the lab's frozen sets, `dev` or
 * `heldout`, scored by the harness evaluator. Each case runs three times, as
 * in the lab's reference runs, and jev answers come through the lab's cache,
 * so a case the lab has run replays without a call. `offline` makes a cache
 * miss fail its case instead of asking jev.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import {
	type OperationEvaluationRun,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import {
	segmentInUnitsInputSchema,
	segmentInUnitsOutputSchema,
	segmentInUnitsRoute,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import {
	evaluateSegmentInUnits,
	type SegmentInUnitsEvaluation,
} from "../../evaluation/spec-corpus/segment-in-units-evaluation.js";
import {
	type HoverCheck,
	hoverRates,
	sumHover,
} from "../../evaluation/spec-corpus/segment-in-units-grouping.js";
import { type LabSet, loadSet, type SetName, setPath } from "../lab/corpus.js";
import { type CallRecord, Jev } from "../lab/jev.js";
import { referenceArm } from "./arms/reference.js";

const labRoot = fileURLToPath(
	new URL("../../../.runs/segment-in-units-lab/", import.meta.url),
);
const setNames = ["dev", "heldout"] as const satisfies readonly SetName[];
/** The lab's reference runs repeat each case three times; each repetition is its own cached answer. */
const repetitions = 3;
const idOf = (set: SetName) => `${segmentInUnitsRoute}:${set}`;

export const isSegmentInUnitsExperiment = (id: string) =>
	id.startsWith(`${segmentInUnitsRoute}:`);

function setOf(id: string): SetName {
	const set = setNames.find((name) => idOf(name) === id);
	if (!set)
		throw Error(
			`Unknown experiment ${id}; use ${setNames.map(idOf).join(" or ")}`,
		);
	return set;
}

/** One entry per frozen set; a set not frozen yet lists no cases. */
export function listSegmentInUnitsExperiments() {
	return setNames.map((name) => {
		const path = setPath(labRoot, name);
		const cases = existsSync(path)
			? (JSON.parse(readFileSync(path, "utf8")) as LabSet).cases.length
			: 0;
		return {
			id: idOf(name),
			mode: "Operation" as const,
			demonstrationCount: 0,
			caseCount: cases,
			evaluationCount: cases,
		};
	});
}

export async function evaluateSegmentInUnitsExperiment(args: {
	readonly experimentId: string;
	/** Asked on a cache miss when not `offline`. */
	readonly judge: TypeSafeExecutor;
	/** A pinned jev version; the lab's by default. */
	readonly judgmentModel?: string;
	readonly offline?: boolean;
	readonly sourceRevision: string;
	readonly outputDirectory?: string;
	readonly signal?: AbortSignal;
}): Promise<OperationEvaluationRun> {
	const name = setOf(args.experimentId);
	if (!existsSync(setPath(labRoot, name)))
		throw Error(
			`The lab's ${name} set is not frozen; run \`bun run segment-in-units-lab freeze\` first`,
		);
	const set = await loadSet(labRoot, name);
	const jev = new Jev({
		cacheDirectory: join(labRoot, "cache"),
		...(args.judgmentModel ? { model: args.judgmentModel } : {}),
		executor: args.judge,
		offline: args.offline ?? false,
	});
	const corpus = defineGoldenCorpus({
		route: segmentInUnitsRoute,
		inputSchema: segmentInUnitsInputSchema,
		outputSchema: segmentInUnitsOutputSchema,
		collections: {
			lab: defineGoldenCaseCollection(
				`segment-in-units-lab:${set.name}@${set.hash}`,
				{
					groups: {
						cases: defineGoldenCaseGroup(
							Object.fromEntries(
								set.cases.map((labCase) => [
									labCase.id,
									{
										input: labCase.input,
										idealOutput: labCase.idealOutput,
										contaminationKeys: [labCase.record],
									},
								]),
							),
						),
					},
					cases: {},
				},
			),
		},
	});
	// promptsmith runs a case's repetitions back to back and passes no index,
	// so the attempts at one input count off the cache's repetitions.
	const attempts = new Map<string, number>();
	const configuration = {
		model: jev.model,
		settings: { arm: referenceArm.id, offline: args.offline ?? false },
	};
	const run = await runOperationExperiment({
		experiment: {
			corpus,
			evaluation: corpus.select(set.cases.map(({ id }) => id)),
			demonstrations: corpus.select([]),
			async run(input, context) {
				const key = stableJson(input);
				const attempt = attempts.get(key) ?? 0;
				attempts.set(key, attempt + 1);
				const calls: CallRecord[] = [];
				try {
					const result = await referenceArm.run(input, {
						jev,
						repetition: attempt % repetitions,
						calls,
						options: {},
					});
					const output = result.outputs[result.primary];
					if (!output)
						throw Error(
							`The reference returned no ${result.primary}`,
						);
					return output;
				} finally {
					context.recordTrace({
						calls: calls.map((call) => ({
							executor: "TypeSafe" as const,
							output: {
								usage: {
									input_tokens: call.inputTokens,
									output_tokens: call.outputTokens,
								},
							},
							metadata: {
								stage: call.stage,
								cached: call.cached,
							},
						})),
					});
				}
			},
			evaluator: evaluateSegmentInUnits(
				Object.fromEntries(
					set.cases.map((labCase) => [labCase.id, labCase.facts]),
				),
			),
		},
		experimentId: args.experimentId,
		operationVersion: `${referenceArm.id}:{}`,
		evaluatorVersion: "segment-in-units-1",
		sourceRevision: args.sourceRevision,
		// jev both groups and routes; nothing else generates.
		configurations: { generation: configuration, judgment: configuration },
		repetitions,
		...(args.signal ? { signal: args.signal } : {}),
	});
	if (args.outputDirectory) await saveRun(args.outputDirectory, run);
	return run;
}

type Counts = { [key: string]: number | Counts };
type Scored = { readonly evaluation?: unknown };

/** Adds the evaluator's counts, nested ones included, into `totals`; lists hold per-unit detail and are skipped. */
function addCounts(totals: Counts, evaluation: object): void {
	for (const [key, value] of Object.entries(evaluation)) {
		const total = totals[key];
		if (typeof value === "number")
			totals[key] = (typeof total === "number" ? total : 0) + value;
		else if (value && typeof value === "object" && !Array.isArray(value)) {
			const nested = typeof total === "object" ? total : {};
			addCounts(nested, value);
			if (Object.keys(nested).length > 0) totals[key] = nested;
		}
	}
}

const headline = [
	"membership",
	"tolerantMatched",
	"matched",
] as const satisfies readonly (keyof SegmentInUnitsEvaluation)[];

/**
 * The evaluator's counts summed over every repetition it scored, and the
 * ADR 0008 headline rates over the scored gold units: membership, then the
 * tolerant and the strict route. Beside them, the evaluator's hover B-cubed
 * (#701) on every record, on Full records only and over multi-piece gold
 * units, each with the hovered Segments it is counted over. A repetition
 * that failed before scoring shows in the run's summary instead.
 */
export function segmentInUnitsMetrics(run: {
	readonly cases: readonly (Scored & {
		readonly repetitions?: readonly Scored[];
	})[];
}) {
	const evaluations = run.cases
		.flatMap((record) => record.repetitions ?? [record])
		.flatMap(({ evaluation }) =>
			evaluation && typeof evaluation === "object" ? [evaluation] : [],
		);
	const totals: Counts = {};
	for (const evaluation of evaluations) addCounts(totals, evaluation);
	const count = (key: string) => {
		const value = totals[key];
		return typeof value === "number" ? value : 0;
	};
	const contract = evaluations.flatMap((evaluation) =>
		"contractPass" in evaluation ? [evaluation.contractPass === true] : [],
	);
	const hoverOf = (scope: readonly Partial<SegmentInUnitsEvaluation>[]) =>
		sumHover(
			scope.flatMap(({ hover }): HoverCheck[] => (hover ? [hover] : [])),
		);
	const hover = hoverOf(evaluations);
	const fullHover = hoverOf(
		evaluations.filter(
			(evaluation: Partial<SegmentInUnitsEvaluation>) =>
				evaluation.coverage === "Full",
		),
	);
	return {
		evaluated: evaluations.length,
		rates: {
			...Object.fromEntries(
				headline.map((key) => [key, count(key) / count("scored")]),
			),
			contractPass: contract.filter(Boolean).length / contract.length,
			hover: { ...hoverRates(hover), segments: hover.segments },
			fullHover: {
				...hoverRates(fullHover),
				segments: fullHover.segments,
			},
			multiHover: {
				...hoverRates(hover.multi),
				segments: hover.multi.segments,
			},
		},
		totals,
	};
}
