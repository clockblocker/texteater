import type { LexicalUnitShadow } from "dumrel";
import type { RequestableRelation } from "../../vocabulary";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationRequest,
} from "../contracts";

export type GermanKnowledgeGenerationRequest = KnowledgeGenerationRequest;

export type GermanKnowledgeGenerationInput = KnowledgeGenerationInput<"de">;

export type GermanKnowledgeAnalysis = Readonly<{
	readonly transcription?: string | null;
	readonly definition?: string | null;
	readonly translations?: Readonly<{ readonly en?: string | null }>;
	readonly semanticRelations?: Readonly<
		Partial<
			Record<
				RequestableRelation,
				readonly LexicalUnitShadow<"de">[] | null
			>
		>
	>;
}>;

export function isEmptyGermanKnowledgeRequest(
	request: GermanKnowledgeGenerationRequest,
): boolean {
	return Object.keys(request).length === 0;
}
