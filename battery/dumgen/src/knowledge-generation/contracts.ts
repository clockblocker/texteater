import type { Reading } from "dumling/types";
import type {
	KnowledgeChange,
	KnowledgeRequestMask,
	PendingSemanticRelation,
	UnitShadow,
} from "dumrel";
import type { CatalogMissBase } from "../production/contracts";
import type { RequestableRelation } from "../vocabulary";

export type KnowledgeGenerationLanguage = "de";

export type KnowledgeGenerationRequest = Omit<
	KnowledgeRequestMask,
	"morphologicalTree" | "lexicalBreakdown" | "semanticRelations"
> & {
	readonly morphologicalTree?: never;
	readonly lexicalBreakdown?: never;
	readonly semanticRelations?: Readonly<
		Partial<Record<RequestableRelation, null>>
	>;
};

export type KnowledgeGenerationInput<
	L extends KnowledgeGenerationLanguage = KnowledgeGenerationLanguage,
> = Readonly<{
	readonly markedContext: string;
	readonly reading: Reading<L>;
	readonly request: KnowledgeGenerationRequest;
}>;

type DeepReadonly<Value> = Value extends
	| string
	| number
	| boolean
	| bigint
	| symbol
	| null
	| undefined
	? Value
	: Value extends (...args: never[]) => unknown
		? Value
		: Value extends readonly unknown[]
			? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
			: Value extends object
				? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
				: Value;

export type KnowledgeGenerationSuccess = DeepReadonly<{
	changes: KnowledgeChange<"en">[];
	pendingRelations: Array<
		Omit<PendingSemanticRelation, "relation" | "target"> & {
			relation: RequestableRelation;
			target: UnitShadow<"de", "Lexeme" | "Phraseme">;
		}
	>;
}>;

export type ReadingKnowledgeCatalogMiss = CatalogMissBase &
	Readonly<{
		stage: "ReadingKnowledge";
		reading: Reading<"de">;
		missingRequest: KnowledgeGenerationRequest;
	}>;

export type KnowledgeGenerationResult =
	| KnowledgeGenerationSuccess
	| ReadingKnowledgeCatalogMiss;

export type { RequestableRelation } from "../vocabulary";
