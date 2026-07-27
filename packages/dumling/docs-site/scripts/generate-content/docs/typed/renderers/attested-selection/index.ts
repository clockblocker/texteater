import { asFullCsv } from "./attested-selection-renderers/as-full-csv";
import { asLinkedSentenceAndLemmaCsv } from "./attested-selection-renderers/as-linked-sentence-and-lemma-csv";
import { asSentenceAndLemmaSubKind } from "./attested-selection-renderers/as-sentence-and-lemma-subkind";

export const attestedSelectionRenderers = {
	asFullCsv,
	asLinkedSentenceAndLemmaCsv,
	asSentenceAndLemmaSubKind,
};
