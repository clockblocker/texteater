import { ParsingError } from "common-utils/validation";
import { compare, structuralKeys } from "./fingerprint.js";
import type { ParticipleProjection } from "./generated/types.js";
import { parseProjectionInventory } from "./projection-inventory.js";
import type { ReadingWithKnowledge } from "./types.js";

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
	const key = structuralKeys();
	const parsed = parseProjectionInventory(entries, key);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const edges: ParticipleProjection[] = [];
	for (const { reading, knowledge } of parsed.inventory.values()) {
		const source = knowledge.participleSource;
		if (!source) continue;
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
