/**
 * An `--experiment` run of the evaluate CLI (`cli/evaluate.ts`): the
 * transports and lab harness it loads, its round or its granted budgets,
 * and its estimate, or its record and report.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type * as Experiments from "../../lab/evaluation/experiments.js";
import type {
	EvaluateArgs,
	parityWith,
	UnitConfig,
} from "../../lab/evaluation/experiments.js";
import type {
	GrammarPrice,
	LunaBatchEvent,
} from "../../lab/evaluation/resolve-grammar/models.js";
import type {
	EvaluationCliDependencies,
	ExperimentCommand,
} from "./arguments.js";
import { guardGrammarBudget } from "./grammar-budget.js";

const packageRoot = resolve(import.meta.dir, "../..");

/** The transports and the lab harness a run loads, in the order it loads them. */
async function loadRunModules() {
	const { createOpenAILunaBatch } = await import(
		"../../lab/evaluation/luna-batch.js"
	);
	const { git } = await import("../../lab/git.js");
	const { transportText } = await import(
		"../../lab/segmentation/harness/jev-cache.js"
	);
	const { appendLedger, readLedger } = await import(
		"../../lab/segmentation/harness/ledger.js"
	);
	const round = await import("../../lab/segmentation/harness/round.js");
	const { createOpenAILuna } = await import("../../src/openai-luna.js");
	const { createTypeSafeAsk } = await import(
		"../../src/segment/typesafe-ask.js"
	);
	return {
		createOpenAILunaBatch,
		git,
		transportText,
		appendLedger,
		readLedger,
		round,
		createOpenAILuna,
		createTypeSafeAsk,
	};
}

type RunModules = Awaited<ReturnType<typeof loadRunModules>>;

const environment = (name: string) => {
	const value = process.env[name];
	if (!value) throw Error(`${name} is not set`);
	return value;
};

/** Where a run's paths are, and whether it may ask anything. */
type RunPlace = {
	readonly labRoot: string;
	readonly evidenceRoot: string;
	readonly repository: string;
	readonly ledgerPath: string;
	readonly live: boolean;
};

/** A segment.inUnits run's round, its stop line and what it already spent. */
type RoundAccount = {
	readonly account: Awaited<ReturnType<RunModules["round"]["enterRound"]>>;
	readonly stopLine: number;
	readonly spent: number;
};

async function roundAccountOf(
	{ values, experimentId, warn }: ExperimentCommand,
	place: RunPlace,
	modules: RunModules,
): Promise<RoundAccount> {
	const account = await modules.round.enterRound({
		evidenceRoot: place.evidenceRoot,
		repository: place.repository,
		live: place.live,
		repin: values.repin ?? false,
		reason: values.reason ?? `evaluate ${experimentId} --repin`,
	});
	if (account.warning) warn(`*** ${account.warning}`);
	const stopLine = modules.round.stopLineOf(
		account.round,
		values["token-budget"],
	);
	const spent = modules.round.roundSpend(
		await modules.readLedger(place.ledgerPath),
		account.round.id,
	).jevFreshInputTokens;
	return { account, stopLine, spent };
}

/**
 * A live resolve.grammar, resolve.reading or knowledge run's Luna
 * transport, its granted caps, and the price check before it goes live.
 */
function grammarLiveOptions(
	{ values, experimentId, dependencies, warn }: ExperimentCommand,
	modules: RunModules,
): Partial<EvaluateArgs> {
	const lunaBatch = values["luna-batch"] ?? false;
	const promptCaching = values["luna-prompt-cache"] ?? false;
	// Each batch's id goes to the port's ledger as it is sent and settled.
	const portLedger = join(
		dependencies.resolveEvidenceRoot ?? join(packageRoot, "evidence"),
		experimentId.split("/")[0] ?? "",
		"ledger.jsonl",
	);
	// A port's first batch creates its ledger (knowledge has none yet).
	const recordBatch = async (event: LunaBatchEvent) => {
		await mkdir(dirname(portLedger), { recursive: true });
		await appendFile(
			portLedger,
			`${JSON.stringify({
				at: new Date().toISOString(),
				command: "luna-batch",
				experiment: experimentId,
				...event,
			})}\n`,
		);
	};
	const guard = (price: GrammarPrice | undefined) =>
		guardGrammarBudget(
			price,
			values.budget,
			values["luna-budget"],
			values["luna-output-budget"],
			{ usdBudget: values["usd-budget"], lunaBatch },
		);
	return {
		...(lunaBatch
			? {
					lunaBatch: modules.createOpenAILunaBatch({
						apiKey: environment("OPENAI_API_KEY"),
						promptCaching,
						metadata: { experiment: experimentId },
					}),
					onLunaBatch: recordBatch,
				}
			: {
					luna: modules.createOpenAILuna({
						apiKey: environment("OPENAI_API_KEY"),
						promptCaching,
					}),
				}),
		grammarCaps: guard(undefined),
		beforeGrammarLive(price: GrammarPrice) {
			warn(JSON.stringify({ price }));
			guard(price);
		},
	};
}

/**
 * A segment.inUnits run's round in its manifest, and the guards that
 * refuse it past the round's stop line, before it goes live and as it
 * spends.
 */
function roundOptions(
	{ account, stopLine, spent }: RoundAccount,
	warn: (message: string) => void,
	round: RunModules["round"],
): Partial<EvaluateArgs> {
	let spentNow = 0;
	return {
		settings: {
			round: account.round.id,
			pin: account.pin.hash,
			dumcorpusCommit: account.pin.dumcorpusCommit,
		},
		beforeLive(priced) {
			warn(round.projectionText(priced));
			round.guardProjectedSpend({
				round: account.round,
				spent,
				stopLine,
				priced,
			});
		},
		beforeSpend() {
			if (spent + spentNow >= stopLine)
				throw Error(
					`Round ${account.round.id} reached its stop line: ${spent + spentNow} of ${stopLine} fresh jev input tokens`,
				);
		},
		onSpend(tokens) {
			spentNow += tokens;
		},
	};
}

/** The options a run takes from its arguments alone. */
const argumentOptions = (
	{ values, caseIds }: ExperimentCommand,
	dependencies: EvaluationCliDependencies,
) => ({
	...(dependencies.setsRoot ? { setsRoot: dependencies.setsRoot } : {}),
	...(caseIds ? { caseIds } : {}),
	...(values.concurrency ? { concurrency: Number(values.concurrency) } : {}),
	...(dependencies.split ? { split: dependencies.split } : {}),
	...(values.limit ? { limit: Number(values.limit) } : {}),
	...(values.subset ? { grammarSubset: values.subset } : {}),
	...(values["gold-only"] ? { goldOnly: true } : {}),
	...(values.repetitions ? { repetitions: Number(values.repetitions) } : {}),
});

/** An `--experiment` run: priced with `--estimate`, re-scored `--offline`, or live. */
export async function experimentCommand(command: ExperimentCommand) {
	const { values, experimentId, units, outputDirectory, dependencies, warn } =
		command;
	const { defaultLabRoot, evaluateExperiment, spendsJev } =
		command.experiments;
	const modules = await loadRunModules();
	const evidenceRoot =
		dependencies.evidenceRoot ??
		join(packageRoot, "evidence", "segment-in-units-lab");
	const place: RunPlace = {
		labRoot: dependencies.labRoot ?? defaultLabRoot,
		evidenceRoot,
		repository: dependencies.repository ?? resolve(packageRoot, "../.."),
		ledgerPath: join(evidenceRoot, "ledger.jsonl"),
		live: !values.offline && !values.estimate,
	};
	const round = spendsJev(experimentId)
		? await roundAccountOf(command, place, modules)
		: undefined;
	// resolve.reading's and knowledge.produce's runs share resolve.grammar's
	// transports and guard.
	const grammar = /^(resolve-(grammar|reading)|knowledge)\//u.test(
		experimentId,
	);
	const controller = new AbortController();
	const interrupt = () => controller.abort();
	process.once("SIGINT", interrupt);
	try {
		const evaluated = await evaluateExperiment({
			experimentId,
			// Every live run that asks jev asks it through production's
			// TypeSafe ask; segment.inUnits wraps it in the lab's cache.
			...(place.live && (grammar || round)
				? {
						jev:
							dependencies.jev ??
							modules.createTypeSafeAsk({
								apiKey: environment("TYPESAFE_API_KEY"),
							}),
					}
				: {}),
			...(values["judgment-model"]
				? { judgmentModel: values["judgment-model"] }
				: {}),
			offline: values.offline ?? false,
			estimate: values.estimate ?? false,
			...(values["whole-round"] ? { wholeRound: true } : {}),
			sourceRevision: values.revision ?? "estimate",
			outputDirectory,
			signal: controller.signal,
			runtime: command.runtime,
			units,
			labRoot: place.labRoot,
			...argumentOptions(command, dependencies),
			...(grammar && place.live
				? grammarLiveOptions(command, modules)
				: {}),
			...(round ? roundOptions(round, warn, modules.round) : {}),
		});
		if (values.estimate)
			return writeEstimate(command, evaluated, grammar, round, modules);
		return await finishRun(command, evaluated, place, round, modules);
	} finally {
		process.removeListener("SIGINT", interrupt);
	}
}

type Evaluated = Awaited<
	ReturnType<(typeof Experiments)["evaluateExperiment"]>
>;

/** `--estimate`'s price: resolve's in dollars and tokens, segment.inUnits's against its round. */
function writeEstimate(
	{ experimentId, units, write }: ExperimentCommand,
	evaluated: Evaluated,
	grammar: boolean,
	round: RoundAccount | undefined,
	modules: RunModules,
) {
	if (grammar) {
		const estimate = {
			experiment: experimentId,
			set: evaluated.set,
			price: evaluated.price,
		};
		write(estimate);
		return estimate;
	}
	const projected = evaluated.projection
		? modules.round.projectedSpend(evaluated.projection)
		: 0;
	const estimate = {
		experiment: experimentId,
		units,
		set: evaluated.set,
		...(evaluated.caseList
			? {
					caseList: evaluated.caseList.hash,
					cases: evaluated.caseList.ids.length,
				}
			: {}),
		projection: evaluated.projection,
		projectedTokens: projected,
		...(round
			? {
					round: round.account.round.id,
					spent: round.spent,
					stopLine: round.stopLine,
					fitsUnderStopLine:
						round.spent + projected <= round.stopLine,
				}
			: {}),
	};
	write(estimate);
	return estimate;
}

/**
 * A run's record and report: its ledger line when it counts against a
 * round, its transport, its manifest, summary and metrics, and `--parity`,
 * which exits 1 on any difference.
 */
async function finishRun(
	command: ExperimentCommand,
	evaluated: Evaluated,
	place: RunPlace,
	round: RoundAccount | undefined,
	modules: RunModules,
) {
	const { values, experimentId, units, write, warn } = command;
	const { run } = evaluated;
	if (!run) throw Error(`${experimentId} produced no run`);
	if (round && evaluated.spend && evaluated.set)
		await modules.appendLedger(place.ledgerPath, {
			runId: run.manifest.runId,
			at: new Date().toISOString(),
			command: "evaluate",
			round: round.account.round.id,
			experiment: experimentId,
			pin: round.account.pin.hash,
			options: { units },
			set: evaluated.set.name,
			setHash: evaluated.set.hash,
			...(evaluated.caseList
				? { caseList: evaluated.caseList.hash }
				: {}),
			cases: run.cases.length,
			repetitions: run.manifest.repetitions ?? 1,
			gitHead: modules.git(["rev-parse", "HEAD"], place.repository),
			dirty:
				modules.git(
					[
						"status",
						"--porcelain",
						"--",
						"battery/dumgen/src",
						"battery/dumgen/cli",
						"battery/dumcorpus/src",
					],
					place.repository,
				).length > 0,
			model: run.manifest.configurations.judgment.model,
			...evaluated.spend,
			...(evaluated.transport ? { transport: evaluated.transport } : {}),
		});
	if (evaluated.transport && evaluated.transport.requests > 0)
		warn(modules.transportText(evaluated.transport));
	const parity = values.parity
		? await parityOf(values.parity, run, units, place.labRoot)
		: undefined;
	write({
		manifest: run.manifest,
		summary: run.summary,
		metrics: command.experiments.evaluationMetrics(run),
		...(evaluated.spend ? { spend: evaluated.spend } : {}),
		...(evaluated.transport ? { transport: evaluated.transport } : {}),
		...(evaluated.grammarSpend ? { spend: evaluated.grammarSpend } : {}),
		...(parity ? { parity } : {}),
	});
	if (
		parity &&
		(parity.differing.length > 0 ||
			parity.failed.length > 0 ||
			parity.missing.length > 0)
	)
		process.exitCode = 1;
	return run;
}

/**
 * Gold mode against a lab run (`--parity <runId>[:policy]`): production's
 * unit stage must give candidates4's maxim+closed outputs, the reference
 * the lab run's primary.
 */
async function parityOf(
	value: string,
	run: Parameters<typeof parityWith>[0],
	units: UnitConfig,
	labRoot: string,
) {
	if (run.manifest.experimentId.endsWith(":raw"))
		throw Error("--parity compares gold mode with a lab run");
	const { parityWith, productionPolicy } = await import(
		"../../lab/evaluation/experiments.js"
	);
	const { loadLabRun } = await import(
		"../../lab/segmentation/harness/run.js"
	);
	const [labRunId = "", named] = value.split(":");
	const labRun = await loadLabRun(labRoot, labRunId);
	const policy =
		named ??
		(units === "production"
			? productionPolicy
			: labRun.cases[0]?.repetitions[0]?.primary);
	if (!policy) throw Error(`--parity ${value} names no policy`);
	return { labRun: labRunId, policy, ...parityWith(run, labRun, policy) };
}
