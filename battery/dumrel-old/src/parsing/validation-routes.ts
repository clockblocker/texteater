import type {
	DirectSemanticRelationGraphEdge,
	GrammaticalRelationClaim,
	GrammaticalSeries,
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
} from "../types.js";

/** Frozen domain contract for the lightweight package-root parsers. */
export type DumrelValidationRouteOutputMap = {
	parseAsDirectSemanticRelationGraphEdge: DirectSemanticRelationGraphEdge;
	parseAsGrammaticalRelationClaim: GrammaticalRelationClaim;
	parseAsGrammaticalSeries: GrammaticalSeries;
	parseAsKnowledgeChange: KnowledgeChange;
	parseAsKnowledgeRequestMask: KnowledgeRequestMask;
	parseAsKnowledgeSettings: KnowledgeSettings;
	parseAsLexemeUnitShadow: LexemeUnitShadow;
	parseAsLexicalBreakdown: LexicalBreakdown;
	parseAsLexicalUnitShadow: LexicalUnitShadow;
	parseAsMorphemeReadingReference: MorphemeReadingReference;
	parseAsMorphologicalTree: MorphologicalTree;
	parseAsMorphologicalTreeNode: MorphologicalTreeNode;
	parseAsMorphologicalTreeStructure: MorphologicalTreeStructure;
	parseAsPendingSemanticRelation: PendingSemanticRelation;
	parseAsReadingKnowledge: ReadingKnowledge;
	parseAsSemanticRelationGraph: SemanticRelationGraph;
	parseAsSemanticRelationGraphReading: SemanticRelationGraphReading;
	parseAsSemanticRelations: SemanticRelations;
	parseAsUnitShadow: UnitShadow;
};

export type DumrelValidationRouteKey = keyof DumrelValidationRouteOutputMap;

export type DumrelValidationRouteOutput<Key extends DumrelValidationRouteKey> =
	DumrelValidationRouteOutputMap[Key];
