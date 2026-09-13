import {
	defineGermanKnowledgePromptSource,
	knowledgeFinalCheck,
	knowledgeOutputContract,
	knowledgeRelationPolicy,
	knowledgeTaskFraming,
} from "../scaffold";
import { corpus } from "./golden-corpus/corpus";

const body = `
${knowledgeTaskFraming}
${knowledgeOutputContract}
This route is thin on purpose. A Morpheme Reading requests base leaves only:
transcription, definition, and translations.en. It never requests Semantic
Relations, because a bound Morpheme owns no lexical relation inventory; if a
relation leaf were ever supplied, return it as null and treat the request as
out of scope for this route.
${knowledgeRelationPolicy}
${knowledgeFinalCheck}
`;

export const promptSource = defineGermanKnowledgePromptSource(
	"Morpheme",
	body,
	corpus,
);
