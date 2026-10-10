/**
 * The members of an Attestation that realize a valency slot's marker, such
 * as a governed preposition (ADR 0034), by member index. They belong to the
 * occurrence but not to the governor's own form, so a caption leaves them
 * out when it asks whether that form is split (`um Hilfe bitten`).
 */
export function attestationValencyMembers(attestation: object): number[] {
	const evidence =
		"valencyEvidence" in attestation ? attestation.valencyEvidence : null;
	if (!Array.isArray(evidence)) return [];
	return evidence.flatMap((slot: unknown) =>
		typeof slot === "object" &&
		slot !== null &&
		"member" in slot &&
		typeof slot.member === "number"
			? [slot.member]
			: [],
	);
}
