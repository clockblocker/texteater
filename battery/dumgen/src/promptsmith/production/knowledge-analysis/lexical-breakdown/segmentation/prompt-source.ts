import { definePromptSource } from "../../../../assembly";
import { lexicalSegmentationCorpus } from "../../corpora";
import {
	lexicalSegmentationInputSchema,
	lexicalSegmentationOutputSchema,
} from "../../schemas";

const body = `Design an ordered learner-facing Lexical Breakdown.

This route is only for Phraseme Readings and useful Lexeme/VERB analyses. Do not
return a breakdown for other owner families or kinds. It is lexical-internal
and must not change sentence Source Segmentation.

Split a Phraseme into its contextual Lexeme units. For a selected verb, retain
only fixed learner-useful lexical components. Do not include free arguments,
adjuncts, or replaceable fillers.

Return only the ordered source-text strings that the resolution phase must
classify. Repeated material appears repeatedly. Do not return roles, source
spans, alignment or realization labels, alternatives, or default selection.

Do not resolve component grammar and do not generate component Knowledge in
this phase. markedContext selects one durable breakdown.`;

export const demonstrations = lexicalSegmentationCorpus.all();

export const promptSource = definePromptSource({
	route: "knowledge-analysis/lexical-breakdown/segmentation",
	inputSchema: lexicalSegmentationInputSchema,
	outputSchema: lexicalSegmentationOutputSchema,
	body,
	goldenCorpus: lexicalSegmentationCorpus,
	demonstrations,
});
