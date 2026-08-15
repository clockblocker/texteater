import { definePromptSource } from "../../../../assembly";
import { morphologicalSegmentationCorpus } from "../../corpora";
import {
	morphologicalSegmentationInputSchema,
	morphologicalSegmentationOutputSchema,
} from "../../schemas";

const body = `Design a learner-useful Morphological Tree for the supplied Reading.

This is lexical-internal analysis. It is not sentence Source Segmentation and
must not alter the supplied owner Reading or source.

Return exactly one hierarchy selected by markedContext. Structure nodes contain
only ordered children. A leaf contains only nodeKind and the sourceText needed
by the resolution phase:

- nodeKind morpheme for a true Morpheme;
- nodeKind lexicalUnit for a useful Lexeme or Phraseme chunk.

Prefer high-value chunks such as Kraftwerk in Kohlekraftwerk, or an established
Phraseme base in a derived unit, over an exhaustive pure-morpheme leaf list. Do
not recursively analyze component units and do not generate their Knowledge.

Do not return operation names, edge roles, source spans, alignment or
realization labels, alternatives, confidence, or a default-selection field.
Dumling component DTOs own the grammatical distinctions; hierarchy and order
are the entire structural output.`;

export const demonstrations = morphologicalSegmentationCorpus.select([
	"morphology-segment-compound-high-value-chunks",
	"morphology-segment-mixed-morpheme-and-lexeme",
	"morphology-segment-nested-derivation",
	"morphology-segment-reading-sensitive-tree",
]);

export const promptSource = definePromptSource({
	route: "knowledge-analysis/morphological-tree/segmentation",
	inputSchema: morphologicalSegmentationInputSchema,
	outputSchema: morphologicalSegmentationOutputSchema,
	body,
	goldenCorpus: morphologicalSegmentationCorpus,
	demonstrations,
});
