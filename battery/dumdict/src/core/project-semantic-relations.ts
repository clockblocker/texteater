import type * as Dumling from "dumling/types";
import { projectSemanticRelations as project } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { ReadingEntry } from "../domain-types.js";

/**
 * Projects only supplied dictionary Readings; inferred edges are never stored.
 * A Lemma target closes only when its Lemma has exactly one Reading. Each Lemma
 * counts its supplied Reading Entries unless `readingCounts` gives its
 * dictionary-wide count, so pass counts for Lemmas whose Entries are partial.
 */
export function projectSemanticRelations(
	entries: readonly ReadingEntry<Dumling.Language>[],
	readingCounts: readonly {
		readonly lemma: Dumling.Lemma;
		readonly readingCount: number;
	}[] = [],
):
	| { success: true; value: readonly Dumrel.SemanticRelationProjection[] }
	| { success: false; error: import("common-utils").ParsingError } {
	return project(
		entries.map(({ reading, knowledge }) => ({
			reading,
			knowledge: knowledge ?? {},
		})),
		{ readingCounts },
	);
}
