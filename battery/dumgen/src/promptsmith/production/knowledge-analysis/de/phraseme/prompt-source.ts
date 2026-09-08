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
A relation target must be a Phraseme whose Kind is one of this Family's
conventionalized-unit Kinds (Aphorism, Collocation, DiscourseFormula, Idiom,
Proverb). A Lexeme, Morpheme, or Construction Kind leaves this Family's
inventory; the complete multi-member unit owns the relation, and a free phrase
is never a target. Prefer returning null over a cross-Family guess.
${knowledgeRelationPolicy}
${knowledgeFinalCheck}
`;

export const promptSource = defineGermanKnowledgePromptSource(
	"Phraseme",
	body,
	corpus,
);
