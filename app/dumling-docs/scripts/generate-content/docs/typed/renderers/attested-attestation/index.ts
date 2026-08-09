import { asFullCsv } from "./attested-attestation-renderers/as-full-csv";
import { asLinkedSentenceAndLemmaCsv } from "./attested-attestation-renderers/as-linked-sentence-and-lemma-csv";
import { asSentenceAndLemmaKind } from "./attested-attestation-renderers/as-sentence-and-lemma-kind";

export const attestedAttestationRenderers = {
	asFullCsv,
	asLinkedSentenceAndLemmaCsv,
	asSentenceAndLemmaKind,
};
