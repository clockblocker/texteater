import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRecord } from "./check-record.js";
import { type SpecIssue, SpecRecordError } from "./issues.js";
import type { SpecRecord, SpecRecordId } from "./types.js";

const recordsDirectory = fileURLToPath(new URL("../records/", import.meta.url));

/** Reads and checks every record file under a directory, sorted by id. */
export function readRecords(directory: string): {
	records: SpecRecord[];
	issues: SpecIssue[];
} {
	const records: SpecRecord[] = [];
	const issues: SpecIssue[] = [];
	const ids = readdirSync(directory, { recursive: true, encoding: "utf8" })
		.filter((path) => path.endsWith(".json"))
		.map((path) => path.replaceAll("\\", "/").slice(0, -".json".length))
		.toSorted();
	for (const id of ids) {
		let input: unknown;
		try {
			input = JSON.parse(
				readFileSync(join(directory, `${id}.json`), "utf8"),
			);
		} catch (error) {
			issues.push({
				record: id,
				check: "Shape",
				path: "",
				message: `Invalid JSON: ${(error as Error).message}`,
			});
			continue;
		}
		const checked = checkRecord(id, input);
		if (checked.success) records.push(checked.record);
		else issues.push(...checked.issues);
	}
	return { records, issues };
}

/**
 * Loads every Spec Record from the package's `records/` directory, sorted by
 * id. Each record has passed its strict Attestation, Segment, member-order,
 * coverage and Grundform checks. Throws `SpecRecordError` listing every issue
 * when any record fails. Reads the file system, so call it at build time.
 */
export function loadSpecRecords(): readonly SpecRecord[] {
	const { records, issues } = readRecords(recordsDirectory);
	if (issues.length > 0) throw new SpecRecordError(issues);
	return records;
}

/** The record whose id is `id`, if any. */
export function findSpecRecord(
	records: readonly SpecRecord[],
	id: SpecRecordId,
): SpecRecord | undefined {
	return records.find((record) => record.id === id);
}
