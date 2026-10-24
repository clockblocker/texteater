/**
 * Records, or checks against, the request baselines a refactor that moves
 * no behaviour must reproduce (#1271): every evaluate experiment's request
 * run (`--requests`, `lab/evaluation/request-diff.ts`), segment.inUnits
 * under both unit configs, and the lab's offline replays of production
 * runs (`segment-in-units-lab replay`). Nothing is asked or paid: the
 * offline guard makes `fetch` throw and drops the provider keys, here and
 * in each replay it spawns.
 *
 *   bun run request-baselines [--replay <labRunId>]...
 *   bun run request-baselines --against <baselineId>
 *
 * Recording saves each request run under `<output>/requests/`, as
 * `evaluate --requests` does, and an index naming them all under
 * `<output>/requests/baselines/<baselineId>.json`; it prints the index.
 * `--against` records again and compares each request run with the
 * baseline's (`evaluate --compare`'s request diff) and each replay's
 * summary line with the baseline's, saves the report beside the index and
 * exits 1 on any difference. The output is the evaluate CLI's, `.runs/dumgen/`
 * at the repository root by default, which is gitignored.
 *
 * segment.inUnits answers from the lab's cache, so a live lab run that
 * fills it between two recordings moves requests no code moved; record the
 * baseline again at its revision (a `git worktree` sharing the cache) to
 * tell the two apart.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { messageOf } from "common-utils";
import { z } from "zod";
import { requestExperimentIds } from "../lab/evaluation/experiments.js";
import {
	compareRequestRuns,
	loadRequestRun,
	newRequestRunId,
} from "../lab/evaluation/request-diff.js";
import { git } from "../lab/git.js";
import { defaultRunOutputDirectory } from "../lab/run-directory.js";
import { runEvaluationCli } from "./evaluate.js";
import { offlineEnv } from "./offline-guard.js";

const packageRoot = resolve(import.meta.dir, "..");
const repository = resolve(packageRoot, "../..");

/** The latest production runs of dev and of held-out when #1271 pinned the baselines. */
const defaultReplays = [
	"20261002T121058--production--dev--all",
	"20261002T122056--production--heldout--all",
];

/** The paths whose uncommitted changes make a recording's revision dirty. */
const sourcePaths = [
	"battery/dumgen",
	"battery/dumcorpus",
	"battery/dumling",
	"battery/dumrel",
	"battery/common-utils",
];

const units = ["production", "reference"] as const;

const recordedRunSchema = z.object({
	experimentId: z.string(),
	units: z.enum(units).optional(),
	runId: z.string(),
	cases: z.number(),
	requests: z.number(),
});

const replaySchema = z.object({
	runId: z.string(),
	/** The replay's summary line: what it compared, matched, missed and asked. */
	summary: z.string(),
	fresh: z.number(),
});

const baselineSchema = z.object({
	baselineId: z.string(),
	revision: z.string(),
	dirty: z.array(z.string()),
	createdAt: z.string(),
	runs: z.array(recordedRunSchema),
	replays: z.array(replaySchema),
});
type Baseline = z.infer<typeof baselineSchema>;

/** One request run a recording makes: an experiment, and its units where it takes them. */
type Sweep = Pick<z.infer<typeof recordedRunSchema>, "experimentId" | "units">;

/** Each request experiment once, and segment.inUnits under the reference's units too. */
const sweeps = (): Sweep[] =>
	requestExperimentIds().flatMap((experimentId) =>
		experimentId.startsWith("segment-in-units/")
			? units.map((config) => ({ experimentId, units: config }))
			: [{ experimentId }],
	);

const sweepKey = (sweep: Sweep) =>
	`${sweep.experimentId}${sweep.units ? ` (${sweep.units})` : ""}`;

const indexPath = (outputDirectory: string, name: string) =>
	join(outputDirectory, "requests", "baselines", `${name}.json`);

async function recordRuns(outputDirectory: string, revision: string) {
	const runs: z.infer<typeof recordedRunSchema>[] = [];
	for (const sweep of sweeps()) {
		const summary = recordedRunSchema
			.pick({ runId: true, cases: true, requests: true })
			.parse(
				await runEvaluationCli(
					[
						"--experiment",
						sweep.experimentId,
						"--revision",
						revision,
						"--requests",
						...(sweep.units === "reference"
							? ["--units", "reference"]
							: []),
						"--output",
						outputDirectory,
					],
					{ write: () => undefined },
				),
			);
		runs.push({ ...sweep, ...summary });
		console.warn(
			`${sweepKey(sweep)}: ${summary.runId}, ${summary.cases} cases, ${summary.requests} requests`,
		);
	}
	return runs;
}

/** One lab run replayed offline in its own guarded process. */
async function replay(runId: string): Promise<z.infer<typeof replaySchema>> {
	const child = Bun.spawn(
		[
			"bun",
			"--preload",
			"./cli/offline-guard.ts",
			"cli/segment-in-units-lab.ts",
			"replay",
			"--run",
			runId,
		],
		{
			cwd: packageRoot,
			env: offlineEnv(),
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [stdout, stderr] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	const summary = stdout
		.split("\n")
		.find((line) => line.startsWith(`replay ${runId} `));
	if (!summary)
		throw Error(`The replay of ${runId} printed no summary: ${stderr}`);
	const fresh = Number(
		/(\d+) fresh calls$/u.exec(summary)?.[1] ?? Number.NaN,
	);
	console.warn(summary);
	return { runId, summary, fresh };
}

async function record(
	outputDirectory: string,
	replays: readonly string[],
): Promise<Baseline> {
	const revision = git(["rev-parse", "HEAD"], repository);
	const dirty = git(
		["status", "--porcelain", "--", ...sourcePaths],
		repository,
	)
		.split("\n")
		.filter((line) => line.length > 0);
	const runs = await recordRuns(
		outputDirectory,
		dirty.length > 0 ? `${revision}+dirty` : revision,
	);
	const replayed = [];
	for (const runId of replays) replayed.push(await replay(runId));
	const baseline: Baseline = {
		baselineId: newRequestRunId(),
		revision,
		dirty,
		createdAt: new Date().toISOString(),
		runs,
		replays: replayed,
	};
	const path = indexPath(outputDirectory, baseline.baselineId);
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, `${JSON.stringify(baseline, null, "\t")}\n`);
	return baseline;
}

/** Each request run and replay of `after` beside `before`'s, and whether any differs. */
async function compare(
	outputDirectory: string,
	before: Baseline,
	after: Baseline,
) {
	const afterRuns = new Map(after.runs.map((run) => [sweepKey(run), run]));
	const runs = [];
	for (const left of before.runs) {
		const right = afterRuns.get(sweepKey(left));
		if (!right) {
			runs.push({ sweep: sweepKey(left), missing: true });
			continue;
		}
		const report = compareRequestRuns(
			await loadRequestRun(outputDirectory, left.runId),
			await loadRequestRun(outputDirectory, right.runId),
		);
		runs.push({
			sweep: sweepKey(left),
			left: left.runId,
			right: right.runId,
			unchanged: report.unchanged,
			onlyLeft: report.onlyLeft,
			onlyRight: report.onlyRight,
			changed: report.changed,
		});
	}
	const added = after.runs
		.filter(
			(run) =>
				!before.runs.some((left) => sweepKey(left) === sweepKey(run)),
		)
		.map(sweepKey);
	const replays = before.replays.map((left) => {
		const right = after.replays.find(({ runId }) => runId === left.runId);
		return {
			runId: left.runId,
			before: left.summary,
			after: right?.summary ?? null,
			identical: right?.summary === left.summary,
		};
	});
	const differs =
		added.length > 0 ||
		replays.some(({ identical }) => !identical) ||
		runs.some(
			(run) =>
				"missing" in run ||
				run.changed.length > 0 ||
				run.onlyLeft.length > 0 ||
				run.onlyRight.length > 0,
		);
	return { differs, runs, added, replays };
}

async function main() {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			against: { type: "string" },
			replay: { type: "string", multiple: true },
			output: { type: "string" },
		},
	});
	const outputDirectory = resolve(
		values.output ??
			process.env.DUMGEN_RUN_DIRECTORY ??
			defaultRunOutputDirectory,
	);
	if (!values.against) {
		const baseline = await record(
			outputDirectory,
			values.replay ?? defaultReplays,
		);
		console.log(JSON.stringify(baseline, null, 2));
		return;
	}
	if (values.replay)
		throw Error(
			"--against replays the baseline's runs; it takes no --replay",
		);
	const before = baselineSchema.parse(
		JSON.parse(
			await readFile(indexPath(outputDirectory, values.against), "utf8"),
		),
	);
	const after = await record(
		outputDirectory,
		before.replays.map(({ runId }) => runId),
	);
	const comparison = await compare(outputDirectory, before, after);
	const path = indexPath(
		outputDirectory,
		`${after.baselineId}.against-${before.baselineId}`,
	);
	await writeFile(path, `${JSON.stringify(comparison, null, "\t")}\n`);
	console.log(
		JSON.stringify(
			{
				against: before.baselineId,
				baselineId: after.baselineId,
				differs: comparison.differs,
				report: path,
				runs: comparison.runs.map((run) =>
					"missing" in run
						? run
						: {
								sweep: run.sweep,
								unchanged: run.unchanged,
								changed: run.changed.length,
								onlyLeft: run.onlyLeft.length,
								onlyRight: run.onlyRight.length,
							},
				),
				added: comparison.added,
				replays: comparison.replays,
			},
			null,
			2,
		),
	);
	if (comparison.differs) process.exitCode = 1;
}

if (import.meta.main)
	main().catch((error: unknown) => {
		console.error(messageOf(error));
		process.exitCode = 1;
	});
