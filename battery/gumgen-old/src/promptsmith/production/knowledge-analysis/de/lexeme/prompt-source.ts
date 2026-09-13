import {
	defineGermanKnowledgePromptSource,
	knowledgeFinalCheck,
	knowledgeOutputContract,
	knowledgeRelationPolicy,
	knowledgeRelationSemantics,
	knowledgeTaskFraming,
} from "../scaffold";
import { corpus } from "./golden-corpus/corpus";

const body = `
${knowledgeTaskFraming}
${knowledgeOutputContract}
${knowledgeRelationSemantics}
A relation target must be a Lexeme whose Kind is one of this Family's
Universal-Dependencies-style parts of speech. A Phraseme, Morpheme, or
Construction Kind leaves this Family's inventory; prefer returning null over a
cross-Family guess.
${knowledgeRelationPolicy}
${knowledgeFinalCheck}
`;

export const promptSource = defineGermanKnowledgePromptSource(
	"Lexeme",
	body,
	corpus,
);
