import type { z } from "zod";
import type {
	directSemanticRelationGraphEdgeSchema,
	knowledgeChangeSchema,
	knowledgeRequestMaskSchema,
	knowledgeSettingsSchema,
	lexemeUnitShadowSchema,
	lexicalBreakdownSchema,
	lexicalUnitShadowSchema,
	morphemeReadingReferenceSchema,
	morphologicalTreeNodeSchema,
	morphologicalTreeSchema,
	morphologicalTreeStructureSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticRelationGraphReadingSchema,
	semanticRelationGraphSchema,
	semanticRelationsSchema,
	unitShadowSchema,
} from "../schema.js";
import type {
	DumrelValidationRouteKey,
	DumrelValidationRouteOutputMap,
} from "./validation-routes.js";

export interface CanonicalDumrelValidationSchemaRegistry {
	parseAsDirectSemanticRelationGraphEdge: typeof directSemanticRelationGraphEdgeSchema;
	parseAsKnowledgeChange: typeof knowledgeChangeSchema;
	parseAsKnowledgeRequestMask: typeof knowledgeRequestMaskSchema;
	parseAsKnowledgeSettings: typeof knowledgeSettingsSchema;
	parseAsLexemeUnitShadow: typeof lexemeUnitShadowSchema;
	parseAsLexicalBreakdown: typeof lexicalBreakdownSchema;
	parseAsLexicalUnitShadow: typeof lexicalUnitShadowSchema;
	parseAsMorphemeReadingReference: typeof morphemeReadingReferenceSchema;
	parseAsMorphologicalTree: typeof morphologicalTreeSchema;
	parseAsMorphologicalTreeNode: typeof morphologicalTreeNodeSchema;
	parseAsMorphologicalTreeStructure: typeof morphologicalTreeStructureSchema;
	parseAsPendingSemanticRelation: typeof pendingSemanticRelationSchema;
	parseAsReadingKnowledge: typeof readingKnowledgeSchema;
	parseAsSemanticRelationGraph: typeof semanticRelationGraphSchema;
	parseAsSemanticRelationGraphReading: typeof semanticRelationGraphReadingSchema;
	parseAsSemanticRelations: typeof semanticRelationsSchema;
	parseAsUnitShadow: typeof unitShadowSchema;
}

export type CanonicalDumrelValidationSchemaForRoute<
	Key extends DumrelValidationRouteKey,
> = CanonicalDumrelValidationSchemaRegistry[Key];

export type ProveCanonicalDumrelValidationSchemaRoute<
	Key extends DumrelValidationRouteKey,
	Schema extends CanonicalDumrelValidationSchemaForRoute<Key>,
> = Equal<Schema, CanonicalDumrelValidationSchemaForRoute<Key>>;

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

export type DumrelValidationRouteInputMap = {
	[Key in DumrelValidationRouteKey]: z.input<
		CanonicalDumrelValidationSchemaForRoute<Key>
	>;
};
type ActualOutputMap = {
	[Key in DumrelValidationRouteKey]: z.output<
		CanonicalDumrelValidationSchemaForRoute<Key>
	>;
};
type RouteBindingFailure = {
	[Key in DumrelValidationRouteKey]: ActualOutputMap[Key] extends DumrelValidationRouteOutputMap[Key]
		? DumrelValidationRouteOutputMap[Key] extends ActualOutputMap[Key]
			? never
			: Key
		: Key;
}[DumrelValidationRouteKey];
type AssertNever<Value extends never> = Value;
type _ActualOutputsMatchOperationalRoutes = AssertNever<RouteBindingFailure>;
