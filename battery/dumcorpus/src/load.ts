import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBreakdownRecord } from "./check-breakdown.js";
import { checkRecord, uncitedIssue } from "./check-record.js";
import type {
	AnnotationLayer,
	BreakdownRecord,
	LegacyCase,
	SpecRecord,
	SpecRecordId,
	SpecSegmentation,
	TextRecord,
} from "./corpus-types.js";
import { type SpecIssue, SpecRecordError } from "./issues.js";
import { textRecordFileSchema } from "./record-schema.js";

const recordsDirectory = fileURLToPath(new URL("../records/", import.meta.url));
const textPrefix = "text/";
const breakdownPrefix = "breakdown/";

/**
 * A record that needs work: the checks its Draft layers fail or lack, and
 * the imported cases it still holds verbatim. A Text Record's entry names no
 * layers; it is on the worklist for its imported cases.
 */
export interface WorklistEntry {
	record: SpecRecordId;
	/** The deepest layer a person has reviewed; absent for a Draft. */
	reviewDepth?: AnnotationLayer;
	/** The deepest layer that passes; absent when Segmentation fails. */
	validThrough?: AnnotationLayer;
	issues: readonly SpecIssue[];
	legacy: readonly LegacyCase[];
}

function readJsonFiles(directory: string, issues: SpecIssue[]) {
	const files: { id: string; input: unknown }[] = [];
	const ids = readdirSync(directory, { recursive: true, encoding: "utf8" })
		.filter((path) => path.endsWith(".json"))
		.map((path) => path.replaceAll("\\", "/").slice(0, -".json".length))
		.toSorted();
	for (const id of ids)
		try {
			files.push({
				id,
				input: JSON.parse(
					readFileSync(join(directory, `${id}.json`), "utf8"),
				),
			});
		} catch (error) {
			issues.push({
				record: id,
				check: "Shape",
				path: "",
				message: `Invalid JSON: ${(error as Error).message}`,
			});
		}
	return files;
}

/**
 * Reads and checks every record file under a directory, sorted by id. A
 * record fails when its id or shape is bad, when it is reviewed without citing
 * a Rule, or when a layer it is reviewed through fails. Otherwise the issues
 * of its Draft layers put it on the worklist, as its imported cases do. Its
 * Segmentation loads when that layer passes, and the whole record when its
 * Attestation layer passes too. Breakdown Records, under `breakdown/`, load
 * alike from their Attestation layer. Text Records, under `text/`, are
 * checked for shape and a Reviewed one's Rule citation, and join the worklist
 * while they hold imported cases.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function readRecords(directory: string): {
	segmentations: SpecSegmentation[];
	records: SpecRecord[];
	breakdownRecords: BreakdownRecord[];
	textRecords: TextRecord[];
	issues: SpecIssue[];
	worklist: WorklistEntry[];
} {
	const segmentations: SpecSegmentation[] = [];
	const records: SpecRecord[] = [];
	const breakdownRecords: BreakdownRecord[] = [];
	const textRecords: TextRecord[] = [];
	const issues: SpecIssue[] = [];
	const worklist: WorklistEntry[] = [];
	for (const { id, input } of readJsonFiles(directory, issues)) {
		if (id.startsWith(textPrefix)) {
			const file = textRecordFileSchema.safeParse(input);
			if (!file.success) {
				for (const error of file.error.issues)
					issues.push({
						record: id,
						check: "Shape",
						path: error.path.join("."),
						message: error.message,
					});
				continue;
			}
			const { sourceText, status, sources, legacy } = file.data;
			const uncited = uncitedIssue(id, status === "Reviewed", sources);
			if (uncited) {
				issues.push(uncited);
				continue;
			}
			textRecords.push({
				id,
				sourceText,
				status,
				...(sources === undefined ? {} : { sources }),
				...(legacy === undefined ? {} : { legacy }),
			});
			if (legacy?.length)
				worklist.push({ record: id, issues: [], legacy });
			continue;
		}
		const checked = id.startsWith(breakdownPrefix)
			? checkBreakdownRecord(id, input)
			: checkRecord(id, input);
		if (checked.errors.length > 0) {
			issues.push(...checked.errors);
			continue;
		}
		if ("segmentation" in checked && checked.segmentation)
			segmentations.push(checked.segmentation);
		if (checked.record) {
			if ("lemma" in checked.record)
				breakdownRecords.push(checked.record);
			else records.push(checked.record);
		}
		const legacy = "legacy" in checked ? (checked.legacy ?? []) : [];
		if (checked.issues.length > 0 || legacy.length > 0)
			worklist.push({
				record: id,
				...(checked.reviewDepth === undefined
					? {}
					: { reviewDepth: checked.reviewDepth }),
				...(checked.validThrough === undefined
					? {}
					: { validThrough: checked.validThrough }),
				issues: checked.issues,
				legacy,
			});
	}
	return {
		segmentations,
		records,
		breakdownRecords,
		textRecords,
		issues,
		worklist,
	};
}

/**
 * Loads the Segmentation of every Spec Record whose Segmentation layer
 * passes, sorted by id: each target's members and route, the No Target
 * entries and the coverage, whatever the record's deeper layers hold. This is
 * the gold `segment.inUnits` is scored on. Throws `SpecRecordError` as
 * `loadSpecRecords` does. Reads the file system, so call it at build time.
 */
export function loadSpecSegmentations(): readonly SpecSegmentation[] {
	const { segmentations, issues } = readRecords(recordsDirectory);
	if (issues.length > 0) throw new SpecRecordError(issues);
	return segmentations;
}

/**
 * Loads every Spec Record whose Segmentation and Attestation layers pass,
 * from the package's `records/` directory, sorted by id: its Segment,
 * member-order, route and coverage checks, and its strict Attestation,
 * member and Grundform checks. Each target carries its Reading and Knowledge
 * where they pass. A record whose Draft layers fail is listed by
 * `loadSpecWorklist`. Throws `SpecRecordError` listing every issue when a
 * layer a record is reviewed through fails, or any record has a bad id or
 * shape. Reads the file system, so call it at build time.
 */
export function loadSpecRecords(): readonly SpecRecord[] {
	const { records, issues } = readRecords(recordsDirectory);
	if (issues.length > 0) throw new SpecRecordError(issues);
	return records;
}

/**
 * Loads every Breakdown Record from the package's `records/breakdown/`
 * directory, sorted by id, under the same terms as `loadSpecRecords`: one
 * whose Segmentation or Attestation fails is left out and listed by
 * `loadSpecWorklist`, and a failing reviewed layer throws `SpecRecordError`.
 */
export function loadBreakdownRecords(): readonly BreakdownRecord[] {
	const { breakdownRecords, issues } = readRecords(recordsDirectory);
	if (issues.length > 0) throw new SpecRecordError(issues);
	return breakdownRecords;
}

/**
 * The records that still need work, sorted by id: each whose Draft layers
 * fail a check against the current model or lack a target's Attestation or
 * Reading, and each holding imported cases verbatim. Breakdown and Text
 * Records included.
 */
export function loadSpecWorklist(): readonly WorklistEntry[] {
	return readRecords(recordsDirectory).worklist;
}

/** The record whose id is `id`, if any. */
export function findSpecRecord(
	records: readonly SpecRecord[],
	id: SpecRecordId,
): SpecRecord | undefined {
	return records.find((record) => record.id === id);
}
