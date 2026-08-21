import type { ParsingError } from "../battery/common-utils/src/index";
import type {
	DirectSemanticRelationGraphEdge,
	KnowledgeChange,
	KnowledgeRequestMask,
	KnowledgeSettings,
	LexemeUnitShadow,
	LexicalBreakdown,
	LexicalUnitShadow,
	MorphemeReadingReference,
	MorphologicalTree,
	MorphologicalTreeNode,
	MorphologicalTreeStructure,
	PendingSemanticRelation,
	ReadingKnowledge,
	SemanticRelationGraph,
	SemanticRelationGraphReading,
	SemanticRelations,
	UnitShadow,
} from "../battery/dumrel/src/types";

type Parsed<Value> = Value | ParsingError<Value>;
type Parser<Value> = (input: unknown) => Parsed<Value>;

/** Frozen package-root parser contract for Dumrel operational validation. */
export interface DumrelParserInterface {
	readonly ParsingError: typeof import("../battery/common-utils/src/index").ParsingError;
	readonly parseAsKnowledgeSettings: Parser<KnowledgeSettings>;
	readonly parseAsKnowledgeRequestMask: Parser<KnowledgeRequestMask>;
	readonly parseAsMorphemeReadingReference: Parser<MorphemeReadingReference>;
	readonly parseAsUnitShadow: Parser<UnitShadow>;
	readonly parseAsLexicalUnitShadow: Parser<LexicalUnitShadow>;
	readonly parseAsLexemeUnitShadow: Parser<LexemeUnitShadow>;
	readonly parseAsMorphologicalTreeStructure: Parser<MorphologicalTreeStructure>;
	readonly parseAsMorphologicalTreeNode: Parser<MorphologicalTreeNode>;
	readonly parseAsMorphologicalTree: Parser<MorphologicalTree>;
	readonly parseAsLexicalBreakdown: Parser<LexicalBreakdown>;
	readonly parseAsSemanticRelations: Parser<SemanticRelations>;
	readonly parseAsDirectSemanticRelationGraphEdge: Parser<DirectSemanticRelationGraphEdge>;
	readonly parseAsSemanticRelationGraphReading: Parser<SemanticRelationGraphReading>;
	readonly parseAsSemanticRelationGraph: Parser<SemanticRelationGraph>;
	readonly parseAsPendingSemanticRelation: Parser<PendingSemanticRelation>;
	readonly parseAsReadingKnowledge: Parser<ReadingKnowledge>;
	readonly parseAsKnowledgeChange: Parser<KnowledgeChange>;
}
