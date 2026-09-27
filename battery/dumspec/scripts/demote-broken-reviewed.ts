/**
 * Demotes to Draft each Reviewed record that fails its checks against the
 * current model (ADR 0037, amended). A model change runs this instead of
 * migrating the records it breaks; they are reshaped later, in one pass, and
 * reviewed again. Prints the demoted ids.
 *
 *   bun run demote-broken-reviewed
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBreakdownRecord } from "../src/check-breakdown.js";
import { checkRecord } from "../src/check-record.js";
import type { SpecRecordId } from "../src/types.js";

/** Demotes the failing Reviewed records under a directory; returns their ids. */
export function demoteBrokenReviewed(directory: string): SpecRecordId[] {
	const demoted: SpecRecordId[] = [];
	const ids = readdirSync(directory, { recursive: true, encoding: "utf8" })
		.map((path) => path.replaceAll("\\", "/"))
		.filter((path) => path.endsWith(".json") && !path.startsWith("text/"))
		.map((path) => path.slice(0, -".json".length))
		.toSorted();
	for (const id of ids) {
		const path = join(directory, `${id}.json`);
		const text = readFileSync(path, "utf8");
		const input: { status?: unknown } = JSON.parse(text);
		const check = id.startsWith("breakdown/")
			? checkBreakdownRecord
			: checkRecord;
		if (input.status !== "Reviewed" || check(id, input).success) continue;
		writeFileSync(
			path,
			text.replace(/"status":\s*"Reviewed"/u, '"status": "Draft"'),
		);
		demoted.push(id);
	}
	return demoted;
}

if (import.meta.main)
	for (const id of demoteBrokenReviewed(
		fileURLToPath(new URL("../records/", import.meta.url)),
	))
		console.log(id);
