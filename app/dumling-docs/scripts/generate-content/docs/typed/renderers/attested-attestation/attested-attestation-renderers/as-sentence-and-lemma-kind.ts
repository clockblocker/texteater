import type { AttestedAttestation } from "../../../../../../../src/lib/docs/document-shapes.ts";
import {
	asSingleLineSentence,
	hrefForAttestedAttestation,
} from "../helpers/attested-attestation";
import type { AttestedAttestationRenderer } from "../types";

export const asSentenceAndLemmaKind: AttestedAttestationRenderer = (
	attestedAttestation: AttestedAttestation,
): string =>
	`- ${JSON.stringify(asSingleLineSentence(attestedAttestation.sentenceMarkdown))} -> [${attestedAttestation.attestation.surface.lemma.kind}](${hrefForAttestedAttestation(attestedAttestation)})`;
