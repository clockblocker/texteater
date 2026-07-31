import { asFullCsv } from "./attested-selection-renderers/as-full-csv";
import { asLinkedSentenceAndLemmaCsv } from "./attested-selection-renderers/as-linked-sentence-and-lemma-csv";
import { asSentenceAndLemmaKind } from "./attested-selection-renderers/as-sentence-and-lemma-kind";

export const attestedSelectionRenderers = {
	asFullCsv,
	asLinkedSentenceAndLemmaCsv,
	asSentenceAndLemmaKind,
};
