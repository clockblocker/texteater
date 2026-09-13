import type * as Dumling from "dumling/types";
import { projectSemanticRelations as project } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { ReadingEntry } from "../domain-types.js";

/** Projects only supplied dictionary Readings; inferred edges are never stored. */
export function projectSemanticRelations(
	entries: readonly ReadingEntry<Dumling.Language>[],
):
	| { success: true; value: readonly Dumrel.SemanticRelationProjection[] }
	| { success: false; error: import("common-utils").ParsingError } {
	return project(
		entries.map(({ reading, knowledge }) => ({
			reading,
			knowledge: knowledge ?? {},
		})),
	);
}
