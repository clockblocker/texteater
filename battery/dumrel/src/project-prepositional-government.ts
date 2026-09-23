import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { conflict, contextualizeKnowledge } from "./context.js";
import type { GovernmentProjection, ReadingWithKnowledge } from "./types.js";
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

const relationOrder = ["governs", "governedBy"];

/**
 * Projects Prepositional Government over a finite dictionary inventory. Each
 * stored governed preposition yields a direct `governs` edge from the governor
 * Reading to the ADP Lemma, and an inferred `governedBy` edge from every
 * supplied Reading of that ADP Lemma back to the exact governor Reading, so a
 * preposition's page can list `warten`, `stolz` and `Angst` without storing
 * anything on the preposition.
 *
 * Inputs are validated like {@link projectSemanticRelations}: duplicate
 * source Readings or invalid Knowledge reject the whole projection. An ADP
 * Lemma without supplied Readings still receives its direct edges. Output is
 * sorted by structural source key, relation (governs, governedBy), structural
 * target key, then case. No inputs are mutated.
 */
export function projectPrepositionalGovernment(
	entries: readonly ReadingWithKnowledge[],
):
	| { success: true; value: readonly GovernmentProjection[] }
	| { success: false; error: ParsingError } {
	const parsed = parseProjectionShape(entries);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const seen = new Set<string>();
	const byLemma = new Map<string, Dumling.Reading[]>();
	const governors: ReadingWithKnowledge[] = [];
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
		governors.push({ reading: entry.reading, knowledge });
		const lemma = key(entry.reading.lemma);
		byLemma.set(lemma, [...(byLemma.get(lemma) ?? []), entry.reading]);
	}
	const edges = new Map<string, GovernmentProjection>();
	function add(edge: GovernmentProjection) {
		const identity = JSON.stringify([
			key(edge.source),
			edge.relation,
			key(edge.target),
			edge.case,
		]);
		if (!edges.has(identity)) edges.set(identity, edge);
	}
	for (const { reading, knowledge } of governors)
		for (const governed of knowledge.governedPrepositions ?? []) {
			add({
				source: reading,
				relation: "governs",
				target: governed.preposition,
				case: governed.case,
				provenance: "direct",
			} as GovernmentProjection);
			for (const preposition of byLemma.get(key(governed.preposition)) ??
				[])
				add({
					source: preposition,
					relation: "governedBy",
					target: reading,
					case: governed.case,
					provenance: "inferred",
				} as GovernmentProjection);
		}
	return {
		success: true,
		value: [...edges.values()].sort(
			(left, right) =>
				compare(key(left.source), key(right.source)) ||
				relationOrder.indexOf(left.relation) -
					relationOrder.indexOf(right.relation) ||
				compare(key(left.target), key(right.target)) ||
				compare(left.case, right.case),
		),
	};
}
