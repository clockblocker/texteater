/**
 * Runs one Dumgen experiment and prints its manifest, summary and metrics
 * (`docs/reference/segmentation-jev-lab.md`, "Evaluate").
 *
 *   bun run evaluate --list
 *   bun run evaluate --experiment segment-in-units/de:dev --revision <rev>
 *       [--offline] [--units production|reference] [--parity <labRunId>[:policy]]
 *   bun run evaluate --experiment segment-in-units/de:heldout:raw --revision <rev>
 *   bun run evaluate --experiment segment-in-units/de:dev:raw --estimate
 *   bun run evaluate --experiment split-text/de:ud-drafts --revision <rev>
 *   bun run evaluate --experiment resolve-grammar/de:dev --estimate
 *   bun run evaluate --experiment resolve-grammar/de:dev --revision <rev>
 *       --budget <jev input tokens> --luna-budget <Luna input tokens>
 *       --luna-output-budget <Luna output tokens> [--limit N]
 *       [--subset evidence/resolve-grammar/round-2-subset.json] [--repetitions 1]
 *   bun run evaluate --experiment resolve-reading/de:dev --estimate [--whole-round]
 *   bun run evaluate --experiment resolve-reading/de:dev --revision <rev>
 *       --budget <jev input tokens> --luna-budget <Luna input tokens>
 *       --luna-output-budget <Luna output tokens> [--limit N]
 *       [--luna-batch] [--luna-prompt-cache] [--usd-budget <dollars>]
 *       [--subset evidence/resolve-reading/round-2-subset.json] [--repetitions 1]
 *   bun run evaluate --experiment knowledge/de:dev --estimate [--whole-round]
 *       [--gold-only] [--subset evidence/knowledge/round-2-subset.json]
 *   bun run evaluate --experiment knowledge/de:spot-check --revision <rev>
 *       --budget <jev input tokens> --luna-budget <Luna input tokens>
 *       --luna-output-budget <Luna output tokens> [--luna-batch]
 *       [--usd-budget <dollars>] [--limit N] [--repetitions 1]
 *   bun run evaluate --experiment segment-in-units/de:dev --revision <rev>
 *       --requests [--units production|reference]
 *   bun run evaluate --experiment resolve-grammar/de:dev --revision <rev> --requests
 *   bun run evaluate --experiment resolve-reading/de:dev --revision <rev> --requests
 *   bun run evaluate --experiment knowledge/de:dev --revision <rev> --requests
 *   bun run evaluate --open <runId>
 *   bun run evaluate --compare <leftRunId> <rightRunId>
 *
 * `--compare` reads two saved runs the way `--open` does and prints, through
 * promptsmith's `compareRuns`, each side's verdict counts, the cases only one
 * side has, and every case whose status, verdict or output changed with its
 * field-level output diff. It asks no model.
 *
 * `--requests` is the free no-change check (#1035, `request-diff.ts`): it
 * builds every case's requests to jev and Luna offline, with each
 * repetition's outcome, and saves them as a request run under
 * `<output>/requests/`. It asks nothing, writes no ledger line and needs no
 * pin. Run it before and after a change and `--compare` the two request
 * runs: the report lists every case whose requests or outcomes differ, and
 * the command exits 1 when any does. To compare two commits, run it in a
 * checkout of each.
 *
 * A segment.inUnits run counts against the lab's current round: it writes a
 * line to the lab ledger, refuses to go live when dumcorpus's prompt inputs
 * moved since the round was pinned (unless `--repin`) or when its projected
 * spend would cross the stop line, and stops at the line. It runs
 * production's `createDumgen` with the lab's cached jev as its transport,
 * which retries a rate limit or a server error; the ledger line and the
 * output give those retries and the requests that still failed as
 * `transport`.
 *
 * A resolve.grammar, resolve.reading or knowledge run prices itself first and goes
 * live only under the budgets the main session granted the round:
 * `--budget` for fresh jev input tokens, `--luna-budget` for Luna's input
 * tokens and `--luna-output-budget` for its output tokens, and
 * `--usd-budget` for dollars when given. The same caps stop it while it
 * runs. Its answers are cached, so `--offline` re-scores it for free. Its
 * price states the dollars synchronously and with Luna batched, priced
 * from measured sizes wherever they exist; `--estimate --whole-round`
 * prices every request, cached ones included, as a round whose prompts
 * all moved would pay.
 *
 * `--luna-batch` sends such a run's Luna cache misses through OpenAI's
 * Batch API in stages (#891), its guard and caps pricing them at the Batch
 * rate; each batch's id goes to the port's ledger
 * (`evidence/resolve-*\/ledger.jsonl`) as it is sent and as it settles.
 * `--luna-prompt-cache` asks Luna for explicit prompt caching. Production
 * clicks stay synchronous.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { type ParseArgsOptionsConfig, parseArgs } from "node:util";
import { messageOf } from "common-utils";
import { compareRuns, loadRun } from "promptsmith/storage";
import type * as Experiments from "../lab/evaluation/experiments.js";
import type {
	EvaluateArgs,
	parityWith,
	UnitConfig,
} from "../lab/evaluation/experiments.js";
import {
	compareRequestRuns,
	isRequestRun,
	loadRequestRun,
	newRequestRunId,
	type RequestRun,
	saveRequestRun,
} from "../lab/evaluation/request-diff.js";
import type {
	GrammarCaps,
	GrammarPrice,
	LunaBatchEvent,
} from "../lab/evaluation/resolve-grammar/models.js";
import type { RoundCost } from "../lab/evaluation/resolve-grammar/pricing.js";
import type { Splitter } from "../lab/evaluation/split-text.js";
import { defaultRunOutputDirectory } from "../lab/run-directory.js";
import type { JevAsk } from "../src/segment/jev.js";

const packageRoot = resolve(import.meta.dir, "..");

const cliOptions = {
	list: { type: "boolean" },
	experiment: { type: "string" },
	"judgment-model": { type: "string" },
	output: { type: "string" },
	revision: { type: "string" },
	open: { type: "string" },
	compare: { type: "string" },
	offline: { type: "boolean" },
	units: { type: "string" },
	parity: { type: "string" },
	estimate: { type: "boolean" },
	repin: { type: "boolean" },
	reason: { type: "string" },
	"token-budget": { type: "string" },
	concurrency: { type: "string" },
	budget: { type: "string" },
	"luna-budget": { type: "string" },
	"luna-output-budget": { type: "string" },
	limit: { type: "string" },
	subset: { type: "string" },
	repetitions: { type: "string" },
	"luna-batch": { type: "boolean" },
	"luna-prompt-cache": { type: "boolean" },
	"usd-budget": { type: "string" },
	"whole-round": { type: "boolean" },
	"gold-only": { type: "boolean" },
	requests: { type: "boolean" },
} as const satisfies ParseArgsOptionsConfig;

const parseCli = (argv: string[]) =>
	parseArgs({ args: argv, allowPositionals: true, options: cliOptions });

type CliValues = ReturnType<typeof parseCli>["values"];

type EvaluationCliDependencies = {
	/** jev for a live run; production's TypeSafe ask by default. */
	jev?: JevAsk;
	write?: (value: unknown) => void;
	warn?: (message: string) => void;
	split?: Splitter;
	/** The lab's answer cache and raw runs. */
	labRoot?: string;
	/** The lab's frozen sets; the tracked ones by default. */
	setsRoot?: string;
	/** The lab's evidence: the ledger and the round book. */
	evidenceRoot?: string;
	/** Where resolve.grammar's and resolve.reading's ledgers are; `evidence/` by default. */
	resolveEvidenceRoot?: string;
	repository?: string;
};

export async function runEvaluationCli(
	argv: string[],
	dependencies: EvaluationCliDependencies = {},
) {
	const { values, positionals } = parseCli(argv);
	const write =
		dependencies.write ??
		((value) => console.log(JSON.stringify(value, null, 2)));
	const warn = dependencies.warn ?? ((message) => console.warn(message));
	if (positionals.length > 0 && !values.compare)
		throw Error(`Unexpected argument ${positionals[0]}`);
	if (values.list) {
		const { listExperiments } = await import(
			"../lab/evaluation/experiments.js"
		);
		const experiments = listExperiments();
		write(experiments);
		return experiments;
	}
	const outputDirectory =
		values.output ??
		process.env.DUMGEN_RUN_DIRECTORY ??
		defaultRunOutputDirectory;
	if (values.open) {
		const run = await loadRun(outputDirectory, values.open);
		write(run);
		return run;
	}
	if (values.compare)
		return compareCommand(
			outputDirectory,
			values.compare,
			positionals,
			write,
		);
	const experimentId = values.experiment;
	if (!experimentId)
		throw Error(
			"Use --list, --open RUN_ID, --compare LEFT RIGHT, or --experiment ID --revision REVISION",
		);
	if (!values.revision && !values.estimate)
		throw Error("--revision is required to identify the evaluated source");
	// Only a run loads the experiment table, the transports and the lab
	// harness, and through them Dumgen's src. `--compare` and `--open` read
	// saved runs alone, so a half-edited src file in a shared tree can't
	// break them; `--list` loads the table but no transport (#1088).
	const experiments = await import("../lab/evaluation/experiments.js");
	const units = experiments.unitConfigs.find(
		(config) => config === (values.units ?? "production"),
	);
	if (!units)
		throw Error(
			`--units must be one of ${experiments.unitConfigs.join(", ")}`,
		);
	const command: ExperimentCommand = {
		values,
		experimentId,
		units,
		outputDirectory,
		dependencies,
		write,
		warn,
		experiments,
	};
	return values.requests
		? requestsCommand(command)
		: experimentCommand(command);
}

/**
 * `--compare`: two request runs as a request diff, which exits 1 on any
 * difference, or two evaluation runs through `runComparison`.
 */
async function compareCommand(
	outputDirectory: string,
	left: string,
	positionals: readonly string[],
	write: (value: unknown) => void,
) {
	const [right, ...rest] = positionals;
	if (!right || rest.length > 0)
		throw Error("--compare takes two run ids: --compare LEFT RIGHT");
	const requestRuns = [left, right].filter((runId) =>
		isRequestRun(outputDirectory, runId),
	).length;
	if (requestRuns === 1)
		throw Error(
			"--compare takes two request runs or two evaluation runs, not one of each",
		);
	if (requestRuns === 2) {
		const report = compareRequestRuns(
			await loadRequestRun(outputDirectory, left),
			await loadRequestRun(outputDirectory, right),
		);
		write(report);
		if (
			report.changed.length > 0 ||
			report.onlyLeft.length > 0 ||
			report.onlyRight.length > 0
		)
			process.exitCode = 1;
		return report;
	}
	const report = runComparison(
		await loadRun(outputDirectory, left),
		await loadRun(outputDirectory, right),
	);
	write(report);
	return report;
}

/** An `--experiment` command, once its arguments and the table are loaded. */
type ExperimentCommand = {
	readonly values: CliValues;
	readonly experimentId: string;
	readonly units: UnitConfig;
	readonly outputDirectory: string;
	readonly dependencies: EvaluationCliDependencies;
	readonly write: (value: unknown) => void;
	readonly warn: (message: string) => void;
	readonly experiments: typeof Experiments;
};

/** `--requests`: every case's requests built offline, saved as a request run. */
async function requestsCommand({
	values,
	experimentId,
	units,
	outputDirectory,
	dependencies,
	write,
	experiments,
}: ExperimentCommand) {
	const built = await experiments.experimentRequests({
		experimentId,
		sourceRevision: values.revision ?? "",
		units,
		...(dependencies.labRoot ? { labRoot: dependencies.labRoot } : {}),
		...(dependencies.setsRoot ? { setsRoot: dependencies.setsRoot } : {}),
		...(values["judgment-model"]
			? { judgmentModel: values["judgment-model"] }
			: {}),
		...(values.concurrency
			? { concurrency: Number(values.concurrency) }
			: {}),
	});
	const run: RequestRun = {
		runId: newRequestRunId(),
		experimentId,
		sourceRevision: values.revision ?? "",
		createdAt: new Date().toISOString(),
		...built,
	};
	const path = await saveRequestRun(outputDirectory, run);
	const summary = {
		runId: run.runId,
		experimentId: run.experimentId,
		path,
		cases: run.cases.length,
		requests: run.cases.reduce(
			(total, entry) => total + entry.requests.length,
			0,
		),
		answers: run.answers,
	};
	write(summary);
	return summary;
}

/** The transports and the lab harness a run loads, in the order it loads them. */
async function loadRunModules() {
	const { createOpenAILunaBatch } = await import(
		"../lab/evaluation/luna-batch.js"
	);
	const { git } = await import("../lab/git.js");
	const { transportText } = await import(
		"../lab/segmentation/harness/jev-cache.js"
	);
	const { appendLedger, readLedger } = await import(
		"../lab/segmentation/harness/ledger.js"
	);
	const round = await import("../lab/segmentation/harness/round.js");
	const { createOpenAILuna } = await import("../src/openai-luna.js");
	const { createTypeSafeAsk } = await import(
		"../src/segment/typesafe-ask.js"
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
	values: CliValues,
	dependencies: EvaluationCliDependencies,
) => ({
	...(dependencies.setsRoot ? { setsRoot: dependencies.setsRoot } : {}),
	...(values.concurrency ? { concurrency: Number(values.concurrency) } : {}),
	...(dependencies.split ? { split: dependencies.split } : {}),
	...(values.limit ? { limit: Number(values.limit) } : {}),
	...(values.subset ? { grammarSubset: values.subset } : {}),
	...(values["gold-only"] ? { goldOnly: true } : {}),
	...(values.repetitions ? { repetitions: Number(values.repetitions) } : {}),
});

/** An `--experiment` run: priced with `--estimate`, re-scored `--offline`, or live. */
async function experimentCommand(command: ExperimentCommand) {
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
			units,
			labRoot: place.labRoot,
			...argumentOptions(values, dependencies),
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

type StoredRun = Awaited<ReturnType<typeof loadRun>>;
const verdicts = ["Passed", "Failed", "Mixed", "Unscored"] as const;

/**
 * Two runs side by side (`--compare`): what each ran and scored, the cases
 * only one has, and each shared case whose status, verdict or output
 * changed, as `before → after` with the output's field-level diff.
 */
export function runComparison(left: StoredRun, right: StoredRun) {
	const comparison = compareRuns(left, right);
	const side = (run: StoredRun, key: "left" | "right") => ({
		runId: run.manifest.runId,
		experimentId: run.manifest.experimentId,
		sourceRevision: run.manifest.sourceRevision,
		model: run.manifest.configurations.judgment.model,
		cases: run.cases.length,
		verdicts: Object.fromEntries(
			verdicts.map((verdict) => [
				verdict,
				comparison.cases.filter(
					(entry) => entry.verdict[key] === verdict,
				).length,
			]),
		),
	});
	const arrow = (before: unknown, after: unknown) => `${before} → ${after}`;
	const changed = comparison.cases.flatMap((entry) => {
		if (!entry.left || !entry.right) return [];
		const status = entry.left.status !== entry.right.status;
		if (!status && !entry.verdictChanged && !entry.outputChanges.length)
			return [];
		return [
			{
				caseId: entry.caseId,
				...(status
					? { status: arrow(entry.left.status, entry.right.status) }
					: {}),
				verdict: entry.verdictChanged
					? arrow(entry.verdict.left, entry.verdict.right)
					: entry.verdict.left,
				outputChanges: entry.outputChanges,
			},
		];
	});
	return {
		left: side(left, "left"),
		right: side(right, "right"),
		sameExperiment: comparison.sameExperiment,
		sameCorpus: comparison.sameCorpus,
		unchanged:
			comparison.cases.length -
			changed.length -
			comparison.onlyLeft.length -
			comparison.onlyRight.length,
		onlyLeft: comparison.onlyLeft,
		onlyRight: comparison.onlyRight,
		changed,
	};
}

/**
 * The caps a live resolve.grammar run was granted, refusing a run with no
 * granted budget or whose price exceeds it: fresh jev input tokens against
 * `--budget`, Luna's input against `--luna-budget` and its output against
 * `--luna-output-budget`, and, when `--usd-budget` is given, the price in
 * dollars at the rate Luna's transport pays: the Batch rate with
 * `--luna-batch`, the configuration's tier otherwise.
 */
export function guardGrammarBudget(
	price:
		| {
				readonly jev: { readonly inputTokens: number };
				readonly luna: {
					readonly inputTokens: number;
					readonly outputTokens: number;
				};
				readonly cost: RoundCost;
		  }
		| undefined,
	jevBudget: string | undefined,
	lunaBudget: string | undefined,
	lunaOutputBudget: string | undefined,
	options: {
		readonly usdBudget?: string | undefined;
		readonly lunaBatch?: boolean;
	} = {},
): GrammarCaps {
	const usd =
		options.usdBudget === undefined ? undefined : Number(options.usdBudget);
	if (usd !== undefined && !Number.isFinite(usd))
		throw Error("--usd-budget is a number of dollars. Nothing was asked.");
	const caps = {
		jevInputTokens: Number(jevBudget),
		lunaInputTokens: Number(lunaBudget),
		lunaOutputTokens: Number(lunaOutputBudget),
	};
	if (
		!jevBudget ||
		!lunaBudget ||
		!lunaOutputBudget ||
		!Object.values(caps).every(Number.isFinite)
	)
		throw Error(
			"A live resolve.grammar or resolve.reading run needs --budget (jev input tokens), --luna-budget (Luna input tokens) and --luna-output-budget (Luna output tokens); price it with --estimate first. Nothing was asked.",
		);
	if (
		price &&
		(price.jev.inputTokens > caps.jevInputTokens ||
			price.luna.inputTokens > caps.lunaInputTokens ||
			price.luna.outputTokens > caps.lunaOutputTokens)
	)
		throw Error(
			`This run projects ${price.jev.inputTokens} jev input tokens and ${price.luna.inputTokens} in / ${price.luna.outputTokens} out Luna tokens, past the budgets of ${caps.jevInputTokens}, ${caps.lunaInputTokens} and ${caps.lunaOutputTokens}. Nothing was asked.`,
		);
	const projected = options.lunaBatch
		? price?.cost.totalBatchUsd
		: price?.cost.totalSyncUsd;
	if (usd !== undefined && projected !== undefined && projected > usd)
		throw Error(
			`This run projects $${projected} with Luna ${options.lunaBatch ? "batched" : `synchronous (${price?.cost.luna.syncTier})`}, past the budget of $${usd}. Nothing was asked.`,
		);
	return usd === undefined ? caps : { ...caps, usd };
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
		"../lab/evaluation/experiments.js"
	);
	const { loadLabRun } = await import("../lab/segmentation/harness/run.js");
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

if (import.meta.main)
	runEvaluationCli(process.argv.slice(2)).catch((error) => {
		console.error(messageOf(error));
		process.exitCode = 1;
	});
