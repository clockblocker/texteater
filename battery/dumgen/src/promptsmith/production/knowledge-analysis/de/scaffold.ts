/**
 * Shared scaffold prompt parts for the four per-Family German Knowledge
 * routes. Each Family owns its golden corpus and its thin route body; the
 * task framing, output contract, evidence policy, and final check are shared.
 */

import type { ZodType } from "zod";
import type { GermanKnowledgeFamily } from "../../../../knowledge-generation/de/families";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "../../../../knowledge-generation/de/runtime-schema";
import { definePromptSource } from "../../../assembly";
import type { GoldenCorpus } from "../../../assembly/contracts";

export function defineGermanKnowledgePromptSource(
	family: GermanKnowledgeFamily,
	body: string,
	corpus: GoldenCorpus<
		ZodType<GermanKnowledgeGenerationInput>,
		ZodType<GermanKnowledgeAnalysis>
	>,
) {
	const route = `knowledge-analysis/de/${family.toLowerCase()}`;
	if (corpus.route !== route) {
		throw new TypeError(
			`${family} Knowledge must use the ${route} Golden Corpus.`,
		);
	}
	return definePromptSource({
		route,
		inputSchema: corpus.inputSchema,
		outputSchema: corpus.outputSchema,
		body,
		goldenCorpus: corpus,
		demonstrations: corpus.collections.demonstrations,
	});
}

export const knowledgeTaskFraming = `
Generate one coherent learner-facing Knowledge update for the supplied exact
German Reading in its marked encounter context.

The Reading is fixed. Never reconsider its Lemma, Family, Kind, Core Features,
or emoji description. The marked context is evidence for this encounter only.
`;

export const knowledgeOutputContract = `
The request is a sparse tree. Return exactly the same tree shape: include every
requested leaf, omit every unrequested leaf, and put either one defensible
candidate or null at each requested leaf. Do not return empty relation arrays;
use null when no defensible target exists.

- transcription: broad standard-German IPA, normalized, with no slash or bracket delimiters;
- definition: a concise German definition of this Reading;
- translations.en: one concise contextual English literal;
- semanticRelations: an unordered array of one to five German relation
  targets, or null, for each requested relation kind.

A relation target contains only canonicalForm and kind. Its German language
and Family follow from this Reading, so every target Kind is one of this
Reading's Family's Kinds. A target never contains
Core Features, a Reading, an emoji description, an ID, or persistence
instructions. Relation targets describe the related concept, not a surface
inflection from the sentence. Use only exact Dumling Kind tokens already
demonstrated by the schema. In particular, a German adverb Lexeme has Kind ADV,
never ADVERB.
`;

export const knowledgeRelationPolicy = `
Keep all aspects semantically consistent with the fixed Reading. In particular,
do not let a familiar spelling pull the definition, Translation, or relations
toward another Reading. Preserve useful context distinctions, multi-member
targets, register, punctuation, and proper casing. Never target the fixed
Reading itself. Do not repeat a target within a relation or across relation
kinds; when a target is an exact Synonym, do not also return it as a Near
Synonym. Every Semantic Relation must hold for the fixed Reading generally,
independent of this encounter context. Near Antonym requires an established
conventional lexical contrast, such as opposite viewpoints on one event; a
sentence-specific foil, loose association, or arbitrary co-member is not a Near
Antonym. Generate Hypernym and Holonym directly when requested; Hyponym and
Meronym are inverse-only and never appear in this request or response. Return
no structured Morphological Tree or Lexical Breakdown.
`;

export const knowledgeRelationSemantics = `
Keep exact Synonym distinct from Near Synonym. Antonym is opposition; Hypernym
is broader; Hyponym is narrower; Meronym is a part/member/substance; Holonym is
the containing whole.
`;

export const knowledgeFinalCheck = `
Before returning, confirm that the response mirrors the requested tree exactly,
that every populated leaf is one defensible candidate for the fixed Reading,
and that every relation target is a same-Family, valid-Kind German Unit Shadow.
`;
