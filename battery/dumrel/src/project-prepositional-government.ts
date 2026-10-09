import { ParsingError } from "common-utils/validation";
import { compare, structuralKeys } from "./fingerprint.js";
import type { GovernmentProjection } from "./generated/types.js";
import { parseProjectionInventory } from "./projection-inventory.js";
import type { ReadingWithKnowledge } from "./types.js";

const relationOrder = ["governs", "governedBy"];

/**
 * Projects Prepositional Government over a finite dictionary inventory. Each
 * Preposition complement of a stored Valency Frame, alternatives included,
 * yields a direct `governs` edge from the governor Reading to the ADP Lemma
 * (`reden` governs both `über` and `von`), and an inferred `governedBy`
 * edge from every supplied Reading of that ADP Lemma back to the exact
 * governor Reading, so a
 * preposition's page can list `warten`, `stolz` and `Angst` without storing
 * anything on the preposition.
 *
 * Inputs are validated like {@link projectSemanticRelations}: duplicate
 * source Readings or invalid Knowledge reject the whole projection. An ADP
 * Lemma without supplied Readings still receives its direct edges. Output is
 * sorted by structural source key, relation (governs, governedBy), structural
 * target key, then governed case. A Hebrew or English edge has a null
 * governed case. No inputs are mutated.
 */
export function projectPrepositionalGovernment(
	entries: readonly ReadingWithKnowledge[],
):
	| { success: true; value: readonly GovernmentProjection[] }
	| { success: false; error: ParsingError } {
	const key = structuralKeys();
	const parsed = parseProjectionInventory(entries, key);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed };
	const { inventory, byLemma } = parsed;
	const edges = new Map<string, GovernmentProjection>();
	function add(edge: GovernmentProjection) {
		const identity = JSON.stringify([
			key(edge.source),
			edge.relation,
			key(edge.target),
			edge.governedCase,
		]);
		if (!edges.has(identity)) edges.set(identity, edge);
	}
	for (const { reading, knowledge } of inventory.values())
		for (const governed of (knowledge.valency ?? []).flatMap(
			({ complements }) => complements,
		)) {
			if (governed.kind !== "Preposition") continue;
			const governedCase =
				"governedCase" in governed ? governed.governedCase : null;
			add({
				source: reading,
				relation: "governs",
				target: governed.preposition,
				governedCase,
				provenance: "direct",
			});
			for (const preposition of byLemma.get(key(governed.preposition)) ??
				[])
				add({
					source: preposition,
					relation: "governedBy",
					target: reading,
					governedCase,
					provenance: "inferred",
				});
		}
	return {
		success: true,
		value: [...edges.values()].sort(
			(left, right) =>
				compare(key(left.source), key(right.source)) ||
				relationOrder.indexOf(left.relation) -
					relationOrder.indexOf(right.relation) ||
				compare(key(left.target), key(right.target)) ||
				compare(left.governedCase ?? "", right.governedCase ?? ""),
		),
	};
}
