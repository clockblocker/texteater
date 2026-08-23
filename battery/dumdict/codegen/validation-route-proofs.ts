import type { SupportedLanguage } from "dumling/types";
import type {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticRelationRetractKnowledgeChangeSchema,
	semanticRelationSetKnowledgeChangeSchema,
} from "dumrel/schema";
import type { z } from "zod";
import type {
	DumdictValidationRouteKey,
	DumdictValidationRouteOutputMap,
	InternalDumdictOwnedValidationRouteKey,
	InternalDumdictValidationRouteOutputMap,
} from "../src/parsing/validation-route-types.js";
import type {
	commitChangesResultSchema,
	DumdictSchemasFor,
} from "../src/schema.js";

export type {
	DumdictValidationRouteKey,
	DumdictValidationRouteOutputMap,
} from "../src/parsing/validation-route-types.js";

type LanguageParserSchemaKeyMap = {
	parseAsChangePrecondition: "changePreconditionSchema";
	parseAsCommitChangesRequest: "commitChangesRequestSchema";
	parseAsDumdictPlan: "dumdictPlanSchema";
	parseAsLemmaRecord: "lemmaRecordSchema";
	parseAsPendingSemanticRelationLocator: "pendingSemanticRelationLocatorSchema";
	parseAsPendingSemanticRelationRecord: "pendingSemanticRelationRecordSchema";
	parseAsPlannedChangeOp: "plannedChangeOpSchema";
	parseAsReadingEntry: "readingEntrySchema";
	parseAsReadingPatchOp: "readingPatchOpSchema";
	parseAsSurfaceEntry: "surfaceEntrySchema";
};

type LanguageValidationSchemaRegistry = {
	[Language in SupportedLanguage]: {
		[Parser in keyof LanguageParserSchemaKeyMap as `${Parser}:${Language}`]: DumdictSchemasFor<Language>[LanguageParserSchemaKeyMap[Parser]];
	};
}[SupportedLanguage];

type UnionToIntersection<Value> = (
	Value extends unknown
		? (value: Value) => void
		: never
) extends (value: infer Intersection) => void
	? Intersection
	: never;

/** Actual, unforced canonical schema type bound to every generated root. */
export type CanonicalDumdictValidationSchemaRegistry =
	UnionToIntersection<LanguageValidationSchemaRegistry> & {
		parseAsCommitChangesResult: typeof commitChangesResultSchema;
	};

type ActualDumdictValidationRouteKey =
	keyof CanonicalDumdictValidationSchemaRegistry & string;

/** Private operational guards compiled alongside, but outside, the 31-key API. */
export type InternalDumdictOperationalValidationSchemaRegistry = {
	"internal:knowledge-change": typeof knowledgeChangeSchema;
	"internal:knowledge-change:bucket:definition": (typeof knowledgeChangeSchema.options)[8];
	"internal:knowledge-change:bucket:lexical-breakdown": (typeof knowledgeChangeSchema.options)[12];
	"internal:knowledge-change:bucket:morphological-tree": (typeof knowledgeChangeSchema.options)[10];
	"internal:knowledge-change:bucket:semantic-relations": typeof semanticRelationSetKnowledgeChangeSchema;
	"internal:knowledge-change:bucket:transcription": (typeof knowledgeChangeSchema.options)[0];
	"internal:knowledge-change:bucket:translations": (typeof knowledgeChangeSchema.options)[2];
	"internal:knowledge-change:retract:definition": (typeof knowledgeChangeSchema.options)[9];
	"internal:knowledge-change:retract:lexical-breakdown": (typeof knowledgeChangeSchema.options)[13];
	"internal:knowledge-change:retract:morphological-tree": (typeof knowledgeChangeSchema.options)[11];
	"internal:knowledge-change:retract:semantic-relations": typeof semanticRelationRetractKnowledgeChangeSchema;
	"internal:knowledge-change:retract:transcription": (typeof knowledgeChangeSchema.options)[1];
	"internal:knowledge-change:retract:translations": (typeof knowledgeChangeSchema.options)[3];
	"internal:pending-semantic-relation": typeof pendingSemanticRelationSchema;
	"internal:reading:de": DumdictSchemasFor<"de">["readingEntrySchema"]["shape"]["reading"];
	"internal:reading:en": DumdictSchemasFor<"en">["readingEntrySchema"]["shape"]["reading"];
	"internal:reading:he": DumdictSchemasFor<"he">["readingEntrySchema"]["shape"]["reading"];
	"internal:reading-knowledge": typeof readingKnowledgeSchema;
	"internal:surface:de": DumdictSchemasFor<"de">["surfaceEntrySchema"]["shape"]["surface"];
	"internal:surface:en": DumdictSchemasFor<"en">["surfaceEntrySchema"]["shape"]["surface"];
	"internal:surface:he": DumdictSchemasFor<"he">["surfaceEntrySchema"]["shape"]["surface"];
};

type InternalDumdictValidationSchemaRegistry =
	InternalDumdictOperationalValidationSchemaRegistry;

type ActualInternalDumdictValidationRouteOutputMap = {
	[Key in keyof InternalDumdictOperationalValidationSchemaRegistry]: z.output<
		InternalDumdictValidationSchemaRegistry[Key]
	>;
};

export type CanonicalDumdictValidationSchemaForRoute<
	Key extends DumdictValidationRouteKey,
> = CanonicalDumdictValidationSchemaRegistry[Key &
	keyof CanonicalDumdictValidationSchemaRegistry];

export type ProveCanonicalDumdictValidationSchemaRoute<
	Key extends DumdictValidationRouteKey,
	Schema extends CanonicalDumdictValidationSchemaForRoute<Key>,
> = Equal<Schema, CanonicalDumdictValidationSchemaForRoute<Key>>;

export type DumdictValidationRouteInputMap = {
	[Key in DumdictValidationRouteKey]: z.input<
		CanonicalDumdictValidationSchemaForRoute<Key>
	>;
};

export type ActualDumdictValidationRouteOutputMap = {
	[Key in DumdictValidationRouteKey]: z.output<
		CanonicalDumdictValidationSchemaForRoute<Key>
	>;
};

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

type RouteBindingFailure = {
	[Key in DumdictValidationRouteKey]: Equal<
		ActualDumdictValidationRouteOutputMap[Key],
		DumdictValidationRouteOutputMap[Key]
	> extends true
		? never
		: Key;
}[DumdictValidationRouteKey];

type AssertNever<Value extends never> = Value;
type _ActualSchemaRoutesMatchOperationalRoutes = AssertNever<
	| Exclude<ActualDumdictValidationRouteKey, DumdictValidationRouteKey>
	| Exclude<DumdictValidationRouteKey, ActualDumdictValidationRouteKey>
>;
type _ActualSchemaOutputsMatchFrozenParsers = AssertNever<RouteBindingFailure>;

type _ActualInternalSchemaRoutesMatchOperationalRoutes = AssertNever<
	| Exclude<
			keyof InternalDumdictOperationalValidationSchemaRegistry,
			InternalDumdictOwnedValidationRouteKey
	  >
	| Exclude<
			InternalDumdictOwnedValidationRouteKey,
			keyof InternalDumdictOperationalValidationSchemaRegistry
	  >
>;

type InternalRouteBindingFailure = {
	[Key in keyof InternalDumdictOperationalValidationSchemaRegistry]: Equal<
		ActualInternalDumdictValidationRouteOutputMap[Key],
		InternalDumdictValidationRouteOutputMap[Key]
	> extends true
		? never
		: Key;
}[keyof InternalDumdictOperationalValidationSchemaRegistry];

type _ActualInternalSchemaOutputsMatchFrozenGuards =
	AssertNever<InternalRouteBindingFailure>;
