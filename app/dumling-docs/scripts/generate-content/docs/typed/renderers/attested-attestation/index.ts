import { asFullCsv } from "./attested-attestation-renderers/as-full-csv";
import { asLinkedSentenceAndLemma } from "./attested-attestation-renderers/as-linked-sentence-and-lemma";
import { asSentenceAndLemmaKind } from "./attested-attestation-renderers/as-sentence-and-lemma-kind";

export const attestedAttestationRenderers = {
	asFullCsv,
	asLinkedSentenceAndLemma,
	asSentenceAndLemmaKind,
};
