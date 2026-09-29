/**
 * The German `segment.inUnits` lab: freezes the case sets, runs an arm with
 * repetitions, reports and compares runs, and keeps the cost ledger.
 *
 *   bun run segment-in-units-lab freeze [--force]
 *   bun run segment-in-units-lab run --arm pairwise --subset smoke --reps 1 [--opt render=tagged]
 *   bun run segment-in-units-lab report --run <runId> [--subset slice300]
 *   bun run segment-in-units-lab compare --left <runId>[:policy] --right <runId>[:policy]
 *   bun run segment-in-units-lab ledger
 *
 * Runs, frozen sets and the answer cache live under `.runs/segment-in-units-lab/`
 * (gitignored); the ledger and run summaries under
 * `evidence/segment-in-units-lab/`.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { compareRuns, loadRun } from "promptsmith/storage";
import { arms } from "../src/segment-in-units/de/arms/index.js";
import {
	freezeSets,
	type LabCase,
	loadSet,
	type SetName,
	setPath,
	subset,
} from "../src/segment-in-units/lab/corpus.js";
import { exportPolicy } from "../src/segment-in-units/lab/export.js";
import { Jev } from "../src/segment-in-units/lab/jev.js";
import {
	appendLedger,
	jevUsdPerToken,
	ledgerTotals,
	readLedger,
	spendOf,
} from "../src/segment-in-units/lab/ledger.js";
import { Luna } from "../src/segment-in-units/lab/luna.js";
import {
	breakdown,
	byGoldRoute,
	byRule,
	byShape,
	calibration,
	confusions,
	pairedUnits,
	policiesOf,
	primaryOf,
	summarizeCost,
	summarizePolicy,
} from "../src/segment-in-units/lab/metrics.js";
import {
	loadLabRun,
	runArm,
	saveLabRun,
} from "../src/segment-in-units/lab/run.js";

const packageRoot = resolve(import.meta.dir, "..");
const repository = resolve(packageRoot, "../..");
const labRoot = join(packageRoot, ".runs", "segment-in-units-lab");
const evidenceRoot = join(packageRoot, "evidence", "segment-in-units-lab");
const ledgerPath = join(evidenceRoot, "ledger.jsonl");
/** Stop spending at $9 of the $10 jev budget. */
const budgetUsd = 9;

const { positionals, values } = parseArgs({
	args: Bun.argv.slice(2),
	allowPositionals: true,
	options: {
		arm: { type: "string" },
		set: { type: "string", default: "dev" },
		subset: { type: "string" },
		reps: { type: "string", default: "3" },
		concurrency: { type: "string", default: "12" },
		opt: { type: "string", multiple: true, default: [] },
		limit: { type: "string" },
		offline: { type: "boolean", default: false },
		force: { type: "boolean", default: false },
		run: { type: "string" },
		policy: { type: "string" },
		left: { type: "string" },
		right: { type: "string" },
		qpc: { type: "string" },
		tag: { type: "string" },
	},
});

const git = (args: readonly string[]) =>
	execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();

const percent = (value: number) =>
	Number.isNaN(value) ? "–" : `${(100 * value).toFixed(1)}`;

function casesOf(cases: readonly LabCase[]): Map<string, LabCase> {
	return new Map(cases.map((labCase) => [labCase.id, labCase]));
}

async function freeze() {
	for (const name of ["dev", "heldout"] as const)
		if (existsSync(setPath(labRoot, name)) && !values.force)
			throw Error(`${name} is frozen already; pass --force to refreeze`);
	for (const set of await freezeSets(labRoot, repository))
		console.log(
			`${set.name}: ${set.cases.length} cases, hash ${set.hash}, git ${set.gitHead.slice(0, 8)}, ${set.dirtyRecordFiles} uncommitted record files`,
		);
}

async function run() {
	const arm = arms[values.arm ?? ""];
	if (!arm)
		throw Error(`--arm must be one of ${Object.keys(arms).join(", ")}`);
	const setName = values.set as SetName;
	const set = await loadSet(labRoot, setName);
	const subsetName = values.subset ?? "smoke";
	let cases = subset(set, subsetName);
	if (values.limit) cases = cases.slice(0, Number(values.limit));
	const options = Object.fromEntries(
		(values.opt ?? []).map((entry) => {
			const [key, ...rest] = entry.split("=");
			return [key ?? "", rest.join("=")];
		}),
	);
	const repetitions = Number(values.reps);
	const spentBefore = ledgerTotals(await readLedger(ledgerPath)).jevUsd;
	let spentNow = 0;
	const beforeSpend = () => {
		if (spentBefore + spentNow >= budgetUsd)
			throw Error(
				`jev budget line reached: $${(spentBefore + spentNow).toFixed(2)}`,
			);
	};
	const jev = new Jev({
		cacheDirectory: join(labRoot, "cache"),
		concurrency: Number(values.concurrency),
		...(values.qpc ? { questionsPerCall: Number(values.qpc) } : {}),
		offline: values.offline,
		beforeSpend,
		onSpend: (tokens) => {
			spentNow += tokens * jevUsdPerToken;
		},
	});
	const luna = arm.usesLuna
		? new Luna({
				cacheDirectory: join(labRoot, "cache"),
				concurrency: 6,
				offline: values.offline,
			})
		: undefined;
	const slug = Object.entries(options)
		.map(([key, value]) => `${key}-${value}`)
		.join("_")
		.replace(/[^a-zA-Z0-9_-]/gu, "-");
	const stamp = new Date().toISOString().replace(/[-:]/gu, "").slice(0, 15);
	const runId = [stamp, arm.id, slug, set.name, subsetName, values.tag]
		.filter(Boolean)
		.join("--");
	console.log(
		`${runId}: ${cases.length} cases × ${repetitions}, ledger so far $${spentBefore.toFixed(3)}`,
	);
	let last = 0;
	const labRun = await runArm({
		runId,
		arm,
		options,
		set,
		subset: subsetName,
		cases,
		repetitions,
		jev,
		...(luna ? { luna } : {}),
		concurrency: Number(values.concurrency),
		gitHead: git(["rev-parse", "HEAD"]),
		onProgress(done, total) {
			if (
				done - last >= Math.max(1, Math.floor(total / 10)) ||
				done === total
			) {
				last = done;
				process.stderr.write(
					`  ${done}/${total} ($${spentNow.toFixed(3)} fresh)\n`,
				);
			}
		},
	});
	await saveLabRun(labRoot, labRun);
	const calls = labRun.cases.flatMap((caseRun) =>
		caseRun.repetitions.flatMap((repetition) => repetition.calls),
	);
	const spend = spendOf(calls);
	await appendLedger(ledgerPath, {
		runId,
		at: new Date().toISOString(),
		command: "run",
		arm: arm.id,
		options,
		set: set.name,
		setHash: set.hash,
		subset: subsetName,
		cases: cases.length,
		repetitions,
		gitHead: labRun.gitHead,
		...spend,
	});
	console.log(
		`jev fresh ${spend.jev.freshInputTokens} tokens ($${spend.jev.usd.toFixed(4)}), luna fresh ${spend.luna.freshInputTokens}/${spend.luna.freshOutputTokens} tokens`,
	);
	await report(runId);
}

async function report(runId: string) {
	const labRun = await loadLabRun(labRoot, runId);
	const set = await loadSet(labRoot, labRun.set as SetName);
	const cases = casesOf(set.cases);
	const only =
		values.subset && values.run
			? new Set(subset(set, values.subset).map(({ id }) => id))
			: undefined;
	const policies = policiesOf(labRun);
	const primary = values.policy ?? primaryOf(labRun);
	const rows = policies.map((policy) =>
		summarizePolicy(labRun, cases, policy, only),
	);
	const cost = summarizeCost(labRun, only);
	console.log(
		`\n${runId} (${rows[0]?.cases ?? 0} cases × ${labRun.repetitions}, set ${labRun.set}@${labRun.setHash})`,
	);
	console.log(
		"policy        unit%  seg%  route|seg%  multiSeg% multiUnit% single% case%  full%   flips  varying  M/WS/WR/Mi/Stub (summed over reps)  unit% by rep",
	);
	for (const row of rows) {
		const { rates, tally } = row;
		console.log(
			[
				row.policy.padEnd(12),
				percent(rates.unitAccuracy).padStart(6),
				percent(rates.segmentAccuracy).padStart(5),
				percent(rates.routeGivenSegments).padStart(10),
				percent(rates.multiSegmentAccuracy).padStart(9),
				percent(rates.multiUnitAccuracy).padStart(10),
				percent(rates.singleUnitAccuracy).padStart(7),
				percent(rates.casePass).padStart(6),
				`${percent(rates.fullPass)}(${tally.fullCases / row.repetitions})`.padStart(
					9,
				),
				`${row.flips}/${row.flipBase}`.padStart(8),
				String(row.varyingOutputs).padStart(7),
				`  ${tally.match}/${tally.wrongSegments}/${tally.wrongRoute}/${tally.missing}/${tally.stub}`.padEnd(
					36,
				),
				row.unitAccuracyByRepetition.map(percent).join(" "),
			].join(" "),
		);
	}
	console.log(
		`cost: ${cost.jevInputTokensPerSentence.toFixed(0)} jev input tokens/sentence ($${cost.usdPerSentence.toFixed(6)}), ${cost.jevCallsPerSentence.toFixed(2)} calls, ${cost.jevQuestionsPerSentence.toFixed(1)} questions; luna ${cost.lunaCallsPerSentence.toFixed(2)} calls ${cost.lunaInputTokensPerSentence.toFixed(0)}/${cost.lunaOutputTokensPerSentence.toFixed(0)} tokens; latency p50 ${cost.latencyP50.toFixed(0)} ms p95 ${cost.latencyP95.toFixed(0)} ms; ${cost.errors} errors`,
	);
	const routeBreakdown = breakdown(labRun, cases, primary, byGoldRoute, only);
	const shapeBreakdown = breakdown(labRun, cases, primary, byShape, only);
	const ruleBreakdown = breakdown(labRun, cases, primary, byRule, only);
	const show = (
		title: string,
		table: ReturnType<typeof breakdown>,
		minimum = 1,
	) => {
		console.log(`${title} (${primary}): key scored seg% unit%`);
		for (const [key, entry] of Object.entries(table)
			.filter(([, entry]) => entry.scored >= minimum)
			.sort((a, b) => b[1].scored - a[1].scored))
			console.log(
				`  ${key.padEnd(48)} ${String(entry.scored).padStart(5)} ${percent(entry.segments / entry.scored).padStart(6)} ${percent(entry.match / entry.scored).padStart(6)}`,
			);
	};
	show("by gold route", routeBreakdown);
	show("by unit shape", shapeBreakdown);
	show("by cited Rule", ruleBreakdown, 9);
	const confused = [...confusions(labRun, cases, primary, only)].sort(
		(a, b) => b[1] - a[1],
	);
	console.log(
		`route confusions (${primary}, summed over reps): ${confused
			.slice(0, 18)
			.map(([key, count]) => `${key} ${count}`)
			.join("; ")}`,
	);
	const calibrated = calibration(labRun, cases, only);
	const bins = (title: string, table: typeof calibrated.routes) =>
		console.log(
			`${title}: ${table.bins
				.filter((bin) => bin.count > 0)
				.map(
					(bin) =>
						`[${bin.from.toFixed(2)},${bin.to.toFixed(2)}) ${bin.correct}/${bin.count}=${percent(bin.correct / bin.count)}`,
				)
				.join("  ")}`,
		);
	bins("route confidence vs correct", calibrated.routes);
	console.log(
		`route risk-coverage (floor kept% acc%): ${calibrated.routes.riskCoverage.map((point) => `${point.floor} ${percent(point.kept)} ${percent(point.accuracy)}`).join(" | ")}`,
	);
	if (calibrated.linkCount > 0)
		bins(
			`link probability vs truly linked (${calibrated.linkCount})`,
			calibrated.links,
		);
	await mkdir(join(evidenceRoot, "summaries"), { recursive: true });
	await writeFile(
		join(
			evidenceRoot,
			"summaries",
			`${runId}${values.subset && values.run ? `--${values.subset}` : ""}.json`,
		),
		`${JSON.stringify(
			{
				runId,
				arm: labRun.arm,
				options: labRun.options,
				set: labRun.set,
				setHash: labRun.setHash,
				setGitHead: labRun.setGitHead,
				subset:
					values.subset && values.run ? values.subset : labRun.subset,
				gitHead: labRun.gitHead,
				repetitions: labRun.repetitions,
				model: labRun.model,
				primary,
				policies: rows,
				cost,
				breakdowns: {
					route: routeBreakdown,
					shape: shapeBreakdown,
					rule: ruleBreakdown,
				},
				calibration: calibrated,
			},
			null,
			1,
		)}\n`,
	);
}

async function compare() {
	const [leftId, leftPolicy] = (values.left ?? "").split(":");
	const [rightId, rightPolicy] = (values.right ?? "").split(":");
	if (!leftId || !rightId) throw Error("--left and --right name runs");
	const directory = join(labRoot, "promptsmith");
	const exported = [];
	for (const [runId, policy] of [
		[leftId, leftPolicy],
		[rightId, rightPolicy],
	] as const) {
		const labRun = await loadLabRun(labRoot, runId);
		const set = await loadSet(labRoot, labRun.set as SetName);
		const only = values.subset
			? new Set(subset(set, values.subset).map(({ id }) => id))
			: undefined;
		const cases = new Map(
			[...casesOf(set.cases)].filter(([id]) => !only || only.has(id)),
		);
		const evaluation = await exportPolicy({
			run: labRun,
			cases,
			policy: policy ?? primaryOf(labRun),
			directory,
		});
		exported.push(await loadRun(directory, evaluation.manifest.runId));
	}
	const [left, right] = exported;
	if (!left || !right) return;
	const leftRun = await loadLabRun(labRoot, leftId);
	const rightRun = await loadLabRun(labRoot, rightId);
	const pairedSet = await loadSet(labRoot, leftRun.set as SetName);
	const pairedOnly = values.subset
		? new Set(subset(pairedSet, values.subset).map(({ id }) => id))
		: undefined;
	const paired = pairedUnits(
		{ run: leftRun, policy: leftPolicy ?? primaryOf(leftRun) },
		{ run: rightRun, policy: rightPolicy ?? primaryOf(rightRun) },
		casesOf(pairedSet.cases),
		pairedOnly,
	);
	console.log(
		`gold units by majority verdict: both match ${paired.both}, neither ${paired.neither}, left only ${paired.leftOnly.length}, right only ${paired.rightOnly.length}`,
	);
	for (const [side, list] of [
		["left only", paired.leftOnly],
		["right only", paired.rightOnly],
	] as const)
		console.log(
			`  ${side}: ${list
				.slice(0, Number(values.limit ?? 25))
				.map((entry) => entry.text)
				.join(" | ")}`,
		);
	const comparison = compareRuns(left, right);
	const verdicts = comparison.cases.filter((entry) => entry.verdictChanged);
	const count = (side: "left" | "right", verdict: string) =>
		comparison.cases.filter((entry) => entry.verdict[side] === verdict)
			.length;
	for (const side of ["left", "right"] as const)
		console.log(
			`${side}: Passed ${count(side, "Passed")} Failed ${count(side, "Failed")} Mixed ${count(side, "Mixed")} Unscored ${count(side, "Unscored")}`,
		);
	console.log(
		`same corpus: ${comparison.sameCorpus}; changed verdicts ${verdicts.length}; changed outputs ${comparison.changedOutputs.length}`,
	);
	const set = await loadSet(
		labRoot,
		(await loadLabRun(labRoot, leftId)).set as SetName,
	);
	const cases = casesOf(set.cases);
	for (const entry of verdicts.slice(0, Number(values.limit ?? 40))) {
		const labCase = cases.get(entry.caseId);
		const text =
			labCase?.input.segments.map(({ text }) => text).join("") ?? "";
		console.log(
			`  ${entry.verdict.left} → ${entry.verdict.right}  ${entry.caseId}\n      ${text.slice(0, 160)}`,
		);
	}
}

async function ledger() {
	const entries = await readLedger(ledgerPath);
	const totals = ledgerTotals(entries);
	console.log(
		`${entries.length} entries; jev fresh input ${totals.jevFreshInputTokens} tokens = $${totals.jevUsd.toFixed(3)} of $10 (stop at $${budgetUsd}); luna fresh ${totals.lunaFreshCalls} calls, ${totals.lunaFreshInputTokens} input / ${totals.lunaFreshOutputTokens} output tokens`,
	);
}

const command = positionals[0];
if (command === "freeze") await freeze();
else if (command === "run") await run();
else if (command === "report") await report(values.run ?? "");
else if (command === "compare") await compare();
else if (command === "ledger") await ledger();
else throw Error("Commands: freeze, run, report, compare, ledger");
