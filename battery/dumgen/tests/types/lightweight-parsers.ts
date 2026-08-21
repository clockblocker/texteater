import type { ParsingError as ParsingErrorType } from "common-utils";
import type { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import type { Attestation } from "dumling/types";
import { z } from "zod";
import type { DumgenParserInterface } from "../../../../tooling/dum-parser-interface-contract";
import { canonicalDumgenValidationSchemas } from "../../codegen/validation-artifacts";
import * as dumgen from "../../src";
import type {
	ActualDumgenValidationRouteOutputMap,
	CanonicalDumgenValidationSchemaForRoute,
	DumgenValidationRouteInputMap,
	ProveCanonicalDumgenValidationSchemaRoute,
} from "../../src/parsing/validation-route-proofs";
import type {
	DumgenValidationRouteKey,
	DumgenValidationRouteOutputMap,
} from "../../src/parsing/validation-routes";
import {
	type CanonicalGermanAttestationRouteKey,
	type CanonicalGermanAttestationSchemaRegistry,
	canonicalGermanAttestationSchemas,
	type ProveCanonicalGermanAttestationSchemaRoute,
} from "../../src/schemas/german-attestation-schema";
import type { SegmentedSentence } from "../../src/types";

const packageRootParsers = {
	ParsingError: dumgen.ParsingError,
	parseAsKnowledgeGenerationRequest: dumgen.parseAsKnowledgeGenerationRequest,
	parseAsKnowledgeGenerationInput: dumgen.parseAsKnowledgeGenerationInput,
	parseAsKnowledgeGenerationResult: dumgen.parseAsKnowledgeGenerationResult,
	parseAsSegmentedSentenceId: dumgen.parseAsSegmentedSentenceId,
	parseAsSegment: dumgen.parseAsSegment,
	parseAsSegmentedSentence: dumgen.parseAsSegmentedSentence,
	parseAsSegmentationDecision: dumgen.parseAsSegmentationDecision,
	parseAsSection1Error: dumgen.parseAsSection1Error,
	parseAsSegmentationResult: dumgen.parseAsSegmentationResult,
	parseAsGrammaticalRoute: dumgen.parseAsGrammaticalRoute,
	parseAsGrammaticalInteraction: dumgen.parseAsGrammaticalInteraction,
	parseAsGrammaticalInput: dumgen.parseAsGrammaticalInput,
	parseAsGrammaticalResult: dumgen.parseAsGrammaticalResult,
} satisfies DumgenParserInterface;
void packageRootParsers;

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Assert<Value extends true> = Value;

type ActualGermanAttestationOutput = z.output<
	CanonicalGermanAttestationSchemaRegistry[CanonicalGermanAttestationRouteKey]
>;
type _ActualLeavesCoverGermanAttestations = Assert<
	ActualGermanAttestationOutput extends Attestation<"de"> ? true : false
>;
type _GermanAttestationsAreCoveredByActualLeaves = Assert<
	Attestation<"de"> extends ActualGermanAttestationOutput ? true : false
>;

type ActualGermanNounAttestationSchema =
	(typeof canonicalGermanAttestationSchemas)["Citation/Lexeme/NOUN"];
type _ActualGermanNounLeafIsBound = Assert<
	ProveCanonicalGermanAttestationSchemaRoute<
		"Citation/Lexeme/NOUN",
		ActualGermanNounAttestationSchema
	>
>;
type ActualHebrewNounAttestationSchema = ReturnType<
	typeof schemasFor.he.entity.Attestation.Citation.Lexeme.NOUN
>;
type _SwappedAttestationLanguageMustFail = Assert<
	// @ts-expect-error A Hebrew leaf cannot back the canonical German route.
	ProveCanonicalGermanAttestationSchemaRoute<
		"Citation/Lexeme/NOUN",
		// @ts-expect-error A Hebrew leaf cannot back the canonical German route.
		ActualHebrewNounAttestationSchema
	>
>;

const narrowedGermanNounAttestationSchema = canonicalGermanAttestationSchemas[
	"Citation/Lexeme/NOUN"
].and(z.strictObject({ proofOnly: z.literal(true) }));
type _NarrowedAttestationLeafMustFail = Assert<
	// @ts-expect-error A narrowed leaf cannot replace the exact canonical route.
	ProveCanonicalGermanAttestationSchemaRoute<
		"Citation/Lexeme/NOUN",
		typeof narrowedGermanNounAttestationSchema
	>
>;

type DroppedGermanAttestationRouteKey = Exclude<
	CanonicalGermanAttestationRouteKey,
	"Citation/Lexeme/NOUN"
>;
type _DroppedAttestationLeafMustFail = Assert<
	// @ts-expect-error Dropping an actual leaf must fail exact inventory equality.
	Equal<DroppedGermanAttestationRouteKey, CanonicalGermanAttestationRouteKey>
>;

type ActualGermanSegmentedSentenceSchema =
	(typeof canonicalDumgenValidationSchemas)["parseAsSegmentedSentence:de"];
type ActualHebrewSegmentedSentenceSchema =
	(typeof canonicalDumgenValidationSchemas)["parseAsSegmentedSentence:he"];

type _ActualGermanSchemaIsBoundToItsRoute = Assert<
	ProveCanonicalDumgenValidationSchemaRoute<
		"parseAsSegmentedSentence:de",
		ActualGermanSegmentedSentenceSchema
	>
>;
type _SwappedLanguageSchemaMustFail = ProveCanonicalDumgenValidationSchemaRoute<
	"parseAsSegmentedSentence:de",
	// @ts-expect-error Hebrew payloads cannot back the German parser route.
	ActualHebrewSegmentedSentenceSchema
>;

const narrowedGermanSegmentedSentenceSchema = canonicalDumgenValidationSchemas[
	"parseAsSegmentedSentence:de"
].and(z.strictObject({ proofOnly: z.literal(true) }));
type _NarrowedActualSchemaMustFail = Assert<
	// @ts-expect-error A narrowed schema cannot replace the exact canonical route.
	ProveCanonicalDumgenValidationSchemaRoute<
		"parseAsSegmentedSentence:de",
		// @ts-expect-error A narrowed schema cannot replace the exact canonical route.
		typeof narrowedGermanSegmentedSentenceSchema
	>
>;

const narrowedGermanGrammaticalResultSchema = canonicalDumgenValidationSchemas[
	"parseAsGrammaticalResult:de"
].and(z.strictObject({ proofOnly: z.literal(true) }));
type _NarrowedGrammaticalResultSchemaMustFail = Assert<
	// @ts-expect-error The outer parser route cannot be rebound to a narrower schema.
	ProveCanonicalDumgenValidationSchemaRoute<
		"parseAsGrammaticalResult:de",
		// @ts-expect-error The outer parser route cannot be rebound to a narrower schema.
		typeof narrowedGermanGrammaticalResultSchema
	>
>;

declare const actualGermanSchema: CanonicalDumgenValidationSchemaForRoute<"parseAsSegmentedSentence:de">;
void actualGermanSchema;

type CanonicalOutputMap = {
	[Key in DumgenValidationRouteKey]: z.output<
		(typeof canonicalDumgenValidationSchemas)[Key]
	>;
};
type CanonicalInputMap = {
	[Key in DumgenValidationRouteKey]: z.input<
		(typeof canonicalDumgenValidationSchemas)[Key]
	>;
};
type FrozenOutputMismatch = {
	[Key in DumgenValidationRouteKey]: CanonicalOutputMap[Key] extends DumgenValidationRouteOutputMap[Key]
		? DumgenValidationRouteOutputMap[Key] extends CanonicalOutputMap[Key]
			? never
			: Key
		: Key;
}[DumgenValidationRouteKey];
type AssertNever<Value extends never> = Value;
type _ActualSchemasMatchIndependentFrozenOutputs =
	AssertNever<FrozenOutputMismatch>;
type _ActualSchemasMatchRouteDerivedOutputs = Assert<
	Equal<CanonicalOutputMap, ActualDumgenValidationRouteOutputMap>
>;
type _ActualSchemaInputsMatchEveryRoute = Assert<
	Equal<CanonicalInputMap, DumgenValidationRouteInputMap>
>;

const unknownInput: unknown = {};
const germanSentence = dumgen.parseAsSegmentedSentence(unknownInput, "de");
germanSentence satisfies
	| SegmentedSentence<"de">
	| ParsingErrorType<SegmentedSentence<"de">>;
// @ts-expect-error A concrete German route cannot widen to a Hebrew payload.
germanSentence satisfies
	| SegmentedSentence<"he">
	| ParsingErrorType<SegmentedSentence<"he">>;

declare const hebrewSentence: SegmentedSentence<"he">;
// @ts-expect-error Cross-language route payloads remain distinct.
const germanOnlySentence: SegmentedSentence<"de"> = hebrewSentence;
void germanOnlySentence;
