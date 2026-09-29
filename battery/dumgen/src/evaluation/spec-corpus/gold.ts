/**
 * The gold every prompt's cases come from: dumspec's Spec Records at their
 * Segmentation layer, read when the eval runs, and Dumgen's sidecar beside
 * them. The sidecar holds what
 * Dumgen owns and the records do not carry: explanations, slices, and the
 * records a run leaves out, each with its reason.
 */
import { readFileSync } from "node:fs";
import {
	loadSpecSegmentations,
	loadSpecWorklist,
	type SpecCheck,
} from "dumspec";
import type * as Dumspec from "dumspec/types";
import { z } from "zod";

const recordId = z.string().regex(/^[a-z]{2}(?:\/[a-z0-9-]+)+$/u);
const text = z.string().trim().min(1);

/**
 * Dumgen's sidecar to the Spec Records. Prompt-independent except
 * `explanations`, which are keyed by the Golden Corpus route, then by case
 * id. `slices` and `exclusions` name records, so they reach every case a
 * record yields in every corpus.
 */
const sidecarSchema = z.strictObject({
	/** Named record sets a run can be split by. */
	slices: z.record(
		text,
		z.strictObject({
			description: text,
			records: z.array(recordId).min(1),
		}),
	),
	/** Why an ideal output is what it is, shown with a demonstration. */
	explanations: z.record(text, z.record(text, text)),
	/**
	 * Records no test set includes: gold waiting on an open grilling, or
	 * known to be wrong. `issue` is the GitHub issue that tracks the reason.
	 */
	exclusions: z.record(
		recordId,
		z.strictObject({
			reason: text,
			issue: z.int().positive().optional(),
		}),
	),
});
export type Sidecar = z.infer<typeof sidecarSchema>;

/**
 * A record dumspec leaves out because its Segmentation layer fails a check
 * against the model, with the Segmentation checks it fails.
 */
export type UnloadedRecord = {
	readonly record: Dumspec.SpecRecordId;
	/** The deepest layer a person has reviewed; absent for a Draft. */
	readonly reviewDepth?: Dumspec.AnnotationLayer;
	readonly checks: readonly SpecCheck[];
};

export type Gold = {
	/**
	 * Every Spec Record whose Segmentation passes dumspec's checks, sorted by
	 * id, whatever its deeper layers hold.
	 */
	readonly records: readonly Dumspec.SpecSegmentation[];
	/** Spec Records dumspec does not load, so no projection sees them. */
	readonly unloaded: readonly UnloadedRecord[];
	readonly sidecar: Sidecar;
};

const sidecarUrl = new URL("sidecar.json", import.meta.url);

/** Reads and checks Dumgen's sidecar. */
export function readSidecar(url: URL = sidecarUrl): Sidecar {
	return sidecarSchema.parse(JSON.parse(readFileSync(url, "utf8")));
}

/**
 * Pairs the records with a sidecar and checks that every record the sidecar
 * names exists, loaded or not, so a renamed record cannot slip out of an
 * exclusion unnoticed.
 */
export function goldOf(args: {
	readonly records: readonly Dumspec.SpecSegmentation[];
	readonly unloaded?: readonly UnloadedRecord[];
	readonly sidecar: Sidecar;
}): Gold {
	const unloaded = args.unloaded ?? [];
	const known = new Set([
		...args.records.map(({ id }) => id),
		...unloaded.map(({ record }) => record),
	]);
	const named = [
		...Object.values(args.sidecar.slices).flatMap(({ records }) => records),
		...Object.keys(args.sidecar.exclusions),
	];
	const unknown = [...new Set(named.filter((id) => !known.has(id)))];
	if (unknown.length > 0)
		throw Error(
			`The spec-corpus sidecar names records dumspec does not have: ${unknown.join(", ")}`,
		);
	return { records: args.records, unloaded, sidecar: args.sidecar };
}

/**
 * Loads the Spec Records' Segmentations from dumspec and Dumgen's sidecar.
 * Reads the file system; throws when dumspec rejects a record or the sidecar
 * names a record that does not exist.
 */
export function loadGold(sidecar: Sidecar = readSidecar()): Gold {
	const records = loadSpecSegmentations();
	const loaded = new Set(records.map(({ id }) => id));
	const unloaded = loadSpecWorklist()
		.filter(
			(entry) =>
				!loaded.has(entry.record) &&
				!entry.record.startsWith("breakdown/") &&
				entry.issues.length > 0,
		)
		.map(
			(entry): UnloadedRecord => ({
				record: entry.record,
				...(entry.reviewDepth === undefined
					? {}
					: { reviewDepth: entry.reviewDepth }),
				checks: [
					...new Set(
						entry.issues
							.filter(({ layer }) => layer === "Segmentation")
							.map(({ check }) => check),
					),
				],
			}),
		);
	return goldOf({ records, unloaded, sidecar });
}
