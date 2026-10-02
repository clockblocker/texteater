import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { contextualizeKnowledge, issue } from "./context.js";
import type { ReadingWithKnowledge } from "./types.js";
import { parseProjectionShape } from "./validation.js";

/** The finite dictionary inventory a projection runs over. */
type ProjectionInventory = {
	/** Each entry, its Knowledge contextualized, by its Reading's key, in input order. */
	readonly inventory: ReadonlyMap<string, ReadingWithKnowledge>;
	/** The supplied Readings of each Lemma, by the Lemma's key. */
	readonly byLemma: ReadonlyMap<string, readonly Dumling.Reading[]>;
};

/**
 * Parses a projection's entries: their shape, one entry per source Reading,
 * and each entry's Knowledge contextualized to its Reading, with issue paths
 * starting at the entry's index. `key` is the projection's structural key.
 */
export function parseProjectionInventory(
	entries: readonly ReadingWithKnowledge[],
	key: (value: unknown) => string,
): ProjectionInventory | ParsingError {
	const parsed = parseProjectionShape(entries);
	if (parsed instanceof ParsingError) return parsed;
	const inventory = new Map<string, ReadingWithKnowledge>();
	const byLemma = new Map<string, Dumling.Reading[]>();
	for (const [index, entry] of parsed.entries()) {
		const identity = key(entry.reading);
		if (inventory.has(identity))
			return issue([index, "reading"], "Duplicate source Reading");
		const knowledge = contextualizeKnowledge(
			entry.reading,
			entry.knowledge,
		);
		if (knowledge instanceof ParsingError)
			return new ParsingError(
				knowledge.issues.map((found) => ({
					...found,
					path: [index, ...found.path],
				})),
			);
		inventory.set(identity, { reading: entry.reading, knowledge });
		const lemma = key(entry.reading.lemma);
		byLemma.set(lemma, [...(byLemma.get(lemma) ?? []), entry.reading]);
	}
	return { inventory, byLemma };
}
