/**
 * What `compare` and `ledger --table` pair: each side's outcomes, scored from
 * the raw run when `.runs/` still has it and read from the committed
 * `outcomes.jsonl.gz` otherwise, and the noise floor that judges the delta.
 */
import { existsSync } from "node:fs";
import type { LabCase } from "./corpus.js";
import {
	type NoiseRecord,
	readManifest,
	readManifests,
	readNoise,
	readOutcomes,
} from "./evidence.js";
import { primaryOf } from "./metrics.js";
import { deltasOf, type NoiseFloor } from "./noise.js";
import { type OutcomeRow, outcomesOf, pairOutcomes } from "./outcomes.js";
import { type LabRun, loadLabRun, runPath } from "./run.js";

export type Side = {
	readonly runId: string;
	readonly policy: string;
	readonly setName: string;
	readonly rows: readonly OutcomeRow[];
	/** The raw run, when `.runs/` has it. */
	readonly raw?: LabRun;
};

export async function loadSide(args: {
	readonly labRoot: string;
	readonly evidenceRoot: string;
	readonly runId: string;
	readonly policy?: string;
	/** Reads a raw run's set as scored (the #734 relabel, say); committed outcomes cannot be re-read. */
	readonly casesOf?: (
		setName: string,
	) => Promise<ReadonlyMap<string, LabCase>>;
	readonly relabeled?: boolean;
}): Promise<Side> {
	if (existsSync(runPath(args.labRoot, args.runId)) && args.casesOf) {
		const raw = await loadLabRun(args.labRoot, args.runId);
		return {
			runId: args.runId,
			policy: args.policy ?? primaryOf(raw),
			setName: raw.set,
			rows: outcomesOf(raw, await args.casesOf(raw.set)),
			raw,
		};
	}
	const rows = await readOutcomes(args.evidenceRoot, args.runId);
	const manifest = await readManifest(args.evidenceRoot, args.runId);
	if (!rows || !manifest)
		throw Error(
			`${args.runId}: no raw run in .runs/ and no committed outcomes`,
		);
	if (args.relabeled)
		throw Error(
			`${args.runId}: committed outcomes are scored against the frozen gold; a relabeled reading needs the raw run`,
		);
	return {
		runId: args.runId,
		policy: args.policy ?? manifest.primary,
		setName: manifest.set.name,
		rows,
	};
}

/**
 * The noise floor for a comparison: `noiseRun` when named, else the latest
 * noise rerun of the left run, else of the right one, for that side's policy.
 */
export async function findNoise(
	evidenceRoot: string,
	left: Pick<Side, "runId" | "policy">,
	right: Pick<Side, "runId" | "policy">,
	noiseRun?: string,
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
		const floor = record.floors[policy];
		if (floor) return { record, floor };
	}
	return undefined;
}

/** The overall delta of right against left, judged against the noise floor when one exists. */
export async function deltaBetween(
	evidenceRoot: string,
	left: Side,
	right: Side,
	options: {
		readonly only?: ReadonlySet<string>;
		readonly noiseRun?: string;
	} = {},
) {
	const paired = pairOutcomes(left, right, options.only);
	const noise = await findNoise(evidenceRoot, left, right, options.noiseRun);
	const deltas = deltasOf(paired, noise?.floor);
	return { paired, noise, ...deltas };
}
