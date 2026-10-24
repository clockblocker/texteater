import type * as Dumling from "dumling/types";

/** The evidence an Attestation of its route carries, stored beside it. */
export function evidenceOf(attestation: Dumling.Attestation<"de">) {
	return {
		...("articleEvidence" in attestation
			? { articleEvidence: attestation.articleEvidence }
			: {}),
		...("expletiveEvidence" in attestation
			? { expletiveEvidence: attestation.expletiveEvidence }
			: {}),
		...("valencyEvidence" in attestation
			? { valencyEvidence: attestation.valencyEvidence }
			: {}),
	};
}
