import type { RequestableRelation } from "../../vocabulary";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationRequest,
} from "../contracts";
import type { GermanKnowledgeFamily } from "./families";

export type GermanKnowledgeGenerationRequest = KnowledgeGenerationRequest;

export type GermanKnowledgeGenerationInput = KnowledgeGenerationInput<"de">;

/**
 * One kind-only relation target as emitted on the wire. The source's Family
 * is never proposed by the model; it is injected from the fixed Reading
 * before same-Family validation (ADR-0020).
 */
export type GermanKnowledgeRelationTarget = Readonly<{
	readonly canonicalForm: string;
	readonly kind: string;
}>;

export type GermanKnowledgeAnalysis = Readonly<{
	readonly transcription?: string | null;
	readonly definition?: string | null;
	readonly translations?: Readonly<{ readonly en?: string | null }>;
	readonly semanticRelations?: Readonly<
		Partial<
			Record<
				RequestableRelation,
				readonly GermanKnowledgeRelationTarget[] | null
			>
		>
	>;
}>;

export function isEmptyGermanKnowledgeRequest(
	request: GermanKnowledgeGenerationRequest,
): boolean {
	return Object.keys(request).length === 0;
}

export type { GermanKnowledgeFamily };
