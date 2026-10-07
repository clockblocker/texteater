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
import { parseArgs } from "node:util";
import { messageOf } from "common-utils";
import { compareRuns, loadRun } from "promptsmith/storage";
import {
	defaultLabRoot,
	evaluateExperiment,
	evaluationMetrics,
	experimentRequests,
	listExperiments,
	parityWith,
	productionPolicy,
	spendsJev,
	type UnitConfig,
	unitConfigs,
} from "../lab/evaluation/experiments.js";
import { createOpenAILunaBatch } from "../lab/evaluation/luna-batch.js";
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
import { git } from "../lab/git.js";
import { defaultRunOutputDirectory } from "../lab/run-directory.js";
import { transportText } from "../lab/segmentation/harness/jev-cache.js";
import {
	appendLedger,
	readLedger,
} from "../lab/segmentation/harness/ledger.js";
import {
	enterRound,
	guardProjectedSpend,
	projectedSpend,
	projectionText,
	roundSpend,
	stopLineOf,
} from "../lab/segmentation/harness/round.js";
import { loadLabRun } from "../lab/segmentation/harness/run.js";
import { createOpenAILuna } from "../src/openai-luna.js";
import type { JevAsk } from "../src/segment/jev.js";
import { createTypeSafeAsk } from "../src/segment/typesafe-ask.js";

const packageRoot = resolve(import.meta.dir, "..");

export async function runEvaluationCli(
	argv: string[],
	dependencies: {
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
	} = {},
) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
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
		},
	});
	const write =
		dependencies.write ??
		((value) => console.log(JSON.stringify(value, null, 2)));
	const warn = dependencies.warn ?? ((message) => console.warn(message));
	if (positionals.length > 0 && !values.compare)
		throw Error(`Unexpected argument ${positionals[0]}`);
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
	if (values.compare) {
		const [right, ...rest] = positionals;
		if (!right || rest.length > 0)
			throw Error("--compare takes two run ids: --compare LEFT RIGHT");
		const requestRuns = [values.compare, right].filter((runId) =>
			isRequestRun(outputDirectory, runId),
		).length;
		if (requestRuns === 1)
			throw Error(
				"--compare takes two request runs or two evaluation runs, not one of each",
			);
		if (requestRuns === 2) {
			const report = compareRequestRuns(
				await loadRequestRun(outputDirectory, values.compare),
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
			await loadRun(outputDirectory, values.compare),
			await loadRun(outputDirectory, right),
		);
		write(report);
		return report;
	}
	if (!values.experiment)
		throw Error(
			"Use --list, --open RUN_ID, --compare LEFT RIGHT, or --experiment ID --revision REVISION",
		);
	if (!values.revision && !values.estimate)
		throw Error("--revision is required to identify the evaluated source");
	const units = (values.units ?? "production") as UnitConfig;
	if (!unitConfigs.includes(units))
		throw Error(`--units must be one of ${unitConfigs.join(", ")}`);
	if (values.requests) {
		const built = await experimentRequests({
			experimentId: values.experiment,
			sourceRevision: values.revision ?? "",
			units,
			...(dependencies.labRoot ? { labRoot: dependencies.labRoot } : {}),
			...(dependencies.setsRoot
				? { setsRoot: dependencies.setsRoot }
				: {}),
			...(values["judgment-model"]
				? { judgmentModel: values["judgment-model"] }
				: {}),
			...(values.concurrency
				? { concurrency: Number(values.concurrency) }
				: {}),
		});
		const run: RequestRun = {
			runId: newRequestRunId(),
			experimentId: values.experiment,
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
	// resolve.reading's and knowledge.produce's runs share resolve.grammar's
	// transports and guard.
	const grammar = /^(resolve-(grammar|reading)|knowledge)\//u.test(
		values.experiment,
	);
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
			// Every live run that asks jev asks it through production's
			// TypeSafe ask; segment.inUnits wraps it in the lab's cache.
			...(live && (grammar || account)
				? {
						jev:
							dependencies.jev ??
							createTypeSafeAsk({
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
			labRoot,
			...(dependencies.setsRoot
				? { setsRoot: dependencies.setsRoot }
				: {}),
			...(values.concurrency
				? { concurrency: Number(values.concurrency) }
				: {}),
			...(dependencies.split ? { split: dependencies.split } : {}),
			...(values.limit ? { limit: Number(values.limit) } : {}),
			...(values.subset ? { grammarSubset: values.subset } : {}),
			...(values["gold-only"] ? { goldOnly: true } : {}),
			...(values.repetitions
				? { repetitions: Number(values.repetitions) }
				: {}),
			...(grammarLive
				? {
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
							dumcorpusCommit: account.pin.dumcorpusCommit,
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
				gitHead: git(["rev-parse", "HEAD"], repository),
				dirty:
					git(
						[
							"status",
							"--porcelain",
							"--",
							"battery/dumgen/src",
							"battery/dumgen/cli",
							"battery/dumcorpus/src",
						],
						repository,
					).length > 0,
				model: run.manifest.configurations.judgment.model,
				...evaluated.spend,
				...(evaluated.transport
					? { transport: evaluated.transport }
					: {}),
			});
		}
		if (evaluated.transport && evaluated.transport.requests > 0)
			warn(transportText(evaluated.transport));
		const parity = values.parity
			? await parityOf(values.parity, run, units, labRoot)
			: undefined;
		write({
			manifest: run.manifest,
			summary: run.summary,
			metrics: evaluationMetrics(run),
			...(evaluated.spend ? { spend: evaluated.spend } : {}),
			...(evaluated.transport ? { transport: evaluated.transport } : {}),
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
		model:
			"configurations" in run.manifest
				? run.manifest.configurations.judgment.model
				: run.manifest.configuration.model,
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
