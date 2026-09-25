import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { conflict, contextualizeKnowledge } from "./context.js";
import type { ParticipleProjection, ReadingWithKnowledge } from "./types.js";
import { parseProjectionShape } from "./validation.js";

// Structural indexing is private to this projection, not a persistent ID codec.
function key(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(key).join(",")}]`;
	if (value !== null && typeof value === "object")
		return `{${Object.entries(value)
			.filter(([, member]) => member !== undefined)
			.sort(([left], [right]) => compare(left, right))
			.map(([name, member]) => `${JSON.stringify(name)}:${key(member)}`)
			.join(",")}}`;
	return JSON.stringify(value);
}

function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

const relationOrder = ["participleSource", "participialAdjective"];

/**
 * Projects Participle Sources over a finite dictionary inventory. Each stored
 * Participle Source yields a direct `participleSource` edge from the ADJ
 * Reading to the VERB Lemma, and an inferred `participialAdjective` edge from
 * every supplied Reading of that VERB Lemma back to the ADJ Reading, so the
 * page of `sich verlieben` can list `verliebt` without storing anything on the
 * verb.
 *
 * Inputs are validated like {@link projectSemanticRelations}: duplicate
 * source Readings or invalid Knowledge reject the whole projection. A VERB
 * Lemma without supplied Readings still receives its direct edges. Output is
 * sorted by structural source key, relation, then structural target key. No
 * inputs are mutated.
 */
export function projectParticipleSources(
	entries: readonly ReadingWithKnowledge[],
):
	| { success: true; value: readonly ParticipleProjection[] }
	| { success: false; error: ParsingError } {
	const parsed = parseProjectionShape(entries);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const seen = new Set<string>();
	const byLemma = new Map<string, Dumling.Reading[]>();
	const participles: {
		reading: Dumling.Reading;
		source: Dumling.Lemma;
	}[] = [];
	for (const [index, entry] of parsed.entries()) {
		const identity = key(entry.reading);
		if (seen.has(identity))
			return {
				success: false,
				error: conflict([index, "reading"], "Duplicate source Reading"),
			};
		seen.add(identity);
		const knowledge = contextualizeKnowledge(
			entry.reading,
			entry.knowledge,
		);
		if (knowledge instanceof ParsingError)
			return {
				success: false,
				error: new ParsingError(
					knowledge.issues.map((issue) => ({
						...issue,
						path: [index, ...issue.path],
					})),
				),
			};
		if (knowledge.participleSource)
			participles.push({
				reading: entry.reading,
				source: knowledge.participleSource,
			});
		const lemma = key(entry.reading.lemma);
		byLemma.set(lemma, [...(byLemma.get(lemma) ?? []), entry.reading]);
	}
	const edges: ParticipleProjection[] = [];
	for (const { reading, source } of participles) {
		edges.push({
			source: reading,
			relation: "participleSource",
			target: source,
			provenance: "direct",
		} as ParticipleProjection);
		for (const verb of byLemma.get(key(source)) ?? [])
			edges.push({
				source: verb,
				relation: "participialAdjective",
				target: reading,
				provenance: "inferred",
			} as ParticipleProjection);
	}
	return {
		success: true,
		value: edges.sort(
			(left, right) =>
				compare(key(left.source), key(right.source)) ||
				relationOrder.indexOf(left.relation) -
					relationOrder.indexOf(right.relation) ||
				compare(key(left.target), key(right.target)),
		),
	};
}
