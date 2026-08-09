import { getLanguageApi } from "dumling";
import type { AttestedAttestation } from "../../../../../../../src/lib/docs/document-shapes.ts";
import { withLinkedAttestationSpan } from "../helpers/attested-attestation";
import type { AttestedAttestationRenderer } from "../types";

export const asLinkedSentenceAndLemmaCsv: AttestedAttestationRenderer = (
	attestedAttestation: AttestedAttestation,
): string => {
	const attestation = attestedAttestation.attestation;
	const languageApi = getLanguageApi(attestation.surface.lemma.language);
	const lemmaCsvId = String(
		languageApi.id.encode.asCsv(attestation.surface.lemma),
	);

	return `- ${JSON.stringify(withLinkedAttestationSpan(attestedAttestation))} -> ${lemmaCsvId}`;
};
