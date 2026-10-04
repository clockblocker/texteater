import type * as Dumling from "dumling/types";
import {
	type ExpletiveMember,
	spellsExpletiveEs,
} from "../inventories/de/expletive-spellings.js";

/** Expletive evidence that does not spell `es`, at a path inside the checked Attestation. */
type ExpletiveSpellingIssue = {
	readonly path: string;
	readonly message: string;
};

/**
 * Where a German verbal Attestation's subject expletive evidence does not
 * spell `es`: `es` in full when Standard, or a clitic `'s`, `’s` or `s` when
 * Fused or Shorthand, a Fused one realizing an `es` component. `'n` and a
 * Standard `'s` fail. Dumling checks only that the evidence is an owned
 * member of a complete third-person singular realization (ADR 0041). A Typo
 * is not read.
 */
export function attestationExpletiveSpellingIssues(
	attestation: Dumling.Attestation<"de">,
): ExpletiveSpellingIssue[] {
	if (!("expletiveEvidence" in attestation)) return [];
	const evidence = attestation.expletiveEvidence as ExpletiveMember | null;
	if (!evidence || spellsExpletiveEs(evidence)) return [];
	return [
		{
			path: "expletiveEvidence",
			message: `${evidence.attested} (${evidence.orthography}) does not spell the subject expletive es`,
		},
	];
}
