import type { z } from "zod";
import type {
	grammaticalInputSchema,
	grammaticalInteractionSchema,
	grammaticalResultSchema,
	grammaticalRouteSchema,
	knowledgeGenerationInputSchema,
	knowledgeGenerationRequestSchema,
	knowledgeGenerationResultSchema,
	section1ErrorSchema,
	segmentationDecisionSchema,
	segmentationResultSchema,
	segmentedSentenceIdSchema,
	segmentedSentenceSchema,
	segmentSchema,
} from "../schema.js";
import type {
	DumgenValidationRouteKey,
	DumgenValidationRouteOutputMap,
} from "./validation-routes.js";

export interface CanonicalDumgenValidationSchemaRegistry {
	parseAsKnowledgeGenerationRequest: typeof knowledgeGenerationRequestSchema;
	"parseAsKnowledgeGenerationInput:de": typeof knowledgeGenerationInputSchema;
	parseAsKnowledgeGenerationResult: typeof knowledgeGenerationResultSchema;
	parseAsSegmentedSentenceId: typeof segmentedSentenceIdSchema;
	parseAsSegment: typeof segmentSchema;
	"parseAsSegmentedSentence:de": (typeof segmentedSentenceSchema.options)[0];
	"parseAsSegmentedSentence:he": (typeof segmentedSentenceSchema.options)[1];
	parseAsSegmentationDecision: typeof segmentationDecisionSchema;
	parseAsSection1Error: typeof section1ErrorSchema;
	parseAsSegmentationResult: typeof segmentationResultSchema;
	"parseAsGrammaticalRoute:de": typeof grammaticalRouteSchema;
	parseAsGrammaticalInteraction: typeof grammaticalInteractionSchema;
	"parseAsGrammaticalInput:de": typeof grammaticalInputSchema;
	"parseAsGrammaticalResult:de": typeof grammaticalResultSchema;
}

export type CanonicalDumgenValidationSchemaForRoute<
	Key extends DumgenValidationRouteKey,
> = CanonicalDumgenValidationSchemaRegistry[Key];

export type ProveCanonicalDumgenValidationSchemaRoute<
	Key extends DumgenValidationRouteKey,
	Schema extends CanonicalDumgenValidationSchemaForRoute<Key>,
> = Equal<Schema, CanonicalDumgenValidationSchemaForRoute<Key>>;

export type DumgenValidationRouteInputMap = {
	[Key in DumgenValidationRouteKey]: z.input<
		CanonicalDumgenValidationSchemaForRoute<Key>
	>;
};

export type ActualDumgenValidationRouteOutputMap = {
	[Key in DumgenValidationRouteKey]: z.output<
		CanonicalDumgenValidationSchemaForRoute<Key>
	>;
};

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

type RouteBindingFailure = {
	[Key in DumgenValidationRouteKey]: ActualDumgenValidationRouteOutputMap[Key] extends DumgenValidationRouteOutputMap[Key]
		? DumgenValidationRouteOutputMap[Key] extends ActualDumgenValidationRouteOutputMap[Key]
			? never
			: Key
		: Key;
}[DumgenValidationRouteKey];

type AssertNever<Value extends never> = Value;
type _ActualSchemaOutputsMatchFrozenDomain = AssertNever<RouteBindingFailure>;
