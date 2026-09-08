import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "../../../../knowledge-generation/de/runtime-schema";
import type { GoldenCase } from "../../../assembly";
import { corpus as lexemeCorpus } from "./lexeme/golden-corpus/corpus";
import { corpus as phrasemeCorpus } from "./phraseme/golden-corpus/corpus";
import { relationCorpusAdjudications } from "./retained-cases";

export { relationCorpusAdjudications };

/**
 * Merged view over the two relation-bearing retained corpora. The frozen
 * historical relation experiments planned their calls over the union of the
 * Lexeme and Phraseme development selections; case identities are stable.
 */
export const relationRetainedCorpora = Object.freeze({
	lexeme: lexemeCorpus,
	phraseme: phrasemeCorpus,
});

export function retainedRelationDevelopmentIds(): readonly string[] {
	return [
		...lexemeCorpus.collections.development.ids,
		...phrasemeCorpus.collections.development.ids,
	];
}

export function retainedRelationAcceptanceHas(caseId: string): boolean {
	return (
		lexemeCorpus.collections.acceptance.has(caseId) ||
		phrasemeCorpus.collections.acceptance.has(caseId)
	);
}

export function retainedRelationDevelopmentHas(caseId: string): boolean {
	return (
		lexemeCorpus.collections.development.has(caseId) ||
		phrasemeCorpus.collections.development.has(caseId)
	);
}

export function retainedRelationCase(
	caseId: string,
):
	| GoldenCase<GermanKnowledgeGenerationInput, GermanKnowledgeAnalysis>
	| undefined {
	return lexemeCorpus.cases[caseId] ?? phrasemeCorpus.cases[caseId];
}
