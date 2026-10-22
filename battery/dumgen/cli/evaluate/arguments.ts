/**
 * The evaluate CLI's arguments (`cli/evaluate.ts`): its options, the ones
 * each command reads, the case list `--cases` or `--cases-from` names, and
 * an `--experiment` command once they are parsed.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { type ParseArgsOptionsConfig, parseArgs } from "node:util";
import type * as Experiments from "../../lab/evaluation/experiments.js";
import type { UnitConfig } from "../../lab/evaluation/experiments.js";
import type { LabRuntime } from "../../lab/evaluation/lab-runtime.js";
import type { Splitter } from "../../lab/evaluation/split-text.js";
import type { JevAsk } from "../../src/segment/jev.js";

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
	cases: { type: "string" },
	"cases-from": { type: "string" },
	subset: { type: "string" },
	repetitions: { type: "string" },
	"luna-batch": { type: "boolean" },
	"luna-prompt-cache": { type: "boolean" },
	"usd-budget": { type: "string" },
	"whole-round": { type: "boolean" },
	"gold-only": { type: "boolean" },
	requests: { type: "boolean" },
} as const satisfies ParseArgsOptionsConfig;

export const parseCli = (argv: string[]) =>
	parseArgs({ args: argv, allowPositionals: true, options: cliOptions });

export type CliValues = ReturnType<typeof parseCli>["values"];

export type EvaluationCliDependencies = {
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

type OptionName = keyof typeof cliOptions;

/**
 * Throws, naming the options given that `subject` does not read, when
 * any are; `takes` and `--output`, which goes with any command, are the
 * ones it reads.
 */
export function rejectUnread(
	values: CliValues,
	takes: readonly OptionName[],
	subject: string,
	note?: Note,
) {
	const reads = new Set<string>([...takes, "output"]);
	const given = Object.keys(values).filter((name) => !reads.has(name));
	if (given.length === 0) return;
	const flags = (names: Iterable<string>) =>
		[...names].map((name) => `--${name}`).join(", ");
	const noted = note && given.some((name) => note.options.has(name));
	throw Error(
		`${flags(given)} ${given.length === 1 ? "does" : "do"} not apply to ${subject}, which takes ${flags(reads)}${noted ? `. ${note.text}` : ""}`,
	);
}

/** Said when a refusal names any of `options`. */
type Note = {
	readonly options: ReadonlySet<string>;
	readonly text: string;
};

/** How an `--experiment` command runs: its flag, if any, wins in this order. */
type RunMode = "requests" | "estimate" | "offline" | "live";

const runModeOf = (values: CliValues): RunMode =>
	values.requests
		? "requests"
		: values.estimate
			? "estimate"
			: values.offline
				? "offline"
				: "live";

const modeSubject: Record<RunMode, string> = {
	requests: "a --requests run of",
	estimate: "an --estimate of",
	offline: "an --offline run of",
	live: "a live run of",
};

/**
 * The options one kind of experiment reads in each mode, beyond
 * `--experiment`, `--revision`, `--output` and the mode's own flag.
 */
type KindOptions = {
	readonly reads: Readonly<Record<RunMode, readonly OptionName[]>>;
	/** Added to a refusal of a run, not of a request run. */
	readonly note?: Note;
};

const segmentReads = ["units", "judgment-model", "concurrency"] as const;
const segmentRunReads = [...segmentReads, "cases", "cases-from"] as const;
const segmentNote: Note = {
	options: new Set(["limit", "subset", "repetitions", "gold-only"]),
	text: "A segment.inUnits run always runs its whole set (or its case list) at 3 repetitions; use --cases <ids file> or --cases-from <request compare report> to run part of a set",
};

/** segment.inUnits: `--parity` takes gold mode only. */
const segmentOptions = (parity: readonly OptionName[]): KindOptions => ({
	reads: {
		requests: segmentReads,
		estimate: [...segmentRunReads, "token-budget"],
		offline: [...segmentRunReads, ...parity],
		live: [
			...segmentRunReads,
			...parity,
			"token-budget",
			"repin",
			"reason",
		],
	},
	note: segmentNote,
});

const resolveRunReads = [
	"concurrency",
	"limit",
	"subset",
	"repetitions",
] as const;
const resolveLiveReads = [
	"budget",
	"luna-budget",
	"luna-output-budget",
	"usd-budget",
	"luna-batch",
	"luna-prompt-cache",
] as const;

/** resolve.grammar, resolve.reading and knowledge.produce, with `extra` on every run. */
const resolveOptions = (extra: readonly OptionName[]): KindOptions => ({
	reads: {
		requests: ["concurrency"],
		estimate: [...resolveRunReads, ...extra, "whole-round"],
		offline: [...resolveRunReads, ...extra],
		live: [...resolveRunReads, ...extra, ...resolveLiveReads],
	},
});

/**
 * The options each kind of experiment reads, by its id's route (and
 * `:raw` for segment.inUnits's raw mode). An experiment without a request
 * diff refuses `--requests` itself.
 */
const runOptions: Readonly<Record<string, KindOptions>> = {
	"segment-in-units": segmentOptions(["parity"]),
	"segment-in-units:raw": segmentOptions([]),
	"split-text": {
		reads: { requests: [], estimate: [], offline: [], live: [] },
	},
	"resolve-grammar": resolveOptions([]),
	"resolve-reading": resolveOptions([]),
	knowledge: resolveOptions(["gold-only"]),
};

const kindOf = (experimentId: string) => {
	const route = experimentId.split("/")[0] ?? "";
	return route === "segment-in-units" && experimentId.endsWith(":raw")
		? `${route}:raw`
		: route;
};

/**
 * Throws before anything is priced or asked when an `--experiment`
 * command is given an option its experiment does not read in its mode,
 * so a run meant to be small, or a request diff meant for a subset, does
 * not silently cover something else.
 */
export function rejectUnreadRunOptions(
	values: CliValues,
	experimentId: string,
) {
	const kind = runOptions[kindOf(experimentId)];
	if (!kind) throw Error(`${experimentId} names no options it reads`);
	const mode = runModeOf(values);
	rejectUnread(
		values,
		[
			"experiment",
			"revision",
			"output",
			...(mode === "live" ? [] : [mode]),
			...kind.reads[mode],
		],
		`${modeSubject[mode]} ${experimentId}`,
		mode === "requests" ? undefined : kind.note,
	);
}

/**
 * The case ids `--cases` lists, one per line, or the cases a request diff
 * report saved from `--compare` names as `changed` (`--cases-from`); none
 * without either.
 */
export async function caseIdsOf(
	values: CliValues,
): Promise<readonly string[] | undefined> {
	if (values.cases && values["cases-from"])
		throw Error("Use --cases or --cases-from, not both");
	if (values.cases)
		return (await readFile(resolve(values.cases), "utf8"))
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	if (!values["cases-from"]) return undefined;
	const { z } = await import("zod");
	const { readStoredJson } = await import("../../lab/stored-json.js");
	const report = await readStoredJson(
		z.object({ changed: z.array(z.object({ caseId: z.string() })) }),
		resolve(values["cases-from"]),
	);
	return report.changed.map(({ caseId }) => caseId);
}

/** An `--experiment` command, once its arguments and the table are loaded. */
export type ExperimentCommand = {
	readonly values: CliValues;
	readonly experimentId: string;
	/** `--cases` or `--cases-from`: only these cases run. */
	readonly caseIds: readonly string[] | undefined;
	readonly units: UnitConfig;
	readonly outputDirectory: string;
	readonly dependencies: EvaluationCliDependencies;
	readonly write: (value: unknown) => void;
	readonly warn: (message: string) => void;
	readonly experiments: typeof Experiments;
	/** The process's one lab runtime: its run's request budget (`lab-runtime.ts`). */
	readonly runtime: LabRuntime;
};
