import type { AnnotationLayer } from "../corpus-types.js";
import { annotationLayers } from "../layers.js";
import type { RecordFile } from "./record-files.js";

/** A record's status: its Review Depth, or Draft. */
type RecordStatus = AnnotationLayer | "Draft";

/**
 * How many records cite no Rule, per status, Draft first, then by layer.
 * Statuses with none are left out.
 */
export function uncitedRecordsByStatus(
	files: readonly RecordFile[],
): [RecordStatus, number][] {
	const counts = new Map<RecordStatus, number>();
	for (const file of files)
		if (file.rules.length === 0) {
			const status = file.reviewDepth ?? "Draft";
			counts.set(status, (counts.get(status) ?? 0) + 1);
		}
	return (["Draft", ...annotationLayers] as const)
		.filter((status) => counts.has(status))
		.map((status) => [status, counts.get(status) ?? 0]);
}
