import type { AttestedAttestation } from "../../../../../../../src/lib/docs/document-shapes.ts";
import { describeLemma } from "../../../../../../../src/lib/unit-presentation";
import { withLinkedAttestationSpan } from "../helpers/attested-attestation";
import type { AttestedAttestationRenderer } from "../types";

export const asLinkedSentenceAndLemma: AttestedAttestationRenderer = (
	attestedAttestation: AttestedAttestation,
): string => {
	const attestation = attestedAttestation.attestation;

	return `- ${JSON.stringify(withLinkedAttestationSpan(attestedAttestation))} -> ${describeLemma(attestation.surface.lemma)}`;
};
