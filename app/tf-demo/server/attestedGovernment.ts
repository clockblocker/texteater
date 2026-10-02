import type * as Dumrel from "dumrel/types";

/**
 * One governed preposition an occurrence attests (ADR 0034): the
 * preposition and the case it governs there.
 */
export type GovernedPrepositionDraft = {
	readonly preposition: string;
	readonly case: Dumrel.GovernedCase;
};

type StoredComplement = {
	readonly kind?: string;
	readonly preposition?: { readonly canonicalForm?: string };
	readonly governedCase?: string;
};

/**
 * The attested government a Reading's Valency Frame lacks: a preposition and
 * case no Preposition complement holds yet, alternatives included.
 */
export function uncoveredGovernment(
	attested: readonly GovernedPrepositionDraft[],
	knowledge: unknown,
): GovernedPrepositionDraft[] {
	const frame =
		knowledge && typeof knowledge === "object"
			? Reflect.get(knowledge, "valency")
			: undefined;
	const covered = new Set(
		(Array.isArray(frame) ? frame : []).flatMap(
			(slot: { readonly complements?: readonly StoredComplement[] }) =>
				(slot.complements ?? []).flatMap((complement) =>
					complement.kind === "Preposition"
						? [
								`${complement.preposition?.canonicalForm}/${complement.governedCase}`,
							]
						: [],
				),
		),
	);
	return attested.filter(
		(entry) => !covered.has(`${entry.preposition}/${entry.case}`),
	);
}
