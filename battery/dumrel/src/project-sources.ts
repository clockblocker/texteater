import { ParsingError } from "common-utils/validation";
import { compare, structuralKeys } from "./fingerprint.js";
import type { SourceProjection } from "./generated/types.js";
import { parseProjectionInventory } from "./projection-inventory.js";
import type { ReadingWithKnowledge } from "./types.js";

const relationOrder = ["source", "participialAdjective"];

/**
 * Projects Sources over a finite dictionary inventory. Each stored Source
 * yields a direct `source` edge from its Reading to the Lemma or Unit Shadow
 * it names. A participle's Source whose meaning is Verbal and whose target is
 * a Lemma also yields an inferred `participialAdjective` edge from that VERB
 * Lemma back to the ADJ Reading, so the Lemma `sich verlieben` can list
 * `verliebt` without storing anything on the verb. The inverse starts at the
 * Lemma the claim names, never at one of its Readings: no Reading of the verb
 * is chosen for the adjective, and the verb need not be stored at all. A
 * pending Shadow target has no inverse yet.
 *
 * Inputs are validated like {@link projectSemanticRelations}: duplicate
 * source Readings or invalid Knowledge reject the whole projection. Output is
 * sorted by structural source key, relation, then structural target key. No
 * inputs are mutated.
 */
export function projectSources(
	entries: readonly ReadingWithKnowledge[],
):
	| { success: true; value: readonly SourceProjection[] }
	| { success: false; error: ParsingError } {
	const key = structuralKeys();
	const parsed = parseProjectionInventory(entries, key);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const edges: SourceProjection[] = [];
	for (const { reading, knowledge } of parsed.inventory.values()) {
		const source = knowledge.source;
		if (!source) continue;
		edges.push({
			source: reading,
			relation: "source",
			target: source.target,
			...(source.meaning ? { meaning: source.meaning } : {}),
			provenance: "direct",
		});
		// A drifted meaning is no participial adjective of the verb:
		// `gelassen` 😌 is not listed under `lassen`.
		if (source.meaning === "Verbal" && "unitKind" in source.target)
			edges.push({
				source: source.target,
				relation: "participialAdjective",
				target: reading,
				provenance: "inferred",
			});
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
