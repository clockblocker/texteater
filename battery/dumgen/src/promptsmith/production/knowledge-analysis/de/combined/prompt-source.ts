import {
	germanKnowledgeAnalysisSchema,
	germanKnowledgeGenerationInputSchema,
} from "../../../../../knowledge-generation/de/schemas";
import { definePromptSource } from "../../../../assembly";
import { corpus } from "./golden-corpus/corpus";

const body = `
Generate one coherent learner-facing Knowledge update for the supplied exact
German Reading in its marked encounter context.

The Reading is fixed. Never reconsider its Lemma, Family, Kind, Core Features,
or emoji description. The marked context is evidence for this encounter only.

The request is a sparse tree. Return exactly the same tree shape: include every
requested leaf, omit every unrequested leaf, and put either one defensible
candidate or null at each requested leaf. Do not return empty relation arrays;
use null when no defensible target exists.

- transcription: broad standard-German IPA, normalized, with no slash or bracket delimiters;
- definition: a concise German definition of this Reading;
- translations.en: one concise contextual English literal;
- semanticRelations: an unordered array of one to five German lexical Unit
  Shadows, or null, for each requested relation kind.

A relation target contains only language, canonicalForm, family, and kind. It
never contains Core Features, a Reading, an emoji description, an ID, or
persistence instructions. Relation targets describe the related concept, not a
surface inflection from the sentence. Keep exact Synonym distinct from Near
Synonym. Antonym is opposition; Hypernym is broader; Hyponym is narrower;
Meronym is a part/member/substance; Holonym is the containing whole.
Use only exact Dumling Kind tokens already demonstrated by the schema. In
particular, a German adverb Lexeme has Kind ADV, never ADVERB.

Keep all aspects semantically consistent with the fixed Reading. In particular,
do not let a familiar spelling pull the definition, Translation, or relations
toward another Reading. Preserve useful context distinctions, multi-member
targets, register, punctuation, and proper casing. A relation target must be a
Lexeme or Phraseme, never a Morpheme or Construction. Never target the fixed
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

export const promptSource = definePromptSource({
	route: "knowledge-analysis/de/combined",
	inputSchema: germanKnowledgeGenerationInputSchema,
	outputSchema: germanKnowledgeAnalysisSchema,
	body,
	goldenCorpus: corpus,
	demonstrations: corpus.collections.demonstrations,
});
