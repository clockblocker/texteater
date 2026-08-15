import { definePromptSource } from "../../../assembly";
import { translationAnalysisCorpus } from "../corpora";
import {
	translationAnalysisInputSchema,
	translationAnalysisOutputSchema,
} from "../schemas";

const body = `Decide whether one existing target-language Translation already
covers the supplied encounter of one fixed source Reading, or whether one new
literal Translation should be added.

The source Reading is already fixed. Never reconsider its Lemma or emoji
description, never create a target-language Reading, and never emit a Semantic
Relation. Use markedContext to preserve distinctions that matter to a learner,
including polysemy within the fixed Reading, register, punctuation, casing, and
context-specific wording.

Return Covered with the zero-based index of one existing literal when that
literal adequately covers this encounter. Near-equivalent wording or a concise
paraphrase can cover the context; lexical novelty alone does not justify an
addition. Return Add only when no existing literal covers a useful contextual
distinction, and supply exactly one non-empty target-language literal.

Preserve literal casing and punctuation. Do not return gloss commentary,
alternatives, confidence, relation targets, Reading data, or persistence
instructions.`;

const demonstrations = translationAnalysisCorpus.all();

export const promptSource = definePromptSource({
	route: "knowledge-analysis/translation",
	inputSchema: translationAnalysisInputSchema,
	outputSchema: translationAnalysisOutputSchema,
	body,
	goldenCorpus: translationAnalysisCorpus,
	demonstrations,
});
