/**
 * Runs one Dumgen experiment and prints its manifest, summary and metrics
 * (`docs/reference/segmentation-jev-lab-evaluate.md`).
 *
 *   bun run evaluate --list
 *   bun run evaluate --experiment segment-in-units/de:dev --revision <rev>
 *       [--offline] [--units production|reference] [--parity <labRunId>[:policy]]
 *   bun run evaluate --experiment segment-in-units/de:heldout:raw --revision <rev>
 *   bun run evaluate --experiment segment-in-units/de:dev:raw --estimate
 *   bun run evaluate --experiment segment-in-units/de:dev --revision <rev>
 *       --cases <ids file> | --cases-from <request compare report>
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
 *   bun run evaluate --experiment knowledge/de:doublets:tuning --revision <rev> --requests
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
 * `--cases` runs a segment.inUnits experiment on the cases a file names, one
 * id per line; `--cases-from` on the `changed` cases of a saved request diff
 * report (`--compare`'s output). The manifest names the list and its hash,
 * and the ledger line its hash, so a round can run only the cases a change
 * moves.
 *
 * Each command takes only the options it reads (`runOptions`), and any
 * other fails before anything is priced or asked: `--requests` reads no
 * case selection or repetitions, only knowledge.produce reads
 * `--gold-only`, a segment.inUnits run reads none of `--limit`,
 * `--subset`, `--repetitions` and `--gold-only`, and split-text reads
 * none of the run options. `--output` goes with any command.
 *
 * A segment.inUnits run counts against the lab's current round: it writes a
 * line to the lab ledger, refuses to go live when dumcorpus's prompt inputs
 * moved since the round was pinned (unless `--repin`) or when its projected
 * spend would cross the stop line, and stops at the line. It runs
 * production's `DumgenCore` with the lab's cached jev as its transport,
 * which retries a rate limit or a server error; the ledger line and the
 * output give those retries and the requests that still failed as
 * `transport`.
 *
 * Every run's Effects run on the process's one lab runtime
 * (`lab/evaluation/lab-runtime.ts`): all its attempts share one request
 * budget of 12, and SIGINT interrupts them, aborting the calls in flight.
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
import { messageOf } from "common-utils";
import { loadRun } from "promptsmith/storage";
import {
	newRequestRunId,
	type RequestRun,
	saveRequestRun,
} from "../lab/evaluation/request-diff.js";
import { defaultRunOutputDirectory } from "../lab/run-directory.js";
import {
	caseIdsOf,
	type EvaluationCliDependencies,
	type ExperimentCommand,
	parseCli,
	rejectUnread,
	rejectUnreadRunOptions,
} from "./evaluate/arguments.js";
import { compareCommand } from "./evaluate/compare.js";
import { experimentCommand } from "./evaluate/experiment-run.js";

// The CLI's checks its tests call, from where they lived before the split.
export { guardGrammarBudget } from "./evaluate/grammar-budget.js";
export { rejectUnreadRunOptions };

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
		rejectUnread(values, ["list"], "--list");
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
		rejectUnread(values, ["open"], "--open");
		const run = await loadRun(outputDirectory, values.open);
		write(run);
		return run;
	}
	if (values.compare) {
		rejectUnread(values, ["compare"], "--compare");
		return compareCommand(
			outputDirectory,
			values.compare,
			positionals,
			write,
		);
	}
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
	// An unknown experiment throws here, before its options are checked.
	experiments.spendsJev(experimentId);
	rejectUnreadRunOptions(values, experimentId);
	const caseIds = await caseIdsOf(values);
	// The process's one runtime: every Effect of the run runs on it, on
	// one request budget (`lab/evaluation/lab-runtime.ts`).
	const { makeLabRuntime } = await import("../lab/evaluation/lab-runtime.js");
	const runtime = makeLabRuntime();
	const command: ExperimentCommand = {
		values,
		experimentId,
		caseIds,
		units,
		outputDirectory,
		dependencies,
		write,
		warn,
		experiments,
		runtime,
	};
	try {
		return await (values.requests
			? requestsCommand(command)
			: experimentCommand(command));
	} finally {
		await runtime.dispose();
	}
}

/** `--requests`: every case's requests built offline, saved as a request run. */
async function requestsCommand({
	values,
	experimentId,
	units,
	outputDirectory,
	dependencies,
	write,
	experiments,
	runtime,
}: ExperimentCommand) {
	const built = await experiments.experimentRequests({
		experimentId,
		sourceRevision: values.revision ?? "",
		runtime,
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

if (import.meta.main)
	runEvaluationCli(process.argv.slice(2)).catch((error) => {
		console.error(messageOf(error));
		process.exitCode = 1;
	});
