import { isRecord } from "common-utils";
import type * as Dumrel from "dumrel/types";

/**
 * One governed preposition an occurrence attests (ADR 0034): the
 * preposition and the case it governs there.
 */
export type GovernedPrepositionDraft = {
	readonly preposition: string;
	readonly case: Dumrel.GovernedCase;
};

/**
 * The attested government a Reading's Valency Frame lacks: a preposition and
 * case no Preposition complement holds yet, alternatives included.
 */
export function uncoveredGovernment(
	attested: readonly GovernedPrepositionDraft[],
	knowledge: unknown,
): GovernedPrepositionDraft[] {
	const frame = isRecord(knowledge) ? knowledge.valency : undefined;
	const covered = new Set(
		(Array.isArray(frame) ? frame : []).flatMap(coveredGovernment),
	);
	return attested.filter(
		(entry) => !covered.has(`${entry.preposition}/${entry.case}`),
	);
}

/** The preposition/case keys one stored Valency slot's Preposition complements hold. */
function coveredGovernment(slot: unknown): string[] {
	if (!isRecord(slot) || !Array.isArray(slot.complements)) return [];
	return slot.complements.flatMap((complement: unknown) => {
		if (!isRecord(complement) || complement.kind !== "Preposition")
			return [];
		const preposition = isRecord(complement.preposition)
			? complement.preposition.canonicalForm
			: undefined;
		return [`${preposition}/${complement.governedCase}`];
	});
}
