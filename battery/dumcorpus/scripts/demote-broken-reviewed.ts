/**
 * Demotes each reviewed record whose reviewed layers fail against the current
 * model (ADR 0037): its Review Depth drops to the deepest layer that
 * still passes, or it becomes a Draft. A model change runs this instead of
 * migrating the records it breaks; they are reshaped later, in one pass, and
 * reviewed again. Prints each demotion.
 *
 *   bun run demote-broken-reviewed
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBreakdownRecord } from "../src/check-breakdown.js";
import { checkRecord } from "../src/check-record.js";
import type { AnnotationLayer, SpecRecordId } from "../src/corpus-types.js";
import { setReviewDepth } from "../src/review-depth.js";

/** One demoted record: its Review Depth before, and after or none. */
export interface Demotion {
	record: SpecRecordId;
	from: AnnotationLayer;
	to?: AnnotationLayer;
}

/** Demotes the failing reviewed records under a directory. */
export function demoteBrokenReviewed(directory: string): Demotion[] {
	const demoted: Demotion[] = [];
	const ids = readdirSync(directory, { recursive: true, encoding: "utf8" })
		.map((path) => path.replaceAll("\\", "/"))
		.filter((path) => path.endsWith(".json") && !path.startsWith("text/"))
		.map((path) => path.slice(0, -".json".length))
		.toSorted();
	for (const id of ids) {
		const path = join(directory, `${id}.json`);
		const text = readFileSync(path, "utf8");
		const input: { reviewDepth?: AnnotationLayer } = JSON.parse(text);
		const from = input.reviewDepth;
		if (from === undefined) continue;
		const check = id.startsWith("breakdown/")
			? checkBreakdownRecord
			: checkRecord;
		const { errors, validThrough } = check(id, input);
		if (errors.length === 0) continue;
		// A failing check of the whole record, such as its shape or a missing
		// Rule citation, leaves no layer standing.
		const to = errors.every((issue) => issue.layer !== undefined)
			? validThrough
			: undefined;
		writeFileSync(path, setReviewDepth(text, to));
		demoted.push({ record: id, from, ...(to === undefined ? {} : { to }) });
	}
	return demoted;
}

if (import.meta.main)
	for (const { record, from, to } of demoteBrokenReviewed(
		fileURLToPath(new URL("../records/", import.meta.url)),
	))
		console.log(`${record}: ${from} -> ${to ?? "Draft"}`);
