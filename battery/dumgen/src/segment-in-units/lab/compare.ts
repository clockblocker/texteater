/**
 * What `compare` and `ledger --table` pair: each side's outcomes, scored from
 * the raw run when `.runs/` still has it and read from the run's local
 * outcomes otherwise, and the noise floor that judges the delta under each
 * measure, membership first (ADR 0008).
 */
import { existsSync } from "node:fs";
import { focusOf, type LabCase } from "./corpus.js";
import {
	type NoiseRecord,
	readManifest,
	readManifests,
	readNoise,
	readOutcomes,
} from "./evidence.js";
import { compareFocus, type FocusComparison } from "./focus.js";
import { primaryOf } from "./metrics.js";
import { deltasOf, type NoiseFloor, noiseFloor } from "./noise.js";
import {
	type Measure,
	type OutcomeRow,
	outcomesOf,
	pairOutcomes,
} from "./outcomes.js";
import { type LabRun, loadLabRun, runPath } from "./run.js";

/** Where a comparison reads: the local lab and the committed evidence. */
export type LabRoots = {
	readonly labRoot: string;
	readonly evidenceRoot: string;
};

export type Side = {
	readonly runId: string;
	readonly policy: string;
	readonly setName: string;
	readonly setHash: string;
	readonly rows: readonly OutcomeRow[];
	/** The raw run, when `.runs/` has it. */
	readonly raw?: LabRun;
};

export async function loadSide(
	args: LabRoots & {
		readonly runId: string;
		readonly policy?: string;
		/** Reads a raw run's set as scored (the #734 relabel, say); stored outcomes cannot be re-read. */
		readonly casesOf?: (
			setName: string,
			setHash: string,
		) => Promise<ReadonlyMap<string, LabCase>>;
		readonly relabeled?: boolean;
	},
): Promise<Side> {
	if (existsSync(runPath(args.labRoot, args.runId)) && args.casesOf) {
		const raw = await loadLabRun(args.labRoot, args.runId);
		return {
			runId: args.runId,
			policy: args.policy ?? primaryOf(raw),
			setName: raw.set,
			setHash: raw.setHash,
			rows: outcomesOf(raw, await args.casesOf(raw.set, raw.setHash)),
			raw,
		};
	}
	const rows = await readOutcomes(args.labRoot, args.runId);
	const manifest = await readManifest(args.evidenceRoot, args.runId);
	if (!rows || !manifest)
		throw Error(
			`${args.runId}: no raw run and no outcomes in .runs/, or no committed manifest`,
		);
	if (args.relabeled)
		throw Error(
			`${args.runId}: stored outcomes are scored against the frozen gold; a relabeled reading needs the raw run`,
		);
	return {
		runId: args.runId,
		policy: args.policy ?? manifest.primary,
		setName: manifest.set.name,
		setHash: manifest.set.hash,
		rows,
	};
}

/**
 * The noise floor for a comparison: `noiseRun` when named, else the latest
 * noise rerun of the left run, else of the right one, for that side's
 * policy. The floor under `measure` comes from the local outcomes of the
 * baseline and its rerun; without them, the committed `noise.json` holds
 * the membership floor only.
 */
export async function findNoise(
	{ labRoot, evidenceRoot }: LabRoots,
	left: Pick<Side, "runId" | "policy">,
	right: Pick<Side, "runId" | "policy">,
	noiseRun?: string,
	measure: Measure = "membership",
): Promise<
	{ readonly record: NoiseRecord; readonly floor: NoiseFloor } | undefined
> {
	const candidates = noiseRun
		? [noiseRun]
		: (await readManifests(evidenceRoot))
				.filter(
					(manifest) =>
						manifest.kind === "noise" &&
						(manifest.baseline === left.runId ||
							manifest.baseline === right.runId),
				)
				.sort(
					(a, b) =>
						Number(b.baseline === left.runId) -
							Number(a.baseline === left.runId) ||
						b.createdAt.localeCompare(a.createdAt),
				)
				.map((manifest) => manifest.runId);
	for (const runId of candidates) {
		const record = await readNoise(evidenceRoot, runId);
		if (!record) continue;
		const policy =
			record.baseline === right.runId && record.baseline !== left.runId
				? right.policy
				: left.policy;
		const baselineRows = await readOutcomes(labRoot, record.baseline);
		const rerunRows = await readOutcomes(labRoot, record.rerun);
		const floor =
			baselineRows && rerunRows
				? noiseFloor(baselineRows, rerunRows, policy, measure)
				: measure === "membership"
					? record.floors[policy]
					: undefined;
		if (floor) return { record, floor };
	}
	return undefined;
}

/**
 * The delta of right against left under `measure` (membership by default),
 * judged against the noise floor when one exists.
 */
export async function deltaBetween(
	roots: LabRoots,
	left: Side,
	right: Side,
	options: {
		readonly only?: ReadonlySet<string>;
		readonly noiseRun?: string;
		readonly measure?: Measure;
	} = {},
) {
	const measure = options.measure ?? "membership";
	const paired = pairOutcomes(left, right, options.only, measure);
	const noise = await findNoise(
		roots,
		left,
		right,
		options.noiseRun,
		measure,
	);
	const deltas = deltasOf(paired, noise?.floor);
	return { paired, noise, ...deltas };
}

/**
 * The focus reading of a comparison (#761): when both sides ran on the set
 * the membership focus set was taken from, what changed on its units and
 * on the guardrail. Undefined for any other set.
 */
export function focusBetween(
	left: Side,
	right: Side,
	only?: ReadonlySet<string>,
): FocusComparison | undefined {
	const focus = focusOf({ name: left.setName, hash: left.setHash });
	if (
		!focus ||
		right.setName !== left.setName ||
		right.setHash !== left.setHash
	)
		return undefined;
	return compareFocus(left, right, focus, only);
}
