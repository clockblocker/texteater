/**
 * What every command of the segment.inUnits lab (`cli/segment-in-units-lab.ts`)
 * shares: its roots, its arguments, its cached jev, the runtime its Effects
 * run on, the cases it reads and the round a spending command counts
 * against.
 */
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import type * as Effect from "effect/Effect";
import {
	labRequestBudget,
	makeLabRuntime,
	runInterruptibly,
} from "../../lab/evaluation/lab-runtime.js";
import {
	type LabCase,
	trackedSetsRoot,
} from "../../lab/segmentation/harness/corpus.js";
import {
	JevCache,
	type JevCacheOptions,
} from "../../lab/segmentation/harness/jev-cache.js";
import { readLedger } from "../../lab/segmentation/harness/ledger.js";
import type { provenanceOf } from "../../lab/segmentation/harness/provenance.js";
import {
	enterRound,
	type Round,
	roundSpend,
	roundsPath,
	stopLineOf,
} from "../../lab/segmentation/harness/round.js";
import { conformTo734 } from "../../lab/segmentation/harness/ruling734.js";
import type { RequestBudget } from "../../src/call.js";
import { createTypeSafeAsk } from "../../src/segment/typesafe-ask.js";

export const packageRoot = resolve(import.meta.dir, "../..");
export const repository = resolve(packageRoot, "../..");
/** The CLI's sources, which a run's provenance hashes with the lab's. */
export const cliSources = [
	"cli/segment-in-units-lab.ts",
	"cli/segment-in-units-lab",
];
export const labRoot = join(packageRoot, ".runs", "segment-in-units-lab");
export const setsRoot = trackedSetsRoot;
export const evidenceRoot = join(
	packageRoot,
	"evidence",
	"segment-in-units-lab",
);
export const ledgerPath = join(evidenceRoot, "ledger.jsonl");
export const roundBook = roundsPath(evidenceRoot);
export const roots = { labRoot, evidenceRoot };

/**
 * The lab's cached jev under `.runs/`. Unless it is offline or projecting,
 * it asks production's TypeSafe ask on a miss, retrying as the cache does,
 * and needs `TYPESAFE_API_KEY`.
 */
export function jevCache(options: Omit<JevCacheOptions, "cacheDirectory">) {
	const live = !options.offline && !options.project;
	const apiKey = process.env.TYPESAFE_API_KEY;
	if (live && !apiKey)
		throw Error("TYPESAFE_API_KEY is not set; a live command asks jev");
	return new JevCache({
		cacheDirectory: join(labRoot, "cache"),
		...(live && apiKey ? { transport: createTypeSafeAsk({ apiKey }) } : {}),
		...options,
	});
}

export const { positionals, values } = parseArgs({
	args: Bun.argv.slice(2),
	allowPositionals: true,
	options: {
		arm: { type: "string" },
		set: { type: "string", default: "dev" },
		subset: { type: "string" },
		reps: { type: "string" },
		concurrency: { type: "string", default: "12" },
		"request-budget": { type: "string", default: String(labRequestBudget) },
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
		sizes: { type: "string", default: "25,100,400,2000" },
		relabel: { type: "string" },
		parent: { type: "string" },
		hypothesis: { type: "string" },
		"allow-dirty": { type: "boolean", default: false },
		"allow-drift": { type: "boolean", default: false },
		model: { type: "string" },
		"allow-floating-model": { type: "boolean", default: false },
		"token-budget": { type: "string" },
		estimate: { type: "boolean", default: false },
		repin: { type: "boolean", default: false },
		reason: { type: "string" },
		open: { type: "string" },
		cap: { type: "string" },
		"stop-line": { type: "string" },
		note: { type: "string" },
		offset: { type: "string" },
		noise: { type: "string" },
		replay: { type: "string" },
		record: { type: "boolean", default: false },
		verdict: { type: "string" },
		table: { type: "boolean", default: false },
	},
});

const requestBudget = Number(values["request-budget"]);
if (!Number.isInteger(requestBudget) || requestBudget < 1)
	throw Error(
		`--request-budget ${values["request-budget"]} is not a positive integer`,
	);

/**
 * The process's one lab runtime (`lab/evaluation/lab-runtime.ts`): every
 * Effect a command runs, runs on it, and every jev request holds one of its
 * `--request-budget` permits (12 unless set). `--concurrency` caps the
 * cases a run works on at once; the budget caps their requests in flight.
 */
const runtime = makeLabRuntime(requestBudget);

/** `effect` on the process's lab runtime; Ctrl-C interrupts it, aborting the jev requests in flight. */
export const runLab = <A, E>(
	effect: Effect.Effect<A, E, RequestBudget>,
): Promise<A> => runInterruptibly(runtime, effect);

/** Releases the process's lab runtime once its command is done. */
export const disposeLab = (): Promise<void> => runtime.dispose();

/** The cases by id, read against the #734 ruling when `--relabel 734`. */
export function casesOf(cases: readonly LabCase[]): Map<string, LabCase> {
	const read =
		values.relabel === "734" ? conformTo734 : (labCase: LabCase) => labCase;
	return new Map(cases.map((labCase) => [labCase.id, read(labCase)]));
}

export const plainCases = (cases: readonly LabCase[]) =>
	new Map(cases.map((labCase) => [labCase.id, labCase]));

export function optionsOf(entries: readonly string[]): Record<string, string> {
	return Object.fromEntries(
		entries.map((entry) => {
			const [key, ...rest] = entry.split("=");
			return [key ?? "", rest.join("=")];
		}),
	);
}

export type Provenance = Awaited<ReturnType<typeof provenanceOf>>;

/** Refuses a dirty tree unless `--allow-dirty`, and then says so loudly. */
export function guardDirty(provenance: Provenance) {
	if (!provenance.dirty) return;
	const files = provenance.dirtyFiles.map((line) => `  ${line}`).join("\n");
	if (!values["allow-dirty"])
		throw Error(
			`Uncommitted changes in the lab's sources:\n${files}\nCommit them first, or pass --allow-dirty to record the run as dirty with a diff.patch.`,
		);
	console.warn(
		`\n*** DIRTY TREE: this run records dirty: true and a diff.patch; gitHead alone does not name its code.\n${files}\n`,
	);
}

/**
 * The round a command counts against and the dumcorpus state it reads. A
 * live command refuses drifted prompt inputs unless `--repin`; an offline
 * one reports them.
 */
export async function account(live: boolean, command: string) {
	const entered = await enterRound({
		evidenceRoot,
		repository,
		live,
		repin: values.repin,
		reason: values.reason ?? `${command} --repin`,
	});
	if (entered.warning) console.warn(`\n*** ${entered.warning}\n`);
	const stopLine = stopLineOf(entered.round, values["token-budget"]);
	const spent = roundSpend(
		await readLedger(ledgerPath),
		entered.round.id,
	).jevFreshInputTokens;
	return { ...entered, stopLine, spent };
}

/** What `--estimate` prints: the projection against what the round has left. */
export function printEstimate(
	round: Round,
	spent: number,
	stopLine: number,
	projected: number,
) {
	console.log(
		`round ${round.id}: spent ${spent}, this run ${projected}, stop line ${stopLine}: ${spent + projected <= stopLine ? "fits" : "CROSSES THE STOP LINE"}; nothing was asked`,
	);
}
