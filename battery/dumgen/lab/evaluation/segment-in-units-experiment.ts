/**
 * The segment.inUnits experiments of the evaluation table
 * (`experiments.ts`), one per frozen set and mode
 * (`segment-in-units-modes.ts`): their case selection, the cache passes a
 * live run prices and fills, the traced run adapter, and the request run.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
} from "promptsmith";
import {
	type OperationEvidence,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import type { z } from "zod";
import {
	currentSetSize,
	type LabCase,
	type LabSet,
	loadSet,
	type SetName,
	trackedSetsRoot,
} from "../segmentation/harness/corpus.js";
import {
	type CallRecord,
	hashOf,
	JevCache,
} from "../segmentation/harness/jev-cache.js";
import { spendOf } from "../segmentation/harness/ledger.js";
import {
	contraryAnswers,
	type PricedProjection,
	priceProjection,
	standInAnswers,
} from "../segmentation/harness/round.js";
import type {
	BuiltRequests,
	CaseList,
	EvaluateArgs,
	Evaluated,
	Experiment,
} from "./experiment-types.js";
import {
	everyAttempt,
	type LabEffect,
	type LabRuntime,
	onLabRuntime,
	outcomeOf,
	runOn,
} from "./lab-runtime.js";
import {
	type CaseRequests,
	type RecordedOutcome,
	type RecordedRequest,
	sortedRequests,
} from "./request-diff.js";
import type { Context, Mode } from "./segment-in-units-modes.js";
import { segmentInUnitsRoute } from "./spec-corpus/segment-in-units.js";

export const defaultLabRoot = fileURLToPath(
	new URL("../../.runs/segment-in-units-lab/", import.meta.url),
);

/** The lab's runs repeat each case three times; each repetition is its own cached answer. */
const repetitions = 3;
export const setNames = [
	"dev",
	"heldout",
] as const satisfies readonly SetName[];

const idOf = (set: SetName, suffix: string) =>
	`${segmentInUnitsRoute}:${set}${suffix}`;

/**
 * The cases a segment.inUnits run takes: the whole set, or the cases
 * `caseIds` names, with `named`, their `CaseList` as the manifest's settings
 * and the run's result keep it. An empty list, a repeated id or an id the
 * set lacks throws.
 */
function selectCases(
	set: LabSet,
	caseIds: readonly string[] | undefined,
): {
	readonly cases: readonly LabCase[];
	readonly named: { readonly caseList?: CaseList };
} {
	if (!caseIds) return { cases: set.cases, named: {} };
	const wanted = new Set(caseIds);
	if (wanted.size === 0) throw Error("The case list names no case");
	if (wanted.size !== caseIds.length)
		throw Error("The case list names a case twice");
	const cases = set.cases.filter(({ id }) => wanted.has(id));
	if (cases.length !== wanted.size) {
		const present = new Set(cases.map(({ id }) => id));
		const missing = caseIds.filter((id) => !present.has(id));
		throw Error(
			`The case list names cases set ${set.name}@${set.hash} lacks: ${missing.join(", ")}`,
		);
	}
	const ids = cases.map(({ id }) => id);
	return {
		cases,
		named: {
			caseList: { hash: hashOf([...ids].sort()).slice(0, 16), ids },
		},
	};
}

/** Every case's every repetition through `operation`, `concurrency` at a time; failures are left for the run. */
const pass = <I>(
	cases: readonly { readonly input: I }[],
	operation: (input: I, context: Context) => LabEffect<unknown>,
	jev: JevCache,
	concurrency: number,
	calls: CallRecord[],
): LabEffect<void> =>
	everyAttempt(
		cases.flatMap(({ input }) =>
			Array.from({ length: repetitions }, (_, repetition) => ({
				input,
				repetition,
			})),
		),
		({ input, repetition }) => operation(input, { jev, repetition, calls }),
		concurrency,
	);

/**
 * The one traced run adapter: promptsmith runs a case's repetitions back
 * to back and passes no index, so the attempts at one input count off the
 * cache's repetitions, and each attempt's jev calls become its trace. Each
 * attempt runs on the run's runtime under promptsmith's signal.
 */
function traced<I, O>(
	operation: (input: I, context: Context) => LabEffect<O>,
	jev: JevCache,
	calls: CallRecord[],
	runtime: LabRuntime,
) {
	const attempts = new Map<string, number>();
	return async (
		input: I,
		context: {
			readonly signal: AbortSignal;
			readonly recordTrace: (trace: OperationEvidence) => void;
		},
	): Promise<O> => {
		const key = canonicalJson(input);
		const attempt = attempts.get(key) ?? 0;
		attempts.set(key, attempt + 1);
		const own: CallRecord[] = [];
		try {
			return await runOn(
				runtime,
				operation(input, {
					jev,
					repetition: attempt % repetitions,
					calls: own,
				}),
				context.signal,
			);
		} finally {
			calls.push(...own);
			context.recordTrace({
				calls: own.map((call) => ({
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
						...(call.retries ? { retries: call.retries } : {}),
						...(call.error ? { error: call.error } : {}),
					},
				})),
			});
		}
	};
}

/**
 * The answer paths a segment.inUnits request run walks: the projection's
 * stand-ins, and their contrary, which reaches the requests behind a "no"
 * or a later option when the cache is cold (#1064).
 */
const answerPaths = [
	{ path: "stand-in", project: standInAnswers },
	{ path: "contrary", project: contraryAnswers },
] as const;

/**
 * A segment.inUnits set's requests: each case's every repetition, on each
 * answer path, through the operation on a projecting cache of its own,
 * which answers from the lab's cache and gives a miss the path's answers,
 * so nothing is asked or written.
 */
async function segmentInUnitsRequests<I extends z.ZodType, O extends z.ZodType>(
	mode: Mode<I, O>,
	setName: SetName,
	args: EvaluateArgs,
	runtime: LabRuntime,
): Promise<BuiltRequests> {
	const set = await loadSet(args.setsRoot ?? trackedSetsRoot, setName);
	const operation = mode.run(args.units ?? "production");
	const cacheDirectory = join(args.labRoot ?? defaultLabRoot, "cache");
	const counts = () => ({ cached: 0, otherRepetition: 0, projected: 0 });
	const answers: Record<
		(typeof answerPaths)[number]["path"],
		ReturnType<typeof counts>
	> = { "stand-in": counts(), contrary: counts() };
	const cases = await runOn(
		runtime,
		Effect.forEach(
			set.cases,
			(labCase) =>
				Effect.gen(function* () {
					const input = mode.inputSchema.parse(
						mode.caseOf(labCase).input,
					);
					const requests: RecordedRequest[] = [];
					const outcomes: RecordedOutcome[] = [];
					for (const { path, project } of answerPaths)
						for (
							let repetition = 0;
							repetition < repetitions;
							repetition++
						) {
							const jev = new JevCache({
								cacheDirectory,
								...(args.judgmentModel
									? { model: args.judgmentModel }
									: {}),
								offline: true,
								project,
								onRequest: (request) =>
									requests.push({
										executor: "jev",
										path,
										...request,
									}),
							});
							outcomes.push({
								path,
								repetition,
								outcome: yield* outcomeOf(
									operation(input, {
										jev,
										repetition,
										calls: [],
									}),
								),
							});
							const counted = answers[path];
							counted.cached += jev.projection.samples.length;
							for (const request of jev.projection.requests)
								if (request.inputTokens === undefined)
									counted.projected++;
								else counted.otherRepetition++;
						}
					return {
						id: labCase.id,
						requests: sortedRequests(requests),
						outcomes,
					} satisfies CaseRequests;
				}),
			{ concurrency: Math.max(1, args.concurrency ?? 12) },
		),
		args.signal,
	);
	return {
		answers: {
			source: "the lab's cache; a miss gets each answer path's projection",
			...answers,
		},
		cases,
	};
}

/** A segment.inUnits run of `mode` on `setName`: priced, filled when live, then run case by case, on `runtime`. */
async function evaluateSegmentInUnits<I extends z.ZodType, O extends z.ZodType>(
	mode: Mode<I, O>,
	setName: SetName,
	args: EvaluateArgs,
	runtime: LabRuntime,
): Promise<Evaluated> {
	const id = idOf(setName, mode.suffix);
	const labRoot = args.labRoot ?? defaultLabRoot;
	const set = await loadSet(args.setsRoot ?? trackedSetsRoot, setName);
	const units = args.units ?? "production";
	const operation = mode.run(units);
	const chosen = selectCases(set, args.caseIds);
	const cases = chosen.cases.map((labCase) => ({
		labCase,
		...mode.caseOf(labCase),
	}));
	// The cache passes read inputs as the run does, parsed.
	const inputs = cases.map(({ input }) => ({
		input: mode.inputSchema.parse(input),
	}));
	const concurrency = args.concurrency ?? 12;
	const live = !args.offline && !args.estimate;
	if (live && !args.jev)
		throw Error(
			`A live ${id} run needs a jev transport; run it --offline or --estimate`,
		);
	const jevOf = (options: {
		readonly offline: boolean;
		readonly project?: typeof standInAnswers;
	}) =>
		new JevCache({
			cacheDirectory: join(labRoot, "cache"),
			...(args.judgmentModel ? { model: args.judgmentModel } : {}),
			...(args.jev && !options.offline ? { transport: args.jev } : {}),
			...options,
			...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
			...(args.onSpend ? { onSpend: args.onSpend } : {}),
		});
	const identity = { name: set.name, hash: set.hash };
	let projection: PricedProjection | undefined;
	if (args.estimate || !args.offline) {
		const projecting = jevOf({
			offline: true,
			project: standInAnswers,
		});
		await runOn(
			runtime,
			pass(inputs, operation, projecting, concurrency, []),
			args.signal,
		);
		projection = priceProjection(projecting.projection);
		if (args.estimate)
			return { projection, set: identity, ...chosen.named };
		await args.beforeLive?.(projection);
	}
	const jev = jevOf({ offline: args.offline ?? false });
	const filled: CallRecord[] = [];
	if (!args.offline)
		await runOn(
			runtime,
			pass(inputs, operation, jev, concurrency, filled),
			args.signal,
		);
	const calls: CallRecord[] = [];
	const corpus = defineGoldenCorpus({
		route: segmentInUnitsRoute,
		inputSchema: mode.inputSchema,
		outputSchema: mode.outputSchema,
		collections: {
			lab: defineGoldenCaseCollection({
				groups: {
					cases: defineGoldenCaseGroup(
						Object.fromEntries(
							cases.map((entry) => [
								entry.labCase.id,
								{
									input: entry.input,
									idealOutput: entry.idealOutput,
									contaminationKeys: [entry.labCase.record],
								},
							]),
						),
					),
				},
				cases: {},
			}),
		},
	});
	const configuration = {
		model: jev.model,
		settings: {
			units,
			set: set.name,
			setHash: set.hash,
			...chosen.named,
			offline: args.offline ?? false,
			...args.settings,
		},
	};
	const run = await runOperationExperiment({
		experiment: {
			corpus,
			evaluation: corpus.select(chosen.cases.map(({ id }) => id)),
			demonstrations: corpus.select([]),
			run: traced(operation, jev, calls, runtime),
			evaluator: mode.evaluator(
				Object.fromEntries(
					chosen.cases.map((labCase) => [labCase.id, labCase.facts]),
				),
			),
		},
		experimentId: id,
		operationVersion: `${segmentInUnitsRoute}${mode.suffix}@${units}`,
		evaluatorVersion: "segment-in-units-2",
		sourceRevision: args.sourceRevision,
		// jev cuts, groups and routes; nothing else generates.
		configurations: {
			generation: configuration,
			judgment: configuration,
		},
		repetitions,
		...(args.signal ? { signal: args.signal } : {}),
	});
	if (args.outputDirectory) await saveRun(args.outputDirectory, run);
	const ran = spendOf(calls);
	const fill = spendOf(filled);
	return {
		run,
		...(projection ? { projection } : {}),
		spend: {
			jev: {
				...ran.jev,
				freshCalls: ran.jev.freshCalls + fill.jev.freshCalls,
				freshInputTokens:
					ran.jev.freshInputTokens + fill.jev.freshInputTokens,
			},
			luna: ran.luna,
		},
		transport: jev.transport,
		set: identity,
		...chosen.named,
	};
}

export function segmentInUnitsExperiment<
	I extends z.ZodType,
	O extends z.ZodType,
>(mode: Mode<I, O>, setName: SetName): Experiment {
	const id = idOf(setName, mode.suffix);
	return {
		id,
		caseCount: () => currentSetSize(trackedSetsRoot, setName),
		metrics: mode.metrics,
		requests: (args) =>
			onLabRuntime(args.runtime, (runtime) =>
				segmentInUnitsRequests(mode, setName, args, runtime),
			),
		evaluate: (args) =>
			onLabRuntime(args.runtime, (runtime) =>
				evaluateSegmentInUnits(mode, setName, args, runtime),
			),
	};
}
