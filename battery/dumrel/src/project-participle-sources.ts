import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { conflict, contextualizeKnowledge } from "./context.js";
import { foldCanonicalForm } from "./fingerprint.js";
import type {
	ParticipleProjection,
	ParticipleSource,
	ReadingWithKnowledge,
} from "./types.js";
import { parseProjectionShape } from "./validation.js";

// Structural indexing is private to this projection, not a persistent ID
// codec. A Canonical Form counts case-folded, as Lemma identity does.
function key(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(key).join(",")}]`;
	if (value !== null && typeof value === "object")
		return `{${Object.entries(foldCanonicalForm(value))
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
 * Reading to the VERB Lemma, and, when the Reading's meaning is Verbal, an
 * inferred `participialAdjective` edge from that VERB Lemma back to the ADJ
 * Reading, so the Lemma `sich verlieben` can list `verliebt` without storing
 * anything on the verb. The inverse starts at
 * the Lemma the claim names, never at one of its Readings: no Reading of the
 * verb is chosen for the adjective, and the verb need not be stored at all.
 *
 * Inputs are validated like {@link projectSemanticRelations}: duplicate
 * source Readings or invalid Knowledge reject the whole projection. Output is
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
	const participles: {
		reading: Dumling.Reading;
		source: ParticipleSource;
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
	}
	const edges: ParticipleProjection[] = [];
	for (const { reading, source } of participles) {
		edges.push({
			source: reading,
			relation: "participleSource",
			target: source.verb,
			meaning: source.meaning,
			provenance: "direct",
		} as ParticipleProjection);
		// A drifted meaning is no participial adjective of the verb:
		// `gelassen` 😌 is not listed under `lassen`.
		if (source.meaning === "Verbal")
			edges.push({
				source: source.verb,
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
