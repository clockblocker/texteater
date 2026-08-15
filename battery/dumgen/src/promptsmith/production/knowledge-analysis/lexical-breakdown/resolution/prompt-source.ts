import { definePromptSource } from "../../../../assembly";
import { lexicalResolutionCorpus } from "../../corpora";
import {
	lexicalResolutionInputSchema,
	lexicalResolutionOutputSchema,
} from "../../schemas";

const body = `Resolve a proposed Lexical Breakdown into ordered Unit Shadows.

Preserve component order and repetition exactly. Resolution must not re-segment
the source.

Produce one Lexeme Unit Shadow for every proposed component. Each shadow has
only language, canonicalForm, family, and kind. Family must be Lexeme and must
never become Phraseme. Normalize an encountered form such as mich to the
canonical Lexeme form sich when the marked context supports it.

Return no Reading identity, emoji, Core Features, role, source span, alignment,
realization, alternative-analysis, or default-selection metadata. Never
generate component Knowledge or recursively traverse the component graph.`;

export const demonstrations = lexicalResolutionCorpus.all();

export const promptSource = definePromptSource({
	route: "knowledge-analysis/lexical-breakdown/resolution",
	inputSchema: lexicalResolutionInputSchema,
	outputSchema: lexicalResolutionOutputSchema,
	body,
	goldenCorpus: lexicalResolutionCorpus,
	demonstrations,
});
