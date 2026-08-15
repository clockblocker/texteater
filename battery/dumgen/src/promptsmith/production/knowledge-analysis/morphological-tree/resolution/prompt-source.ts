import { definePromptSource } from "../../../../assembly";
import { morphologicalResolutionCorpus } from "../../corpora";
import {
	morphologicalResolutionInputSchema,
	morphologicalResolutionOutputSchema,
} from "../../schemas";

const body = `Resolve a proposed Morphological Tree into direct component pointers.

Preserve hierarchy and child order exactly. Resolution must not re-segment the
source or add any structural labels.

For each morpheme leaf, produce a Morpheme Reading draft: lemmaDescriptor family
must be Morpheme and emojiDescription must distinguish the contextual function.
This draft is not a resolved Reading; the caller projects it through Reading
resolution before constructing Dumrel Knowledge.

For each lexicalUnit leaf, produce a Unit Shadow with language, canonicalForm,
family, and kind. Its Family must remain Lexeme or Phraseme.

Return structure nodes with children only. Return no operation, role, source,
span, alignment, realization, alternative-analysis, or default-selection
metadata. Dumling DTOs on the pointers carry the grammatical distinctions.

Stop at this direct frontier. Never generate component Knowledge or recursively
walk the component graph.`;

const demonstrations = morphologicalResolutionCorpus.all();

export const promptSource = definePromptSource({
	route: "knowledge-analysis/morphological-tree/resolution",
	inputSchema: morphologicalResolutionInputSchema,
	outputSchema: morphologicalResolutionOutputSchema,
	body,
	goldenCorpus: morphologicalResolutionCorpus,
	demonstrations,
});
