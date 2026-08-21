import type { ParsingError as ParsingErrorType } from "common-utils";
import { z } from "zod";
import type { DumrelParserInterface } from "../../../../tooling/dumrel-parser-interface";
import { canonicalDumrelValidationSchemas } from "../../codegen/validation-artifacts";
import * as dumrel from "../../src";
import type {
	CanonicalDumrelValidationSchemaForRoute,
	DumrelValidationRouteInputMap,
	ProveCanonicalDumrelValidationSchemaRoute,
} from "../../src/parsing/validation-route-proofs";
import type {
	DumrelValidationRouteKey,
	DumrelValidationRouteOutputMap,
} from "../../src/parsing/validation-routes";

const packageRootParsers = {
	ParsingError: dumrel.ParsingError,
	parseAsDirectSemanticRelationGraphEdge:
		dumrel.parseAsDirectSemanticRelationGraphEdge,
	parseAsKnowledgeChange: dumrel.parseAsKnowledgeChange,
	parseAsKnowledgeRequestMask: dumrel.parseAsKnowledgeRequestMask,
	parseAsKnowledgeSettings: dumrel.parseAsKnowledgeSettings,
	parseAsLexemeUnitShadow: dumrel.parseAsLexemeUnitShadow,
	parseAsLexicalBreakdown: dumrel.parseAsLexicalBreakdown,
	parseAsLexicalUnitShadow: dumrel.parseAsLexicalUnitShadow,
	parseAsMorphemeReadingReference: dumrel.parseAsMorphemeReadingReference,
	parseAsMorphologicalTree: dumrel.parseAsMorphologicalTree,
	parseAsMorphologicalTreeNode: dumrel.parseAsMorphologicalTreeNode,
	parseAsMorphologicalTreeStructure: dumrel.parseAsMorphologicalTreeStructure,
	parseAsPendingSemanticRelation: dumrel.parseAsPendingSemanticRelation,
	parseAsReadingKnowledge: dumrel.parseAsReadingKnowledge,
	parseAsSemanticRelationGraph: dumrel.parseAsSemanticRelationGraph,
	parseAsSemanticRelationGraphReading:
		dumrel.parseAsSemanticRelationGraphReading,
	parseAsSemanticRelations: dumrel.parseAsSemanticRelations,
	parseAsUnitShadow: dumrel.parseAsUnitShadow,
} satisfies DumrelParserInterface;

void packageRootParsers;

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Assert<Value extends true> = Value;
type AssertNever<Value extends never> = Value;

type ActualKnowledgeSettingsSchema =
	typeof canonicalDumrelValidationSchemas.parseAsKnowledgeSettings;
type ActualKnowledgeRequestMaskSchema =
	typeof canonicalDumrelValidationSchemas.parseAsKnowledgeRequestMask;

type _ActualKnowledgeSettingsSchemaIsBoundToItsRoute = Assert<
	ProveCanonicalDumrelValidationSchemaRoute<
		"parseAsKnowledgeSettings",
		ActualKnowledgeSettingsSchema
	>
>;
type _SwappedActualSchemaMustFail = ProveCanonicalDumrelValidationSchemaRoute<
	"parseAsKnowledgeSettings",
	// @ts-expect-error A request mask schema cannot back the settings route.
	ActualKnowledgeRequestMaskSchema
>;

const narrowedKnowledgeSettingsSchema =
	canonicalDumrelValidationSchemas.parseAsKnowledgeSettings.extend({
		transcription: z.literal(true),
	});
type _NarrowedActualSchemaMustFail = ProveCanonicalDumrelValidationSchemaRoute<
	"parseAsKnowledgeSettings",
	// @ts-expect-error A narrowed schema cannot replace the exact canonical route.
	typeof narrowedKnowledgeSettingsSchema
>;

declare const actualKnowledgeSettingsSchema: CanonicalDumrelValidationSchemaForRoute<"parseAsKnowledgeSettings">;
void actualKnowledgeSettingsSchema;

type CanonicalOutputMap = {
	[Key in DumrelValidationRouteKey]: import("zod").z.output<
		(typeof canonicalDumrelValidationSchemas)[Key]
	>;
};
type CanonicalInputMap = {
	[Key in DumrelValidationRouteKey]: import("zod").z.input<
		(typeof canonicalDumrelValidationSchemas)[Key]
	>;
};

type CanonicalOutputMismatch = {
	[Key in DumrelValidationRouteKey]: CanonicalOutputMap[Key] extends DumrelValidationRouteOutputMap[Key]
		? DumrelValidationRouteOutputMap[Key] extends CanonicalOutputMap[Key]
			? never
			: Key
		: Key;
}[DumrelValidationRouteKey];
type _ActualCanonicalSchemasMatchEveryFrozenParserOutput =
	AssertNever<CanonicalOutputMismatch>;
type _ActualCanonicalSchemaInputsMatchEveryFrozenRoute = Assert<
	Equal<CanonicalInputMap, DumrelValidationRouteInputMap>
>;

const unknownInput: unknown = {};
dumrel.parseAsKnowledgeSettings(unknownInput) satisfies
	| DumrelValidationRouteOutputMap["parseAsKnowledgeSettings"]
	| ParsingErrorType<
			DumrelValidationRouteOutputMap["parseAsKnowledgeSettings"]
	  >;
dumrel.parseAsKnowledgeChange(unknownInput) satisfies
	| DumrelValidationRouteOutputMap["parseAsKnowledgeChange"]
	| ParsingErrorType<
			DumrelValidationRouteOutputMap["parseAsKnowledgeChange"]
	  >;
