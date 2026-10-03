/**
 * Runs one Dumgen experiment and prints its manifest, summary and metrics
 * (`docs/reference/segment-in-units-jev-lab.md`, "Evaluate").
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
 *   bun run evaluate --open <runId>
 *
 * A segment.inUnits run counts against the lab's current round: it writes a
 * line to the lab ledger, refuses to go live when dumspec's prompt inputs
 * moved since the round was pinned (unless `--repin`) or when its projected
 * spend would cross the stop line, and stops at the line.
 *
 * A resolve.grammar or resolve.reading run prices itself first and goes
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
import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadRun } from "promptsmith/storage";
import {
	createTypeSafeExecutor,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";
import { defaultRunOutputDirectory } from "../src/development.js";
import {
	defaultLabRoot,
	evaluateExperiment,
	evaluationMetrics,
	listExperiments,
	parityWith,
	productionPolicy,
	spendsJev,
	type UnitConfig,
	unitConfigs,
} from "../src/evaluation/experiments.js";
import { createOpenAILunaBatch } from "../src/evaluation/luna-batch.js";
import type {
	GrammarCaps,
	GrammarPrice,
	LunaBatchEvent,
} from "../src/evaluation/resolve-grammar/models.js";
import type { RoundCost } from "../src/evaluation/resolve-grammar/pricing.js";
import type { Splitter } from "../src/evaluation/split-text.js";
import { createOpenAILuna } from "../src/openai-luna.js";
import { createTypeSafeAsk } from "../src/segment/typesafe-ask.js";
import {
	appendLedger,
	readLedger,
} from "../src/segment-in-units/lab/ledger.js";
import {
	enterRound,
	guardProjectedSpend,
	projectedSpend,
	projectionText,
	roundSpend,
	stopLineOf,
} from "../src/segment-in-units/lab/round.js";
import { loadLabRun } from "../src/segment-in-units/lab/run.js";

const packageRoot = resolve(import.meta.dir, "..");

export async function runEvaluationCli(
	argv: string[],
	dependencies: {
		judge?: TypeSafeExecutor;
		write?: (value: unknown) => void;
		warn?: (message: string) => void;
		split?: Splitter;
		/** The lab's frozen sets and cache. */
		labRoot?: string;
		/** The lab's evidence: the ledger and the round book. */
		evidenceRoot?: string;
		/** Where resolve.grammar's and resolve.reading's ledgers are; `evidence/` by default. */
		resolveEvidenceRoot?: string;
		repository?: string;
	} = {},
) {
	const { values } = parseArgs({
		args: argv,
		options: {
			list: { type: "boolean" },
			experiment: { type: "string" },
			"judgment-model": { type: "string" },
			output: { type: "string" },
			revision: { type: "string" },
			open: { type: "string" },
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
		},
	});
	const write =
		dependencies.write ??
		((value) => console.log(JSON.stringify(value, null, 2)));
	const warn = dependencies.warn ?? ((message) => console.warn(message));
	if (values.list) {
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
	if (!values.experiment)
		throw Error(
			"Use --list, --open RUN_ID, or --experiment ID --revision REVISION",
		);
	if (!values.revision && !values.estimate)
		throw Error("--revision is required to identify the evaluated source");
	const units = (values.units ?? "production") as UnitConfig;
	if (!unitConfigs.includes(units))
		throw Error(`--units must be one of ${unitConfigs.join(", ")}`);
	const labRoot = dependencies.labRoot ?? defaultLabRoot;
	const evidenceRoot =
		dependencies.evidenceRoot ??
		join(packageRoot, "evidence", "segment-in-units-lab");
	const repository = dependencies.repository ?? resolve(packageRoot, "../..");
	const ledgerPath = join(evidenceRoot, "ledger.jsonl");
	const live = !values.offline && !values.estimate;
	const account = spendsJev(values.experiment)
		? await enterRound({
				evidenceRoot,
				repository,
				live,
				repin: values.repin ?? false,
				reason:
					values.reason ?? `evaluate ${values.experiment} --repin`,
			})
		: undefined;
	if (account?.warning) warn(`*** ${account.warning}`);
	const stopLine = account
		? stopLineOf(account.round, values["token-budget"])
		: 0;
	const spent = account
		? roundSpend(await readLedger(ledgerPath), account.round.id)
				.jevFreshInputTokens
		: 0;
	let spentNow = 0;
	// resolve.reading's runs share resolve.grammar's transports and guard.
	const grammar = /^resolve-(grammar|reading)\//u.test(values.experiment);
	const grammarLive = grammar && live;
	const lunaBatch = values["luna-batch"] ?? false;
	const promptCaching = values["luna-prompt-cache"] ?? false;
	// Each batch's id goes to the port's ledger as it is sent and settled.
	const portLedger = join(
		dependencies.resolveEvidenceRoot ?? join(packageRoot, "evidence"),
		values.experiment.split("/")[0] ?? "",
		"ledger.jsonl",
	);
	const experimentId = values.experiment;
	const recordBatch = (event: LunaBatchEvent) =>
		appendFile(
			portLedger,
			`${JSON.stringify({
				at: new Date().toISOString(),
				command: "luna-batch",
				experiment: experimentId,
				...event,
			})}\n`,
		);
	const environment = (name: string) => {
		const value = process.env[name];
		if (!value) throw Error(`${name} is not set`);
		return value;
	};
	const controller = new AbortController();
	const interrupt = () => controller.abort();
	process.once("SIGINT", interrupt);
	try {
		const evaluated = await evaluateExperiment({
			experimentId: values.experiment,
			judge:
				dependencies.judge ??
				((request, options) =>
					createTypeSafeExecutor()(request, options)),
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
			labRoot,
			...(values.concurrency
				? { concurrency: Number(values.concurrency) }
				: {}),
			...(dependencies.split ? { split: dependencies.split } : {}),
			...(values.limit ? { limit: Number(values.limit) } : {}),
			...(values.subset ? { grammarSubset: values.subset } : {}),
			...(values.repetitions
				? { repetitions: Number(values.repetitions) }
				: {}),
			...(grammarLive
				? {
						jev: createTypeSafeAsk({
							apiKey: environment("TYPESAFE_API_KEY"),
						}),
						...(lunaBatch
							? {
									lunaBatch: createOpenAILunaBatch({
										apiKey: environment("OPENAI_API_KEY"),
										promptCaching,
										metadata: { experiment: experimentId },
									}),
									onLunaBatch: recordBatch,
								}
							: {
									luna: createOpenAILuna({
										apiKey: environment("OPENAI_API_KEY"),
										promptCaching,
									}),
								}),
						grammarCaps: guardGrammarBudget(
							undefined,
							values.budget,
							values["luna-budget"],
							values["luna-output-budget"],
							{ usdBudget: values["usd-budget"], lunaBatch },
						),
						beforeGrammarLive(price: GrammarPrice) {
							warn(JSON.stringify({ price }));
							guardGrammarBudget(
								price,
								values.budget,
								values["luna-budget"],
								values["luna-output-budget"],
								{ usdBudget: values["usd-budget"], lunaBatch },
							);
						},
					}
				: {}),
			...(account
				? {
						settings: {
							round: account.round.id,
							pin: account.pin.hash,
							dumspecCommit: account.pin.dumspecCommit,
						},
						beforeLive(priced) {
							warn(projectionText(priced));
							guardProjectedSpend({
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
					}
				: {}),
		});
		if (values.estimate && grammar) {
			const estimate = {
				experiment: values.experiment,
				set: evaluated.set,
				price: evaluated.price,
			};
			write(estimate);
			return estimate;
		}
		if (values.estimate) {
			const projected = evaluated.projection
				? projectedSpend(evaluated.projection)
				: 0;
			const estimate = {
				experiment: values.experiment,
				units,
				set: evaluated.set,
				projection: evaluated.projection,
				projectedTokens: projected,
				...(account
					? {
							round: account.round.id,
							spent,
							stopLine,
							fitsUnderStopLine: spent + projected <= stopLine,
						}
					: {}),
			};
			write(estimate);
			return estimate;
		}
		const { run } = evaluated;
		if (!run) throw Error(`${values.experiment} produced no run`);
		if (account && evaluated.spend && evaluated.set) {
			const git = (...args: string[]) =>
				execFileSync("git", args, {
					cwd: repository,
					encoding: "utf8",
				}).trim();
			await appendLedger(ledgerPath, {
				runId: run.manifest.runId,
				at: new Date().toISOString(),
				command: "evaluate",
				round: account.round.id,
				experiment: values.experiment,
				pin: account.pin.hash,
				options: { units },
				set: evaluated.set.name,
				setHash: evaluated.set.hash,
				cases: run.cases.length,
				repetitions: run.manifest.repetitions ?? 1,
				gitHead: git("rev-parse", "HEAD"),
				dirty:
					git(
						"status",
						"--porcelain",
						"--",
						"battery/dumgen/src",
						"battery/dumgen/cli",
						"battery/dumspec/src",
					).length > 0,
				model: run.manifest.configurations.judgment.model,
				...evaluated.spend,
			});
		}
		const parity = values.parity
			? await parityOf(values.parity, run, units, labRoot)
			: undefined;
		write({
			manifest: run.manifest,
			summary: run.summary,
			metrics: evaluationMetrics(run),
			...(evaluated.spend ? { spend: evaluated.spend } : {}),
			...(evaluated.grammarSpend
				? { spend: evaluated.grammarSpend }
				: {}),
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
	} finally {
		process.removeListener("SIGINT", interrupt);
	}
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
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
