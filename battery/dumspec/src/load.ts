import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRecord, uncitedIssue } from "./check-record.js";
import { type SpecIssue, SpecRecordError } from "./issues.js";
import { textRecordFileSchema } from "./record-schema.js";
import type {
	LegacyCase,
	ReviewStatus,
	SpecRecord,
	SpecRecordId,
	TextRecord,
} from "./types.js";

const recordsDirectory = fileURLToPath(new URL("../records/", import.meta.url));
const textPrefix = "text/";

/**
 * A record that needs work: the checks a Draft fails against the current
 * model, the imported cases it still holds verbatim, and the indices of its
 * targets that name no Reading yet.
 */
export interface WorklistEntry {
	record: SpecRecordId;
	status: ReviewStatus;
	issues: readonly SpecIssue[];
	legacy: readonly LegacyCase[];
	targetsWithoutReading: readonly number[];
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
 * Reads and checks every record file under a directory, sorted by id. A Draft
 * that parses but fails a check against the current model goes on the
 * worklist instead of failing; so does every record holding imported cases,
 * and every Draft with a target that names no Reading. A Reviewed record must
 * pass. Text Records, under `text/`, are checked for shape and a Reviewed
 * one's Rule citation, and join the worklist while they hold imported cases.
 */
export function readRecords(directory: string): {
	records: SpecRecord[];
	textRecords: TextRecord[];
	issues: SpecIssue[];
	worklist: WorklistEntry[];
} {
	const records: SpecRecord[] = [];
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
			const uncited = uncitedIssue(id, status, sources);
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
				worklist.push({
					record: id,
					status,
					issues: [],
					legacy,
					targetsWithoutReading: [],
				});
			continue;
		}
		const checked = checkRecord(id, input);
		if (checked.success) {
			records.push(checked.record);
			const { status, legacy, targets } = checked.record;
			const targetsWithoutReading = targets.flatMap((target, t) =>
				target.reading === undefined ? [t] : [],
			);
			if (legacy?.length || targetsWithoutReading.length > 0)
				worklist.push({
					record: id,
					status,
					issues: [],
					legacy: legacy ?? [],
					targetsWithoutReading,
				});
		} else if (
			checked.status === "Draft" &&
			checked.issues.every(
				(issue) => issue.check !== "Id" && issue.check !== "Shape",
			)
		)
			worklist.push({
				record: id,
				status: "Draft",
				issues: checked.issues,
				legacy: checked.legacy ?? [],
				targetsWithoutReading: checked.targetsWithoutReading ?? [],
			});
		else issues.push(...checked.issues);
	}
	return { records, textRecords, issues, worklist };
}

/**
 * Loads every Spec Record from the package's `records/` directory, sorted by
 * id. Each record has passed its strict Attestation, Segment, member-order,
 * coverage and Grundform checks; a Draft that fails them is left out and
 * listed by `loadSpecWorklist`. Throws `SpecRecordError` listing every issue
 * when a Reviewed record fails, or any record has a bad id or shape. Reads
 * the file system, so call it at build time.
 */
export function loadSpecRecords(): readonly SpecRecord[] {
	const { records, issues } = readRecords(recordsDirectory);
	if (issues.length > 0) throw new SpecRecordError(issues);
	return records;
}

/**
 * The records that still need work, sorted by id: Drafts failing a check
 * against the current model, records holding imported cases verbatim, and
 * Drafts with a target that names no Reading.
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
